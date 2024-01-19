import {
  CHAIN_ID_SOLANA,
  attestFromSolana,
  createWrappedOnSolana,
  hexToUint8Array,
  isBytes,
  parseNFTPayload,
  parseTransferPayload,
  parseVaa,
  postVaaSolana,
  redeemAndUnwrapOnSolana,
  redeemOnSolana as redeemTokenOnSolana,
  transferNativeSol,
  tryHexToNativeString,
  updateWrappedOnSolana,
  createNonce,
  ChainId as WormholeChainId,
  CHAIN_ID_MOONBEAM,
} from '@certusone/wormhole-sdk';
import {
  createMetaOnSolana,
  isNFTVAASolanaNative,
  redeemOnSolana as redeemNFTOnSolana,
} from '@certusone/wormhole-sdk/lib/esm/nft_bridge';
import { SignTransaction, createBridgeFeeTransferInstruction } from '@certusone/wormhole-sdk/lib/esm/solana';
import {
  createTransferNativeInstruction as createTransferNativeInstructionNFT,
  createTransferWrappedInstruction as createTransferWrappedInstructionNFT,
} from '@certusone/wormhole-sdk/lib/esm/solana/nftBridge';
import { deriveWrappedMintKey as deriveWrappedMintKeyNFT } from '@certusone/wormhole-sdk/lib/esm/solana/nftBridge/accounts/wrapped';
import { arrayify } from '@ethersproject/bytes';
import { parseUnits } from '@ethersproject/units';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { Commitment, Connection, Keypair, PublicKey, PublicKeyInitData, Transaction } from '@solana/web3.js';
import {
  CarrierChainId,
  MOONBEAM_ROUTED_LIQUIDITY_PRECOMPILE,
  SOL_BRIDGE_ADDRESS,
  SOL_NFT_BRIDGE_ADDRESS,
  SOL_TOKEN_BRIDGE_ADDRESS,
  getNFTBridgeAddressForChain,
} from '../../../../utils/consts';
import { getSolanaConnection } from '../../../../utils/solana';
import { getMetadataAddress } from '../../../../utils/solanaMetadata/utils';
import {
  ApproveTokenData,
  AttestData,
  GetAllowanceData,
  RedeemData,
  RegisterData,
  SignTransactionResult,
  TransactionResult,
  TransferNFTData,
  TransferNativeData,
  TransferTBTCData,
  TransferTokenData,
} from '../../types';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { getAccount } from '@solana/spl-token';
import { ethers } from 'ethers';
import {
  createApproveAuthoritySignerInstruction,
  createTransferNativeInstruction,
  createTransferNativeWithPayloadInstruction,
  createTransferWrappedInstruction,
  createTransferWrappedWithPayloadInstruction,
  deriveAuthoritySignerKey,
} from '@certusone/wormhole-sdk/lib/esm/solana/tokenBridge';
import { tryCarrierNativeToUint8Array } from '../../../../utils/web3Utils';
import { createMRLPayload } from '../../../../utils/polkadot';
import { redeemTbtcOnSolana, transferTbtcFromSolana } from './tbtc';
import {
  errorGettingAccountPubKey,
  errorGettingConnection,
  errorGettingSignTransaction,
  errorGettingSplTokenPubKey,
  errorGettingTransactionHash,
  errorGettingTransactionInfo,
  errorNFTIdInvalid,
  errorTargetAddressOwnerNotMatch,
} from './error';
import { getTBTCAddressForChain, getTBTCGatewayForChain, getWtBTCAddressForChain } from '../../../../utils/tbtc';
import { PostedVaaData, derivePostedVaaKey } from '@certusone/wormhole-sdk/lib/cjs/solana/wormhole';
import { getAccountData } from '@certusone/wormhole-sdk/lib/cjs/solana';
import { checkSrcAndDestChain } from '../../../../utils/ethereum';

export type SignSolTransactionData = {
  connection?: Connection;
  publicKey: PublicKey | null;
  signTransaction: WalletContextState['signTransaction'];
  transaction: Transaction;
};

