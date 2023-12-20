import {
  Commitment,
  Connection,
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import * as coreBridge from '@certusone/wormhole-sdk/lib/cjs/solana/wormhole';
import * as tokenBridge from '@certusone/wormhole-sdk/lib/cjs/solana/tokenBridge';
import { TBTC_PROGRAM_ID } from '../consts';
import { BN, Program } from '@coral-xyz/anchor';
import { WormholeGatewayIdl } from './idls/tbtc-wormhole-gateway';
import { CarrierChainId } from '../../../../utils/consts';
import {
  CHAIN_ID_SOLANA,
  ParsedVaa,
  SignedVaa,
  createNonce,
  parseTokenTransferPayload,
  parseVaa,
} from '@certusone/wormhole-sdk';
import { tryCarrierUint8ArrayToNative } from '../../../../utils/web3Utils';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { getTBTCAddressForChain, getTBTCGatewayForChain, getWtBTCAddressForChain } from '../../../../utils/tbtc';
import { errorGettingAccountPubKey, errorGettingSplTokenPubKey } from './error';

function getCustodianPDA(gatewayProgram: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from('redeemer')], gatewayProgram)[0];
}

function getGatewayInfoPDA(targetChain: number, gatewayProgram: PublicKey): PublicKey {
  const encodedChain = Buffer.alloc(2);
  encodedChain.writeUInt16LE(targetChain);
  return PublicKey.findProgramAddressSync([Buffer.from('gateway-info'), encodedChain], gatewayProgram)[0];
}

function getTokenBridgeCoreEmitter(tokenBridgeProgram: PublicKey) {
  const [tokenBridgeCoreEmitter] = PublicKey.findProgramAddressSync([Buffer.from('emitter')], tokenBridgeProgram);

  return tokenBridgeCoreEmitter;
}

function getConfigPDA(tbtcProgram: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from('config')], tbtcProgram)[0];
}

function getMinterInfoPDA(minter: PublicKey, tbtcProgram: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from('minter-info'), minter.toBuffer()], tbtcProgram)[0];
}

function getWrappedTbtcTokenPDA(gatewayProgram: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from('wrapped-token')], gatewayProgram)[0];
}

function getCoreMessagePDA(sequence: bigint, gatewayProgram: PublicKey): PublicKey {
  const encodedSequence = Buffer.alloc(8);
  encodedSequence.writeBigUInt64LE(sequence);
  return PublicKey.findProgramAddressSync([Buffer.from('msg'), encodedSequence], gatewayProgram)[0];
}

async function getTokenBridgeSequence(
  connection: Connection,
  tokenBridgeCoreEmitter: PublicKey,
  coreBridgeProgram: PublicKey,
) {
  const tracker = await coreBridge.getSequenceTracker(connection, tokenBridgeCoreEmitter, coreBridgeProgram);

  return tracker.sequence;
}

type SendTbtcGatewayContext = {
  senderToken: PublicKey;
  sender: PublicKey;
  tokenBridgeProgram: PublicKey;
  coreBridgeProgram: PublicKey;
  gatewayProgram: PublicKey;
  tbtcMint: PublicKey;
  wrappedTbtcMint: PublicKey;

  custodian?: PublicKey;
  gatewayInfo?: PublicKey;
  tokenBridgeConfig?: PublicKey;
  tokenBridgeWrappedAsset?: PublicKey;
  tokenBridgeTransferAuthority?: PublicKey;
  coreBridgeData?: PublicKey;
  tokenBridgeCoreEmitter?: PublicKey;
  coreEmitterSequence?: PublicKey;
  coreMessage?: PublicKey;
  coreFeeCollector?: PublicKey;
  clock?: PublicKey;
  tokenBridgeSender?: PublicKey;
  wrappedTbtcToken?: PublicKey;
  rent?: PublicKey;
};

type SendTbtcGatewayArgs = {
  amount: BN;
  recipientChain: number;
  recipient: Uint8Array;
  nonce: number;
};

async function sendTbtcGatewayIx(
  connection: Connection,
  accounts: SendTbtcGatewayContext,
  args: SendTbtcGatewayArgs,
): Promise<TransactionInstruction> {
  const { recipientChain } = args;

  let {
    custodian,
    gatewayInfo,
    wrappedTbtcMint,
    tbtcMint,
    senderToken,
    sender,
    tokenBridgeProgram,
    coreBridgeProgram,
    gatewayProgram,
    tokenBridgeConfig,
    tokenBridgeWrappedAsset,
    tokenBridgeTransferAuthority,
    coreBridgeData,
    coreMessage,
    tokenBridgeCoreEmitter,
    coreEmitterSequence,
    coreFeeCollector,
    clock,
    tokenBridgeSender,
    wrappedTbtcToken,
    rent,
  } = accounts;

  const program = new Program(WormholeGatewayIdl, gatewayProgram, {
    connection: null,
  } as any);

  if (custodian === undefined) {
    custodian = getCustodianPDA(gatewayProgram);
  }

  if (gatewayInfo === undefined) {
    gatewayInfo = getGatewayInfoPDA(args.recipientChain, gatewayProgram);
  }

  if (wrappedTbtcToken === undefined) {
    wrappedTbtcToken = getWrappedTbtcTokenPDA(gatewayProgram);
  }

  if (tokenBridgeConfig === undefined) {
    tokenBridgeConfig = tokenBridge.deriveTokenBridgeConfigKey(tokenBridgeProgram);
  }

  if (tokenBridgeWrappedAsset === undefined) {
    tokenBridgeWrappedAsset = tokenBridge.deriveWrappedMetaKey(tokenBridgeProgram, wrappedTbtcMint);
  }

  if (tokenBridgeTransferAuthority === undefined) {
    tokenBridgeTransferAuthority = tokenBridge.deriveAuthoritySignerKey(tokenBridgeProgram);
  }

  if (coreBridgeData === undefined) {
    coreBridgeData = coreBridge.deriveWormholeBridgeDataKey(coreBridgeProgram);
  }

  if (tokenBridgeCoreEmitter === undefined) {
    tokenBridgeCoreEmitter = getTokenBridgeCoreEmitter(tokenBridgeProgram);
  }

  if (coreMessage === undefined) {
    const sequence = await getTokenBridgeSequence(connection, tokenBridgeCoreEmitter, coreBridgeProgram);

    coreMessage = getCoreMessagePDA(sequence, gatewayProgram);
  }

  if (coreEmitterSequence === undefined) {
    coreEmitterSequence = coreBridge.deriveEmitterSequenceKey(tokenBridgeCoreEmitter, coreBridgeProgram);
  }

  if (coreFeeCollector === undefined) {
    coreFeeCollector = coreBridge.deriveFeeCollectorKey(coreBridgeProgram);
  }

  if (clock === undefined) {
    clock = SYSVAR_CLOCK_PUBKEY;
  }

  if (tokenBridgeSender === undefined) {
    tokenBridgeSender = tokenBridge.deriveSenderAccountKey(gatewayProgram);
  }

  if (rent === undefined) {
    rent = SYSVAR_RENT_PUBKEY;
  }

  if (!getTBTCGatewayForChain(recipientChain)) {
    console.log(
      'sendTbtcWrapped',
      JSON.stringify({
        custodian,
        wrappedTbtcToken,
        wrappedTbtcMint,
        tbtcMint,
        senderToken,
        sender,
        tokenBridgeConfig,
        tokenBridgeWrappedAsset,
        tokenBridgeTransferAuthority,
        coreBridgeData,
        coreMessage,
        tokenBridgeCoreEmitter,
        coreEmitterSequence,
        coreFeeCollector,
        clock,
        rent,
        tokenBridgeProgram,
        coreBridgeProgram,
      }),
    );
    return program.methods
      .sendTbtcWrapped({ ...args, arbiterFee: new BN(0) })
      .accounts({
        custodian,
        wrappedTbtcToken,
        wrappedTbtcMint,
        tbtcMint,
        senderToken,
        sender,
        tokenBridgeConfig,
        tokenBridgeWrappedAsset,
        tokenBridgeTransferAuthority,
        coreBridgeData,
        coreMessage,
        tokenBridgeCoreEmitter,
        coreEmitterSequence,
        coreFeeCollector,
        clock,
        rent,
        tokenBridgeProgram,
        coreBridgeProgram,
      })
      .instruction();
  } else {
    console.log(
      'sendTbtc',
      JSON.stringify({
        custodian,
        gatewayInfo,
        wrappedTbtcToken,
        wrappedTbtcMint,
        tbtcMint,
        senderToken,
        sender,
        tokenBridgeConfig,
        tokenBridgeWrappedAsset,
        tokenBridgeTransferAuthority,
        coreBridgeData,
        coreMessage,
        tokenBridgeCoreEmitter,
        coreEmitterSequence,
        coreFeeCollector,
        clock,
        tokenBridgeSender,
        rent,
        tokenBridgeProgram,
        coreBridgeProgram,
      }),
    );

    return program.methods
      .sendTbtcGateway(args)
      .accounts({
        custodian,
        gatewayInfo,
        wrappedTbtcToken,
        wrappedTbtcMint,
        tbtcMint,
        senderToken,
        sender,
        tokenBridgeConfig,
        tokenBridgeWrappedAsset,
        tokenBridgeTransferAuthority,
        coreBridgeData,
        coreMessage,
        tokenBridgeCoreEmitter,
        coreEmitterSequence,
        coreFeeCollector,
        clock,
        tokenBridgeSender,
        rent,
        tokenBridgeProgram,
        coreBridgeProgram,
      })
      .instruction();
  }
}