export async function signSolTransaction(data: SignSolTransactionData): Promise<SignTransactionResult> {
  const { connection, publicKey, transaction, signTransaction } = data;

  if (!connection) {
    throw errorGettingConnection;
  } else if (!publicKey) {
    throw errorGettingAccountPubKey;
  } else if (!signTransaction) {
    throw errorGettingSignTransaction;
  }

  transaction.feePayer = publicKey;
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  const signedTransaction = await signTransaction(transaction);

  return {
    signedTransaction: signedTransaction.serialize().toString('base64'),
  };
}

export type SendSolTransactionData = {
  publicKey: PublicKey | null;
  signTransaction: WalletContextState['signTransaction'];
  connection: Connection;
  transaction: Transaction;
};

export async function sendSolTransaction(data: SendSolTransactionData): Promise<TransactionResult> {
  const { publicKey, signTransaction, connection, transaction } = data;

  if (!connection) {
    throw errorGettingConnection;
  } else if (!publicKey) {
    throw errorGettingAccountPubKey;
  } else if (!signTransaction) {
    throw errorGettingSignTransaction;
  }

  transaction.feePayer = publicKey;
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  const signedTransaction = await signTransaction(transaction);

  if (!signedTransaction) {
    throw errorGettingTransactionHash;
  }

  const signature = await connection.sendRawTransaction(signedTransaction.serialize());

  return {
    txHash: signature,
  };
}

export type SendSolSignedTransactionData = {
  connection?: Connection;
  signedTransaction: string;
};

type SignSendAndConfirmSolTransactionOptions = {
  connection: Connection;
  transaction: Transaction;
  signTransaction: WalletContextState['signTransaction'];
};

async function signSendAndConfirm(options: SignSendAndConfirmSolTransactionOptions) {
  const { connection, transaction, signTransaction } = options;

  if (!signTransaction) {
    throw errorGettingSignTransaction;
  }

  const rawTransaction = (await signTransaction(transaction)).serialize();
  const signature = await connection.sendRawTransaction(rawTransaction);

  return { txHash: signature };
}

export type TransferSolNativeData = TransferNativeData & {
  publicKey: PublicKey | null;
  signTransaction: WalletContextState['signTransaction'];
};

export async function transferSolNative(data: TransferSolNativeData) {
  const { publicKey, amount, decimals, recipientAddress, recipientChain, signTransaction, relayerFee } = data;

  if (!publicKey) {
    throw errorGettingAccountPubKey;
  }

  checkSrcAndDestChain(CHAIN_ID_SOLANA, recipientChain);

  const connection = getSolanaConnection();
  const baseAmountParsed = parseUnits(amount, decimals);
  const feeParsed = relayerFee || ethers.BigNumber.from(0);
  const transferAmountParsed = baseAmountParsed.add(feeParsed);
  const recipientAddressUnit8Array = tryCarrierNativeToUint8Array(recipientAddress, recipientChain);

  return await signSendAndConfirmWithRetry({
    connection,
    transactionGetter: () =>
      transferNativeSol(
        connection,
        SOL_BRIDGE_ADDRESS,
        SOL_TOKEN_BRIDGE_ADDRESS,
        publicKey,
        transferAmountParsed.toBigInt(),
        recipientAddressUnit8Array,
        recipientChain as WormholeChainId,
        feeParsed.toBigInt(),
      ),
    signTransaction,
  });
}