export async function transferTbtcFromSolana(options: {
  connection: Connection;
  bridgeAddress: PublicKey;
  tokenBridgeAddress: PublicKey;
  payerAddress: PublicKey;
  fromAddress: PublicKey;
  mintAddress: PublicKey;
  wrappedTbtcMint: PublicKey;
  amount: bigint;
  targetAddress: Uint8Array | Buffer;
  targetChain: CarrierChainId;
  commitment?: Commitment;
}) {
  const {
    connection,
    bridgeAddress,
    tokenBridgeAddress,
    payerAddress,
    fromAddress,
    mintAddress,
    wrappedTbtcMint,
    amount,
    targetAddress,
    targetChain,
    commitment,
  } = options;

  const nonce = createNonce().readUInt32LE(0);
  const gatewayProgram = new PublicKey(getTBTCGatewayForChain(CHAIN_ID_SOLANA));
  const sendTbtcIx = await sendTbtcGatewayIx(
    connection,
    {
      sender: payerAddress,
      senderToken: fromAddress,
      tokenBridgeProgram: tokenBridgeAddress,
      coreBridgeProgram: bridgeAddress,
      gatewayProgram,
      tbtcMint: mintAddress,
      wrappedTbtcMint,
    },
    {
      amount: new BN(amount.toString()),
      recipientChain: targetChain,
      recipient: targetAddress,
      nonce,
    },
  );
  const transaction = new Transaction().add(sendTbtcIx);
  const { blockhash } = await connection.getLatestBlockhash(commitment);

  transaction.recentBlockhash = blockhash;
  transaction.feePayer = new PublicKey(payerAddress);

  return transaction;
}

type ReceiveTbtcContext = {
  payer: PublicKey;
  recipient: PublicKey;
  recipientToken: PublicKey;
  recipientWrappedToken: PublicKey;
  tokenBridgeProgram: PublicKey;
  coreBridgeProgram: PublicKey;
  gatewayProgram: PublicKey;
  tbtcMint: PublicKey;
  wrappedTbtcMint: PublicKey;

  custodian?: PublicKey;
  postedVaa?: PublicKey;
  tokenBridgeClaim?: PublicKey;
  tbtcConfig?: PublicKey;
  tbtcMinterInfo?: PublicKey;
  tokenBridgeConfig?: PublicKey;
  tokenBridgeRegisteredEmitter?: PublicKey;
  tokenBridgeWrappedAsset?: PublicKey;
  tokenBridgeMintAuthority?: PublicKey;
  rent?: PublicKey;
  tbtcProgram?: PublicKey;
  wrappedTbtcToken?: PublicKey;
};

export async function receiveTbtcIx(
  accounts: ReceiveTbtcContext,
  parsedVaa: ParsedVaa,
): Promise<TransactionInstruction> {
  let {
    payer,
    recipient,
    recipientToken,
    recipientWrappedToken,
    tokenBridgeProgram,
    coreBridgeProgram,
    gatewayProgram,
    tbtcMint,
    wrappedTbtcMint,

    custodian,
    postedVaa,
    tokenBridgeClaim,
    tbtcConfig,
    tbtcMinterInfo,
    tokenBridgeConfig,
    tokenBridgeRegisteredEmitter,
    tokenBridgeWrappedAsset,
    tokenBridgeMintAuthority,
    rent,
    tbtcProgram,
    wrappedTbtcToken,
  } = accounts;

  const program = new Program(WormholeGatewayIdl, new PublicKey(gatewayProgram), {
    connection: null,
  } as any);

  if (custodian === undefined) {
    custodian = getCustodianPDA(gatewayProgram);
  }

  if (postedVaa === undefined) {
    postedVaa = coreBridge.derivePostedVaaKey(coreBridgeProgram, parsedVaa.hash);
  }

  if (tokenBridgeClaim === undefined) {
    tokenBridgeClaim = coreBridge.deriveClaimKey(
      tokenBridgeProgram,
      parsedVaa.emitterAddress,
      parsedVaa.emitterChain,
      parsedVaa.sequence,
    );
  }

  if (wrappedTbtcToken === undefined) {
    wrappedTbtcToken = getWrappedTbtcTokenPDA(gatewayProgram);
  }

  if (tokenBridgeRegisteredEmitter === undefined) {
    tokenBridgeRegisteredEmitter = tokenBridge.deriveEndpointKey(
      tokenBridgeProgram,
      parsedVaa.emitterChain,
      parsedVaa.emitterAddress,
    );
  }

  if (tbtcProgram === undefined) {
    tbtcProgram = TBTC_PROGRAM_ID;
  }

  if (tbtcConfig === undefined) {
    tbtcConfig = getConfigPDA(tbtcProgram);
  }

  if (tbtcMinterInfo === undefined) {
    tbtcMinterInfo = getMinterInfoPDA(custodian, tbtcProgram);
  }

  if (tokenBridgeConfig === undefined) {
    tokenBridgeConfig = tokenBridge.deriveTokenBridgeConfigKey(tokenBridgeProgram);
  }

  if (tokenBridgeWrappedAsset === undefined) {
    tokenBridgeWrappedAsset = tokenBridge.deriveWrappedMetaKey(tokenBridgeProgram, wrappedTbtcMint);
  }

  if (tokenBridgeMintAuthority === undefined) {
    tokenBridgeMintAuthority = tokenBridge.deriveMintAuthorityKey(tokenBridgeProgram);
  }

  if (rent === undefined) {
    rent = SYSVAR_RENT_PUBKEY;
  }

  console.log(
    'receiveTbtc',
    JSON.stringify({
      payer,
      custodian,
      postedVaa,
      tokenBridgeClaim,
      wrappedTbtcToken,
      wrappedTbtcMint,
      tbtcMint,
      recipientToken,
      recipient,
      recipientWrappedToken,
      tbtcConfig,
      tbtcMinterInfo,
      tokenBridgeConfig,
      tokenBridgeRegisteredEmitter,
      tokenBridgeWrappedAsset,
      tokenBridgeMintAuthority,
      rent,
      tbtcProgram,
      tokenBridgeProgram,
      coreBridgeProgram,
    }),
  );

  return program.methods
    .receiveTbtc(parsedVaa.hash)
    .accounts({
      payer,
      custodian,
      postedVaa,
      tokenBridgeClaim,
      wrappedTbtcToken,
      wrappedTbtcMint,
      tbtcMint,
      recipientToken,
      recipient,
      recipientWrappedToken,
      tbtcConfig,
      tbtcMinterInfo,
      tokenBridgeConfig,
      tokenBridgeRegisteredEmitter,
      tokenBridgeWrappedAsset,
      tokenBridgeMintAuthority,
      rent,
      tbtcProgram,
      tokenBridgeProgram,
      coreBridgeProgram,
    })
    .instruction();
}

export async function redeemTbtcOnSolana(options: {
  connection: Connection;
  bridgeAddress: PublicKey;
  tokenBridgeAddress: PublicKey;
  payerAddress: PublicKey;
  signedVAA: SignedVaa;
  commitment?: Commitment;
}) {
  const { connection, bridgeAddress, tokenBridgeAddress, payerAddress, signedVAA, commitment } = options;

  const parsedVaa = parseVaa(signedVAA);
  const tokenTransferPayload = parseTokenTransferPayload(parsedVaa.payload);
  const recipientUnit8Array = tokenTransferPayload.tokenTransferPayload;
  const recipient = tryCarrierUint8ArrayToNative(recipientUnit8Array, tokenTransferPayload.toChain as CarrierChainId);

  if (!recipient) {
    throw errorGettingAccountPubKey;
  }

  const recipientPubkey = new PublicKey(recipient);
  const splParsedTokenAccounts = await connection.getParsedTokenAccountsByOwner(recipientPubkey, {
    programId: new PublicKey(TOKEN_PROGRAM_ID),
  });
  const solTbtcMint = getTBTCAddressForChain(CHAIN_ID_SOLANA);
  const solWrappedTbtcMint = getWtBTCAddressForChain(CHAIN_ID_SOLANA);
  const solTbtcAccount = splParsedTokenAccounts.value.find(
    (item) => item.account.data.parsed?.info?.mint?.toString() === solTbtcMint,
  );
  const solWrappedTbtcAccount = splParsedTokenAccounts.value.find(
    (item) => item.account.data.parsed?.info?.mint?.toString() === solWrappedTbtcMint,
  );

  if (!solTbtcAccount || !solWrappedTbtcAccount) {
    throw errorGettingSplTokenPubKey;
  }

  const gatewayProgram = new PublicKey(getTBTCGatewayForChain(CHAIN_ID_SOLANA));
  const redeemTbtcIx = await receiveTbtcIx(
    {
      recipient: recipientPubkey,
      recipientToken: solTbtcAccount.pubkey,
      recipientWrappedToken: solWrappedTbtcAccount.pubkey,
      payer: payerAddress,
      coreBridgeProgram: bridgeAddress,
      tokenBridgeProgram: tokenBridgeAddress,
      gatewayProgram,
      tbtcMint: new PublicKey(solTbtcMint),
      wrappedTbtcMint: new PublicKey(solWrappedTbtcMint),
    },
    parsedVaa,
  );
  const transaction = new Transaction().add(redeemTbtcIx);
  const { blockhash } = await connection.getLatestBlockhash(commitment);

  transaction.recentBlockhash = blockhash;
  transaction.feePayer = new PublicKey(payerAddress);

  return transaction;
}