async function transferTokenFromSolana(
  connection: Connection,
  bridgeAddress: PublicKeyInitData,
  tokenBridgeAddress: PublicKeyInitData,
  payerAddress: PublicKeyInitData,
  fromAddress: PublicKeyInitData,
  mintAddress: PublicKeyInitData,
  amount: bigint,
  targetAddress: Uint8Array | Buffer,
  targetChain: CarrierChainId,
  originAddress?: Uint8Array | Buffer,
  originChain?: CarrierChainId,
  fromOwnerAddress?: PublicKeyInitData,
  relayerFee: bigint = BigInt(0),
  payload: Uint8Array | Buffer | null = null,
  commitment?: Commitment,
) {
  if (fromOwnerAddress === undefined) {
    fromOwnerAddress = payerAddress;
  }
  const nonce = createNonce().readUInt32LE(0);
  const message = Keypair.generate();
  const isSolanaNative = originChain === undefined || originChain === CHAIN_ID_SOLANA;

  if (!isSolanaNative && !originAddress) {
    return Promise.reject('originAddress is required when specifying originChain');
  }
  const tokenBridgeTransferIx = isSolanaNative
    ? payload
      ? createTransferNativeWithPayloadInstruction(
          tokenBridgeAddress,
          bridgeAddress,
          payerAddress,
          message.publicKey,
          fromAddress,
          mintAddress,
          nonce,
          amount,
          targetAddress,
          targetChain,
          payload,
        )
      : createTransferNativeInstruction(
          tokenBridgeAddress,
          bridgeAddress,
          payerAddress,
          message.publicKey,
          fromAddress,
          mintAddress,
          nonce,
          amount,
          relayerFee,
          targetAddress,
          targetChain,
        )
    : payload
    ? createTransferWrappedWithPayloadInstruction(
        tokenBridgeAddress,
        bridgeAddress,
        payerAddress,
        message.publicKey,
        fromAddress,
        fromOwnerAddress,
        originChain!,
        originAddress!,
        nonce,
        amount,
        targetAddress,
        targetChain,
        payload,
      )
    : createTransferWrappedInstruction(
        tokenBridgeAddress,
        bridgeAddress,
        payerAddress,
        message.publicKey,
        fromAddress,
        fromOwnerAddress,
        originChain!,
        originAddress!,
        nonce,
        amount,
        relayerFee,
        targetAddress,
        targetChain,
      );

  const transaction = new Transaction().add(tokenBridgeTransferIx);
  const { blockhash } = await connection.getLatestBlockhash(commitment);
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = new PublicKey(payerAddress);
  transaction.partialSign(message);
  return transaction;
}

export type TransferSolTokenData = TransferTokenData & {
  publicKey: PublicKey | null;
  signTransaction: WalletContextState['signTransaction'];
};

export async function transferSolToken(data: TransferSolTokenData) {
  const {
    amount,
    decimals,
    originAddress,
    originChain,
    recipientAddress,
    recipientChain,
    tokenAddress,
    publicKey,
    signTransaction,
    relayerFee,
  } = data;

  if (!publicKey) {
    throw errorGettingAccountPubKey;
  }

  checkSrcAndDestChain(CHAIN_ID_SOLANA, recipientChain);

  const connection = getSolanaConnection();
  const baseAmountParsed = parseUnits(amount, decimals);
  const feeParsed = relayerFee || ethers.BigNumber.from(0);
  const transferAmountParsed = baseAmountParsed.add(feeParsed);
  const splParsedTokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
    programId: new PublicKey(TOKEN_PROGRAM_ID),
  });
  const splParsedTokenAccount = splParsedTokenAccounts.value.find(
    (item) => item.account.data.parsed?.info?.mint?.toString() === tokenAddress,
  );
  if (!splParsedTokenAccount) {
    throw errorGettingSplTokenPubKey;
  }

  const recipientAddressUnit8Array = tryCarrierNativeToUint8Array(recipientAddress, recipientChain);
  const originAddressUnit8Array = tryCarrierNativeToUint8Array(originAddress, originChain);

  return await signSendAndConfirmWithRetry({
    connection,
    transactionGetter: () =>
      transferTokenFromSolana(
        connection,
        SOL_BRIDGE_ADDRESS,
        SOL_TOKEN_BRIDGE_ADDRESS,
        publicKey.toBase58(),
        splParsedTokenAccount.pubkey.toBase58(),
        tokenAddress,
        transferAmountParsed.toBigInt(),
        recipientAddressUnit8Array,
        recipientChain,
        originAddressUnit8Array,
        originChain,
        undefined,
        feeParsed.toBigInt(),
      ),
    signTransaction,
  });
}

export type TransferSolTBTCData = TransferTBTCData & {
  publicKey: PublicKey | null;
  signTransaction: WalletContextState['signTransaction'];
};

export async function transferSolTbtc(data: TransferSolTBTCData) {
  const { amount, decimals, recipientAddress, recipientChain, tokenAddress, publicKey, signTransaction } = data;

  if (!publicKey) {
    throw errorGettingAccountPubKey;
  }

  checkSrcAndDestChain(CHAIN_ID_SOLANA, recipientChain);

  const connection = getSolanaConnection();
  const baseAmountParsed = parseUnits(amount, decimals);
  const feeParsed = ethers.BigNumber.from(0);
  const transferAmountParsed = baseAmountParsed.add(feeParsed);
  const splParsedTokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
    programId: new PublicKey(TOKEN_PROGRAM_ID),
  });
  const tbtcTokenAccount = splParsedTokenAccounts.value.find(
    (item) => item.account.data.parsed?.info?.mint?.toString() === tokenAddress,
  );
  if (!tbtcTokenAccount) {
    throw errorGettingSplTokenPubKey;
  }
  const recipientAddressUnit8Array = tryCarrierNativeToUint8Array(recipientAddress, recipientChain);

  return await signSendAndConfirmWithRetry({
    connection,
    transactionGetter: () =>
      transferTbtcFromSolana({
        connection,
        bridgeAddress: new PublicKey(SOL_BRIDGE_ADDRESS),
        tokenBridgeAddress: new PublicKey(SOL_TOKEN_BRIDGE_ADDRESS),
        payerAddress: publicKey,
        fromAddress: tbtcTokenAccount.pubkey,
        mintAddress: new PublicKey(tokenAddress),
        wrappedTbtcMint: new PublicKey(getWtBTCAddressForChain(CHAIN_ID_SOLANA)),
        amount: transferAmountParsed.toBigInt(),
        targetAddress: recipientAddressUnit8Array,
        targetChain: recipientChain,
      }),
    signTransaction,
  });
}

async function transferNFTFromSolana(
  connection: Connection,
  bridgeAddress: PublicKeyInitData,
  nftBridgeAddress: PublicKeyInitData,
  payerAddress: PublicKeyInitData,
  fromAddress: PublicKeyInitData,
  mintAddress: PublicKeyInitData,
  targetAddress: Uint8Array | Buffer,
  targetChain: CarrierChainId,
  originAddress?: Uint8Array | Buffer,
  originChain?: CarrierChainId,
  originTokenId?: Uint8Array | Buffer | number | bigint,
  commitment?: Commitment,
): Promise<Transaction> {
  const nonce = createNonce().readUInt32LE(0);
  const transferIx = await createBridgeFeeTransferInstruction(connection, bridgeAddress, payerAddress);
  let message = Keypair.generate();
  const isSolanaNative = originChain === undefined || originChain === CHAIN_ID_SOLANA;

  if (!isSolanaNative && (!originAddress || !originTokenId)) {
    return Promise.reject('originAddress and originTokenId are required when specifying originChain');
  }

  const nftBridgeTransferIx = isSolanaNative
    ? createTransferNativeInstructionNFT(
        nftBridgeAddress,
        bridgeAddress,
        payerAddress,
        message.publicKey,
        fromAddress,
        mintAddress,
        nonce,
        targetAddress,
        targetChain,
      )
    : createTransferWrappedInstructionNFT(
        nftBridgeAddress,
        bridgeAddress,
        payerAddress,
        message.publicKey,
        fromAddress,
        payerAddress,
        originChain!,
        originAddress!,
        isBytes(originTokenId) ? BigInt(ethers.BigNumber.from(originTokenId).toString()) : originTokenId!,
        nonce,
        targetAddress,
        targetChain,
      );

  const transaction = new Transaction().add(transferIx, nftBridgeTransferIx);
  const { blockhash } = await connection.getLatestBlockhash(commitment);

  transaction.recentBlockhash = blockhash;
  transaction.feePayer = new PublicKey(payerAddress);
  transaction.partialSign(message);

  return transaction;
}

export type TransferSolNFTData = TransferNFTData & {
  publicKey: PublicKey | null;
  signTransaction: WalletContextState['signTransaction'];
};

export async function transferSolNFT(data: TransferSolNFTData) {
  const {
    publicKey,
    originAddress,
    originChain,
    recipientAddress,
    recipientChain,
    tokenAddress,
    tokenId,
    signTransaction,
  } = data;

  if (!tokenId) {
    throw errorNFTIdInvalid;
  }

  if (!publicKey) {
    throw errorGettingAccountPubKey;
  }

  checkSrcAndDestChain(CHAIN_ID_SOLANA, recipientChain);

  const connection = getSolanaConnection();
  const splParsedTokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
    programId: new PublicKey(TOKEN_PROGRAM_ID),
  });
  const splParsedTokenAccount = splParsedTokenAccounts.value.find(
    (item) => item.account.data.parsed?.info?.mint?.toString() === tokenAddress,
  );
  if (!splParsedTokenAccount) {
    throw errorGettingSplTokenPubKey;
  }
  const recipientAddressUnit8Array = tryCarrierNativeToUint8Array(recipientAddress, recipientChain);
  const originAddressUnit8Array = tryCarrierNativeToUint8Array(originAddress, originChain);

  console.log('from address: ', splParsedTokenAccount.pubkey.toBase58());
  console.log('public key: ', publicKey.toString());
  console.log('token address: ', tokenAddress);
  console.log('recipient address: ', recipientAddress);
  console.log('recipient chain: ', recipientChain);
  console.log('origin address: ', originAddress && originAddress);
  console.log('origin chain: ', originChain);
  console.log('token id: ', tokenId);

  return await signSendAndConfirmWithRetry({
    connection,
    transactionGetter: () =>
      transferNFTFromSolana(
        connection,
        SOL_BRIDGE_ADDRESS,
        SOL_NFT_BRIDGE_ADDRESS,
        publicKey,
        splParsedTokenAccount.pubkey.toBase58(),
        tokenAddress,
        recipientAddressUnit8Array,
        recipientChain,
        originAddressUnit8Array,
        originChain,
        arrayify(ethers.BigNumber.from(tokenId)),
      ),
    signTransaction,
  });
}

export type RedeemSolNativeData = RedeemData & {
  publicKey: PublicKey | null;
  signTransaction: WalletContextState['signTransaction'];
};

export async function redeemSolNative(data: RedeemSolNativeData) {
  const { signedVAA, signTransaction, publicKey } = data;

  if (!signTransaction) {
    throw errorGettingSignTransaction;
  } else if (!publicKey) {
    throw errorGettingAccountPubKey;
  }

  const connection = getSolanaConnection();
  const payerAddress = publicKey.toString();
  const parsedVAA = parseVaa(signedVAA);
  const vaaPayload = parseTransferPayload(Buffer.from(new Uint8Array(parsedVAA.payload)));
  const targetAddress = tryHexToNativeString(vaaPayload.targetAddress, CHAIN_ID_SOLANA);
  const targetAddressAccountInfo = await connection.getParsedAccountInfo(new PublicKey(targetAddress));
  const targetAddressOwner =
    targetAddressAccountInfo &&
    targetAddressAccountInfo.value &&
    'parsed' in targetAddressAccountInfo.value.data &&
    targetAddressAccountInfo.value.data.parsed.info.owner;

  if (payerAddress !== targetAddressOwner) {
    throw errorTargetAddressOwnerNotMatch;
  }

  await postVaaSolana(
    connection,
    signTransaction,
    SOL_BRIDGE_ADDRESS,
    payerAddress,
    Buffer.from(signedVAA),
    undefined,
    // set asyncVerifySignatures to false to prevent phantom from popping up multiple windows
    // because phantom only allow approve one transaction at one time
    // sign multiple transactions at one time will trigger an error
    false,
  );

  return await signSendAndConfirmWithRetry({
    connection,
    transactionGetter: () =>
      redeemAndUnwrapOnSolana(connection, SOL_BRIDGE_ADDRESS, SOL_TOKEN_BRIDGE_ADDRESS, payerAddress, signedVAA),
    signTransaction,
  });
}

export type RedeemSolTokenData = RedeemData & {
  publicKey: PublicKey | null;
  signTransaction: WalletContextState['signTransaction'];
};

export async function redeemSolToken(data: RedeemSolTokenData) {
  const { signedVAA, publicKey, signTransaction } = data;

  if (!signTransaction) {
    throw errorGettingSignTransaction;
  } else if (!publicKey) {
    throw errorGettingAccountPubKey;
  }

  const connection = getSolanaConnection();
  const payerAddress = publicKey.toString();

  await postVaaSolana(
    connection,
    signTransaction,
    SOL_BRIDGE_ADDRESS,
    payerAddress,
    Buffer.from(signedVAA),
    undefined,
    // set asyncVerifySignatures to false to prevent phantom from popping up multiple windows
    // because phantom only allow approve one transaction at one time
    // sign multiple transactions at one time will trigger an error
    false,
  );

  return await signSendAndConfirmWithRetry({
    connection,
    transactionGetter: () =>
      redeemTokenOnSolana(connection, SOL_BRIDGE_ADDRESS, SOL_TOKEN_BRIDGE_ADDRESS, payerAddress, signedVAA),
    signTransaction,
  });
}

export type RedeemSolTBTCData = RedeemData & {
  publicKey: PublicKey | null;
  signTransaction: WalletContextState['signTransaction'];
};

export async function redeemSolTbtc(data: RedeemSolTBTCData) {
  const { signedVAA, publicKey, signTransaction } = data;

  if (!signTransaction) {
    throw errorGettingSignTransaction;
  } else if (!publicKey) {
    throw errorGettingAccountPubKey;
  }

  const connection = getSolanaConnection();
  const payerAddress = publicKey.toString();

  await postVaaSolana(
    connection,
    signTransaction,
    SOL_BRIDGE_ADDRESS,
    payerAddress,
    Buffer.from(signedVAA),
    undefined,
    // set asyncVerifySignatures to false to prevent phantom from popping up multiple windows
    // because phantom only allow approve one transaction at one time
    // sign multiple transactions at one time will trigger an error
    false,
  );

  return await signSendAndConfirmWithRetry({
    connection,
    transactionGetter: () =>
      redeemTbtcOnSolana({
        connection,
        bridgeAddress: new PublicKey(SOL_BRIDGE_ADDRESS),
        tokenBridgeAddress: new PublicKey(SOL_TOKEN_BRIDGE_ADDRESS),
        payerAddress: publicKey,
        signedVAA,
      }),
    signTransaction,
  });
}

export type RedeemSolNFTData = RedeemData & {
  publicKey: PublicKey | null;
  signTransaction: WalletContextState['signTransaction'];
};

export async function redeemSolNFT(data: RedeemSolNFTData) {
  const { signedVAA, publicKey, signTransaction } = data;

  console.log('redeemSolNFT1', signedVAA, publicKey, signTransaction);

  if (!signTransaction) {
    throw errorGettingSignTransaction;
  } else if (!publicKey) {
    throw errorGettingAccountPubKey;
  }

  const connection = getSolanaConnection();
  const payerAddress = publicKey.toString();

  async function getRedeemTransaction(signTransaction: SignTransaction) {
    console.log('redeemSolNFT2');
    await postVaaSolana(
      connection,
      signTransaction,
      SOL_BRIDGE_ADDRESS,
      payerAddress,
      Buffer.from(signedVAA),
      undefined,
      // set asyncVerifySignatures to false to prevent phantom from popping up multiple windows
      // because phantom only allow approve one transaction at one time
      // sign multiple transactions at one time will trigger an error
      false,
    );
    // TODO: how do we retry in between these steps
    console.log('redeemSolNFT3');
    return await redeemNFTOnSolana(connection, SOL_BRIDGE_ADDRESS, SOL_NFT_BRIDGE_ADDRESS, payerAddress, signedVAA);
    // TODO: didn't want to make an info call we didn't need, can we get the block without it by modifying the above call?
  }

  async function getRedeemTransactionWithCreatedMeta() {
    console.log('create metadata on solana');
    const parsedVAA = parseVaa(signedVAA);
    const { originChain, originAddress, tokenId } = parseNFTPayload(Buffer.from(new Uint8Array(parsedVAA.payload)));

    const nftBridgeProgramId = getNFTBridgeAddressForChain(CHAIN_ID_SOLANA);
    const mintAddress =
      originChain === CHAIN_ID_SOLANA
        ? new PublicKey(originAddress)
        : deriveWrappedMintKeyNFT(
            nftBridgeProgramId,
            originChain,
            hexToUint8Array(originAddress),
            BigInt(isBytes(tokenId) ? ethers.BigNumber.from(tokenId).toString() : tokenId.toString()),
          );

    const [metadataAddress] = getMetadataAddress(mintAddress.toString());
    const metadata = await connection.getAccountInfo(metadataAddress);

    if (!metadata) {
      return await createMetaOnSolana(connection, SOL_BRIDGE_ADDRESS, SOL_NFT_BRIDGE_ADDRESS, payerAddress, signedVAA);
    }
  }

  // required to be send and confirm before creating metadata

  let result = await signSendAndConfirmWithRetry({
    connection,
    transactionGetter: () => getRedeemTransaction(signTransaction),
    signTransaction,
  });
  console.log('solana NFT redemption transaction signSendAndConfirm', result);

  const isNative = await isNFTVAASolanaNative(signedVAA);
  if (!isNative) {
    const _transactionWithMeta = await getRedeemTransactionWithCreatedMeta();
    if (!!_transactionWithMeta) {
      // should only be send if metadata is required to be created
      // e.g. previous bridged nft would skip this inside branch
      console.log('redeemSolNFT4');
      result = await signSendAndConfirm({ connection, transaction: _transactionWithMeta, signTransaction });
    }
  }

  return result;
}

export type AttestSolData = AttestData & {
  publicKey: PublicKey | null;
  signTransaction: WalletContextState['signTransaction'];
};

export async function attestSol(data: AttestSolData) {
  const { tokenAddress, publicKey, signTransaction } = data;

  if (!signTransaction) {
    throw errorGettingSignTransaction;
  } else if (!publicKey) {
    throw errorGettingAccountPubKey;
  }

  const connection = getSolanaConnection();

  return await signSendAndConfirmWithRetry({
    connection,
    transactionGetter: () =>
      attestFromSolana(connection, SOL_BRIDGE_ADDRESS, SOL_TOKEN_BRIDGE_ADDRESS, publicKey.toString(), tokenAddress),
    signTransaction,
  });
}

export type RegisterSolData = RegisterData & {
  publicKey: PublicKey | null;
  signTransaction: WalletContextState['signTransaction'];
};

export async function registerSol(data: RegisterSolData) {
  const { signedVAA, shouldUpdate, publicKey, signTransaction } = data;

  if (!signTransaction) {
    throw errorGettingSignTransaction;
  } else if (!publicKey) {
    throw errorGettingAccountPubKey;
  }

  const connection = getSolanaConnection();
  await postVaaSolana(
    connection,
    signTransaction,
    SOL_BRIDGE_ADDRESS,
    publicKey.toString(),
    Buffer.from(signedVAA),
    undefined,
    // set asyncVerifySignatures to false to prevent phantom from popping up multiple windows
    // because phantom only allow approve one transaction at one time
    // sign multiple transactions at one time will trigger an error
    false,
  );

  return await signSendAndConfirmWithRetry({
    connection,
    transactionGetter: () =>
      shouldUpdate
        ? updateWrappedOnSolana(
            connection,
            SOL_BRIDGE_ADDRESS,
            SOL_TOKEN_BRIDGE_ADDRESS,
            publicKey.toString(),
            signedVAA,
          )
        : createWrappedOnSolana(
            connection,
            SOL_BRIDGE_ADDRESS,
            SOL_TOKEN_BRIDGE_ADDRESS,
            publicKey.toString(),
            signedVAA,
          ),
    signTransaction,
  });
}

export interface GetDelegateAmountData extends GetAllowanceData {
  publicKey: PublicKey | null;
}

export async function getDelegateAmount(data: GetDelegateAmountData) {
  const { publicKey, tokenAddress, spenderAddress } = data;

  if (!publicKey) {
    throw errorGettingAccountPubKey;
  }

  const connection = getSolanaConnection();

  const splParsedTokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
    programId: new PublicKey(TOKEN_PROGRAM_ID),
  });
  const splParsedTokenAccount = splParsedTokenAccounts.value.find(
    (item) => item.account.data.parsed?.info?.mint?.toString() === tokenAddress,
  );
  if (!splParsedTokenAccount) {
    throw errorGettingSplTokenPubKey;
  }

  const tokenAccount = await getAccount(connection, splParsedTokenAccount.pubkey, 'confirmed');
  const delegateAddress = tokenAccount.delegate?.toBase58();
  const derivedAuthoritySignerAddress = deriveAuthoritySignerKey(spenderAddress).toBase58();
  const delegateAmount = ethers.BigNumber.from(tokenAccount.delegatedAmount);
  const allowance = delegateAddress === derivedAuthoritySignerAddress ? delegateAmount : ethers.BigNumber.from(0);
  console.log('getSolNFTApproved2', tokenAccount);

  return { allowance };
}

export async function getSolNFTApproved(data: GetDelegateAmountData) {
  const allowance = await getDelegateAmount(data);

  console.log('getSolNFTApproved', allowance);

  return { approved: !allowance.allowance.eq(0) };
}

export interface ApproveSolTokenData extends ApproveTokenData {
  publicKey: PublicKey | null;
  signTransaction: WalletContextState['signTransaction'];
}

export async function approveSolToken(data: ApproveSolTokenData) {
  const { publicKey, tokenAddress, amount, spenderAddress, signTransaction } = data;

  if (!publicKey) {
    throw errorGettingAccountPubKey;
  }

  const connection = getSolanaConnection();
  const splParsedTokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
    programId: new PublicKey(TOKEN_PROGRAM_ID),
  });
  const splParsedTokenAccount = splParsedTokenAccounts.value.find(
    (item) => item.account.data.parsed?.info?.mint?.toString() === tokenAddress,
  );

  if (!splParsedTokenAccount) {
    throw errorGettingSplTokenPubKey;
  }

  const approvalIx = createApproveAuthoritySignerInstruction(
    spenderAddress,
    splParsedTokenAccount.pubkey,
    publicKey,
    amount.toBigInt(),
  );

  return await signSendAndConfirmWithRetry({
    connection,
    transactionGetter: async () => {
      const transaction = new Transaction().add(approvalIx);
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      return transaction;
    },
    signTransaction,
  });
}

export type TransferSolTokenByMRLData = TransferTokenData & {
  publicKey: PublicKey | null;
  MRLFeeParsed?: ethers.BigNumber;
  signTransaction: WalletContextState['signTransaction'];
};

export async function transferSolTokenByMRL(data: TransferSolTokenByMRLData) {
  const {
    amount,
    decimals,
    originAddress,
    originChain,
    recipientAddress,
    recipientChain,
    tokenAddress,
    publicKey,
    MRLFeeParsed,
    signTransaction,
  } = data;

  if (!publicKey) {
    throw errorGettingAccountPubKey;
  }

  checkSrcAndDestChain(CHAIN_ID_SOLANA, recipientChain);

  const connection = getSolanaConnection();
  const baseAmountParsed = parseUnits(amount, decimals);
  const amountParsed = baseAmountParsed.add(MRLFeeParsed || ethers.BigNumber.from(0));
  const splParsedTokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
    programId: new PublicKey(TOKEN_PROGRAM_ID),
  });
  const splParsedTokenAccount = splParsedTokenAccounts.value.find(
    (item) => item.account.data.parsed?.info?.mint?.toString() === tokenAddress,
  );

  if (!splParsedTokenAccount) {
    throw errorGettingSplTokenPubKey;
  }

  const originAddressUnit8Array = tryCarrierNativeToUint8Array(originAddress, originChain);
  const payload = createMRLPayload(recipientChain, recipientAddress);

  return await signSendAndConfirmWithRetry({
    connection,
    transactionGetter: () =>
      transferTokenFromSolana(
        connection,
        SOL_BRIDGE_ADDRESS,
        SOL_TOKEN_BRIDGE_ADDRESS,
        publicKey.toBase58(),
        splParsedTokenAccount.pubkey.toBase58(),
        tokenAddress,
        amountParsed.toBigInt(),
        MOONBEAM_ROUTED_LIQUIDITY_PRECOMPILE,
        CHAIN_ID_MOONBEAM,
        originAddressUnit8Array,
        originChain,
        undefined,
        undefined,
        payload,
      ),
    signTransaction,
  });
}

async function signSendAndConfirmWithRetry(options: {
  connection: Connection;
  signTransaction: WalletContextState['signTransaction'];
  transactionGetter: () => Promise<Transaction>;
  retryCount?: number;
}): Promise<{
  txHash: string;
}> {
  const { connection, signTransaction, transactionGetter, retryCount = 0 } = options;
  const transaction = await transactionGetter();

  if (!transaction) {
    throw errorGettingTransactionInfo;
  }

  console.log('signSendAndConfirmWithRetry transaction', transaction);

  try {
    const result = await signSendAndConfirm({ connection, transaction, signTransaction });

    console.log('signSendAndConfirmWithRetry result', result);

    return result;
  } catch (e) {
    if ((e as Error).message.includes('block height exceeded') && retryCount < 3) {
      return signSendAndConfirmWithRetry({
        connection,
        signTransaction,
        transactionGetter,
        retryCount: retryCount + 1,
      });
    } else {
      throw e;
    }
  }
}
