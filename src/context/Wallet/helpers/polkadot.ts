import { Signer, SignerPayloadJSON } from '@polkadot/types/types/extrinsic';
import { tryCarrierNativeToUint8Array } from '../../../utils/web3Utils';
import {
  CarrierChainId,
  MOONBEAM_BATCH_PRECOMPILE_ADDRESS,
  getTokenBridgeAddressForChain,
  MOONBEAM_PARACHAIN_ID,
  sourceChainGasLimit,
  MOONBEAM_BALANCE_PALLET,
  MOONBEAM_TRANSFER_MULTIASSETS_WEIGHTS,
  MOONBEAM_ASSET_TRANSACT_WEIGHTS,
} from '../../../utils/consts';
import { ethers } from 'ethers';
import ERC20ABI from '../../../abis/ERC20.json';
import BatchABI from '../../../abis/Batch.json';
import TokenBridgeABI from '../../../abis/WormholeTokenBridge.json';
import { CHAIN_ID_MOONBEAM, createNonce } from '@certusone/wormhole-sdk';
import { TypeRegistry } from '@polkadot/types';
import { decodeAddress, blake2AsU8a } from '@polkadot/util-crypto';
import { u8aToHex, hexToU8a } from '@polkadot/util';
import { web3Accounts } from '@polkadot/extension-dapp';
import { encodeAddress } from '@polkadot/util-crypto';
import type { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';
import type { Vec } from '@polkadot/types';
import { ApiPromise } from '@polkadot/api';
import type { EventRecord } from '@polkadot/types/interfaces';
import {
  generateMRLTransactionHash,
  getParachainAddressPrefix,
  getPolkadotProviderWithWormholeChainId,
  isPolkadotXCMV3,
  needXCMTransfer,
} from '../../../utils/polkadot';
import { PolkachainToken, PolkachainTokens, PolkachainXcGLMR, XcGLMR } from '../../../utils/tokenData/mrl';
import { getExtrinsicHashByBlockHashAndMessageHash, transferFromPolkadotByXCM } from './polkadot-xcm';
import { checkSrcAndDestChain } from '../../../utils/ethereum';

interface SignPolkadotTransactionData {
  chainId: CarrierChainId;
  signer: Signer;
  payload: SignerPayloadJSON;
}

export async function signPolkadotTransaction(options: SignPolkadotTransactionData) {
  const { chainId, signer, payload } = options;

  const signPayload = signer.signPayload;
  const api = await getPolkadotProviderWithWormholeChainId(chainId);
  const EXTRINSIC_VERSION = api.runtimeMetadata.asV12.extrinsic.version.toNumber();

  if (signPayload) {
    // after you sign the transaction and get the signature
    // you can refer to this doc to see how to send the signed transaction
    // https://gist.github.com/islishude/24c2ea503050bd3b0d17d68676ea297c#file-build_sign_polkadot_rawtx-ts-L157
    const { signature } = await signPayload(payload);
    const signedTransaction = api.registry
      .createType('Extrinsic', { method: payload.method }, { version: EXTRINSIC_VERSION })
      .addSignature(payload.address, signature, payload);

    return {
      signedTransaction: signedTransaction.toHex(),
    };
  }
}

interface SendPolkadotTransactionData {
  chainId: CarrierChainId;
  signer: Signer;
  payload: SignerPayloadJSON;
}

export async function sendPolkadotTransaction(options: SendPolkadotTransactionData) {
  const { chainId } = options;

  const result = await signPolkadotTransaction(options);

  if (result) {
    const api = await getPolkadotProviderWithWormholeChainId(chainId);
    // dry run with raw transaction
    // YOU SHOULD CONNECT NODE WITH --rpc-methods=Unsafe
    // resovle error and see here: https://wiki.polkadot.network/docs/en/maintain-errors
    const dryrun = await api.rpc.system.dryRun(result.signedTransaction);

    if (dryrun.isErr) {
      throw new Error(`failed to dryrun: ${JSON.stringify(dryrun.toHuman())}`);
    }

    // Send transaction
    const gotTxid = await api.rpc.author.submitExtrinsic(result.signedTransaction);

    return {
      txHash: gotTxid.toHex(),
    };
  }
}

export interface TransferPolkadotNativeByMRLData {
  signer: Signer;
  walletAddress: string;
  decimals: number;
  amount: string;
  randomXCMFee?: number;
  recipientChain: CarrierChainId;
  recipientAddress: string;
  chainId: CarrierChainId;
  relayerFeeParsed?: ethers.BigNumber;
}

export async function transferPolkadotNativeByMRL(data: TransferPolkadotNativeByMRLData) {
  const { chainId, recipientChain } = data;
  const token = PolkachainTokens[chainId]?.find((item) => item.isNative);
  const xcGLMR = PolkachainXcGLMR[chainId];

  return token && xcGLMR
    ? needXCMTransfer(recipientChain)
      ? transferFromPolkadotByXCM({ ...data, xcGLMR, token })
      : transferFromPolkadotByMRL({ ...data, xcGLMR, token })
    : undefined;
}

export interface TransferPolkadotTokenByMRLData {
  signer: Signer;
  tokenAddress: string;
  walletAddress: string;
  decimals: number;
  amount: string;
  recipientChain: CarrierChainId;
  recipientAddress: string;
  chainId: CarrierChainId;
  relayerFeeParsed?: ethers.BigNumber;
}

export async function transferPolkadotTokenByMRL(data: TransferPolkadotTokenByMRLData) {
  const { chainId, tokenAddress, recipientChain } = data;
  const token = PolkachainTokens[chainId]?.find((item) => item.assetId === tokenAddress);
  const xcGLMR = PolkachainXcGLMR[chainId];

  return token && xcGLMR
    ? needXCMTransfer(recipientChain)
      ? transferFromPolkadotByXCM({ ...data, xcGLMR, token })
      : transferFromPolkadotByMRL({ ...data, xcGLMR, token })
    : undefined;
}

export interface TransferPolkadotByMRLData {
  signer: Signer;
  token: PolkachainToken;
  xcGLMR: XcGLMR;
  walletAddress: string;
  decimals: number;
  amount: string;
  recipientChain: CarrierChainId;
  recipientAddress: string;
  chainId: CarrierChainId;
  relayerFeeParsed?: ethers.BigNumber;
}

// fee cost from moonbeam team:
// Moonbeam Weight to Wei Factor = 5_000_000
// Moonbase Weight to Wei Factor = 50_000

// **Weights for Asset Transfer of GLMR and ERC-20**
// WithdrawAsset: 200_000_000 + 7_242
// WithdrawAsset ERC-20: 5_000_000_000 + 50_000
// Clear Origin: 5_194_000
// Buy Execution: 281_080_000 + 19_056
// DepositAsset: 200_000_000  + 7_242

// Total Weight 5686357540

// DEV Fee = 5_686_357_540 * 50_000 = 0.000284317877 DEV
// GLMR Fee = 5_686_357_540 * 5_000_000 = 0.0284317877 GLMR

// **Weights for Asset Transact**
// DescendOrigin: 5_992_000
// WithdrawAsset: 200_000_000 + 7_242
// BuyExecution: 281_080_000 + 19_056
// SetAppendix: 5_123_000
// Transact: 49_375_000 + 1_527
// TransactBytes: 16000000000 + 62_500
// RefundSurplus: 7_975_000
// DepositAsset: 200_000_000  + 7_242

// Total Weight 17377086314

// DEV Fee = 17377086314 * 50_000 = 0.0008688543157 DEV
// GLMR Fee = 17377086314 * 5_000_000 = 0.08688543157 GLMR

export async function transferFromPolkadotByMRL(data: TransferPolkadotByMRLData) {
  const {
    signer,
    token,
    xcGLMR,
    walletAddress,
    decimals,
    recipientChain,
    amount,
    recipientAddress,
    chainId,
    relayerFeeParsed,
  } = data;
  console.log('transferFromPolkadotByMRL', {
    signer,
    token,
    xcGLMR,
    walletAddress,
    decimals,
    recipientChain,
    amount,
    recipientAddress,
    chainId,
    relayerFeeParsed: relayerFeeParsed?.toString(),
  });

  checkSrcAndDestChain(chainId, recipientChain);

  const baseAmountParsed = ethers.utils.parseUnits(amount, decimals);
  const feeParsed = relayerFeeParsed || ethers.BigNumber.from(0);
  const transferAmountParsed = baseAmountParsed.add(feeParsed);
  const transferAmountString = transferAmountParsed.toString();
  const parachainAPI = await getPolkadotProviderWithWormholeChainId(chainId);
  // need to know xcToken asset id on moonbase alpha
  const xcTokenLocationOnMoonBeam = token.location;
  const xcGLMRLocationOnMoonBeam = xcGLMR.location;
  const xcGLMRFun = MOONBEAM_TRANSFER_MULTIASSETS_WEIGHTS.add(MOONBEAM_ASSET_TRANSACT_WEIGHTS);
  const multilocationDerivativeAccountAddress = calculateMultilocationDerivativeAccount({
    address: walletAddress,
    chainId,
    isParent: true,
  });

  console.log('multilocationDerivativeAccountAddress', multilocationDerivativeAccountAddress);

  const sendTokenExtrinsic = parachainAPI.tx.xTokens.transferMultiassets(
    {
      // assets
      [isPolkadotXCMV3(chainId) ? 'V3' : 'V1']: [
        {
          // DEV as xcm fee token and moonbeam gas token
          id: {
            Concrete: isPolkadotXCMV3(chainId) ? xcGLMRLocationOnMoonBeam.V3 : xcGLMRLocationOnMoonBeam.V1,
          },
          fun: {
            // According to fee cost data above, we add up transfer assets fee and asset transact fee and send it to the multilocation derivative account
            Fungible: xcGLMRFun.toString(),
          },
        },
        {
          // token
          id: {
            Concrete: isPolkadotXCMV3(chainId) ? xcTokenLocationOnMoonBeam.V3 : xcTokenLocationOnMoonBeam.V1,
          },
          fun: {
            Fungible: transferAmountString,
          },
        },
      ],
    },
    0,
    {
      // dest
      [isPolkadotXCMV3(chainId) ? 'V3' : 'V1']: {
        parents: 1,
        interior: {
          X2: [
            { Parachain: MOONBEAM_PARACHAIN_ID },
            {
              AccountKey20: {
                network: isPolkadotXCMV3(chainId) ? null : 'Any',
                key: multilocationDerivativeAccountAddress,
              },
            },
          ],
        },
      },
    },
    'Unlimited', // weight limit
  );

  // Create & add ethereum tx to XCM message
  const ethereumTx = await batchApproveTransferTx({
    recipientChain,
    recipientAddress,
    xcTokenAddressOnMoonBeam: token.tokenAddressOnMoonbeam,
    amount: transferAmountString,
    fee: feeParsed.toString(),
  });
  const paymentInfo = await ethereumTx.paymentInfo(multilocationDerivativeAccountAddress);
  const dest = {
    [isPolkadotXCMV3(chainId) ? 'V3' : 'V1']: {
      parents: 1,
      interior: { X1: { Parachain: MOONBEAM_PARACHAIN_ID } },
    },
  };
  const withdrawAsset = {
    WithdrawAsset: [
      {
        id: { Concrete: { parents: 0, interior: { X1: { PalletInstance: MOONBEAM_BALANCE_PALLET } } } },
        // According to fee cost data above, we withdraw asset transact fee from multilocation derivative account
        fun: { Fungible: MOONBEAM_ASSET_TRANSACT_WEIGHTS.toString() },
      },
    ],
  };
  const buyExecution = {
    BuyExecution: {
      fees: {
        id: { Concrete: { parents: 0, interior: { X1: { PalletInstance: MOONBEAM_BALANCE_PALLET } } } },
        fun: { Fungible: MOONBEAM_ASSET_TRANSACT_WEIGHTS.toString() },
      },
      weightLimit: 'Unlimited',
    },
  };
  const msg = isPolkadotXCMV3(chainId)
    ? {
        V3: [
          // Withdraw DEV asset from the target account
          withdrawAsset,
          // Buy execution with the DEV asset
          buyExecution,
          {
            SetAppendix: [
              { RefundSurplus: {} },
              {
                DepositAsset: {
                  assets: {
                    Wild: { AllCounted: 1 },
                  },
                  beneficiary: {
                    parents: 0,
                    interior: {
                      X1: {
                        AccountKey20: {
                          network: null,
                          key: multilocationDerivativeAccountAddress,
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
          {
            Transact: {
              originKind: 'SovereignAccount',
              requireWeightAtMost: {
                refTime: paymentInfo.weight.refTime.unwrap(),
                proofSize: paymentInfo.weight.proofSize.unwrap(),
              },
              call: {
                encoded: ethereumTx.method.toHex(),
              },
            },
          },
        ],
      }
    : {
        V2: [
          // Withdraw DEV asset from the target account
          withdrawAsset,
          // Buy execution with the DEV asset
          buyExecution,
          {
            SetAppendix: [
              { RefundSurplus: {} },
              {
                DepositAsset: {
                  assets: {
                    Wild: 'All',
                  },
                  maxAssets: 1,
                  beneficiary: {
                    parents: 0,
                    interior: {
                      X1: {
                        AccountKey20: {
                          network: 'Any',
                          key: multilocationDerivativeAccountAddress,
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
          {
            Transact: {
              originType: 'SovereignAccount',
              requireWeightAtMost: '16000000000',
              call: {
                encoded: ethereumTx.method.toHex(),
              },
            },
          },
        ],
      };

  console.log('polkadotXcm.send', dest, msg);

  const xcmExtrinsic = parachainAPI.tx.polkadotXcm.send(dest, msg);

  // Wrap those in a batch transaction. This transaction will:
  // 1. Send xcToken + DEV together
  // 2. Use the left over DEV as the fee currency to do the wormhole route
  const batchExtrinsic = parachainAPI.tx.utility.batchAll([sendTokenExtrinsic, xcmExtrinsic]);
  console.log('===============================================');
  // console.log('Batch Extrinsic:', batchExtrinsic.method.toHex());

  const moonbeamApi = await getPolkadotProviderWithWormholeChainId(MOONBEAM_PARACHAIN_ID);
  const unsubEvents = await moonbeamApi.query.system.events((events) => {
    handleMoonbeamMessageByMRL({ parachainId: chainId, api: moonbeamApi, events, unsubscriber: unsubEvents });
  });

  // Send batch transaction
  return new Promise<{ txHash: string }>(async (resolve, reject) => {
    try {
      await batchExtrinsic.signAndSend(walletAddress, { signer: signer }, (result) => {
        console.log('batchExtrinsic.signAndSend', result);
        if (result.status.isInBlock) {
          console.log(
            'batchExtrinsic.signAndSend in block. block hash:',
            result.status.asInBlock.toHuman(),
            'extrinsic hash',
            result.txHash.toHex(),
          );

          handlePolkachainMessageByMRL({
            chainId,
            blockHash: result.status.asInBlock.toHex(),
            extrinsicHash: result.txHash.toHex(),
            events: result.events,
            resolver: resolve,
            rejecter: reject,
          });
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

const mrlMessageQueue: {
  [messageHash: string]: {
    moonbeamBlockHash?: string;
    moonbeamExtrinsicHash?: string;
    moonbeamTransactionHash?: string;
    parachainBlockHash?: string;
    parachainExtrinsicHash?: string;
    promiseResolver?: (options: { txHash: string }) => void;
    promiseRejecter?: (err: Error) => void;
  };
} = {};

async function handleMoonbeamMessageByMRL(options: {
  parachainId: CarrierChainId;
  api: ApiPromise;
  events: Vec<EventRecord>;
  unsubscriber: () => void;
}) {
  const { parachainId, api, events, unsubscriber } = options;
  const xcmpEvent = events.find((item) => item.event.section === 'xcmpQueue');
  const sameExtrinsicEvents = events.filter((item) => {
    return (
      item.phase.isApplyExtrinsic &&
      xcmpEvent?.phase.isApplyExtrinsic &&
      item.phase.asApplyExtrinsic.eq(xcmpEvent?.phase.asApplyExtrinsic)
    );
  });
  const xcmpEvents = sameExtrinsicEvents.filter((item) => item.event.section === 'xcmpQueue');
  const ethereumExecutedEvents = sameExtrinsicEvents.filter(
    (item) => item.event.section === 'ethereum' && item.event.method === 'Executed',
  );
  const tokenTransferExecutedEvent =
    ethereumExecutedEvents && ethereumExecutedEvents.length > 0 ? ethereumExecutedEvents.reverse()[0] : undefined;

  // it's not 100% guaranteed, because the batch precompile can be used to do any transactions
  // so if we need more accurate detection, we should check the transaction with an LogPublished event
  const isMRLTransfer: boolean =
    xcmpEvents.length === 2 &&
    ethereumExecutedEvents.length === 2 &&
    tokenTransferExecutedEvent != null &&
    (tokenTransferExecutedEvent.event.data as any)?.to?.toHex() === MOONBEAM_BATCH_PRECOMPILE_ADDRESS.toLowerCase();
  const messageHash = (xcmpEvent?.event.data as any)?.messageHash?.toHex();
  const blockHash = events.createdAtHash?.toHex();

  if (isMRLTransfer) {
    if (!blockHash) {
      console.error(new Error(`fail to find block hash on moonbeam.`));

      unsubscriber();
    } else if (!messageHash) {
      console.error(new Error(`empty messageHash on moonbeam, blockHash: ${blockHash}`));

      unsubscriber();
    } else {
      console.log(
        `${
          isMRLTransfer ? 'MRL Transfer' : 'MRL Redemption'
        } received on moonbeam. blockHash: ${blockHash}, messageHash: ${messageHash}`,
      );

      const { extrinsicHash: moonbeamExtrinsicHash, ethereumTransactionHash: moonbeamTransactionHash } =
        await getExtrinsicHashByBlockHashAndMessageHash({
          api,
          blockHash,
          messageHash,
          events,
        });

      console.log(
        `get extrinsic hash successfully on moonbeam. moonbeamExtrinsicHash: ${moonbeamExtrinsicHash}, moonbeamTransactionHash: ${moonbeamTransactionHash}`,
      );

      const isXcmpFailed = xcmpEvents.some((item) => item.event.method === 'Fail');
      // transfer has two xcmp events and redemption has one, and they all need to be successful
      const isSuccess = isMRLTransfer
        ? xcmpEvents.length === 2 && !isXcmpFailed && moonbeamExtrinsicHash
        : !isXcmpFailed && moonbeamExtrinsicHash;
      const xcmpMessage = mrlMessageQueue[messageHash];
      const { promiseResolver, promiseRejecter, parachainBlockHash, parachainExtrinsicHash } = xcmpMessage || {};

      // if failed, save failed result and exist.
      if (!isSuccess) {
        if (promiseRejecter) {
          promiseRejecter(
            new Error(`xcmpQueue failed on moonbeam. blockHash: ${blockHash}, messageHash: ${messageHash}`),
          );
        }

        unsubscriber();
      } else if (!moonbeamTransactionHash) {
        if (promiseRejecter) {
          promiseRejecter(
            new Error(`empty moonbeamTransactionHash. blockHash: ${blockHash}, messageHash: ${messageHash}`),
          );
        }

        unsubscriber();
      } else {
        if (parachainBlockHash && parachainExtrinsicHash) {
          const txHash = generateMRLTransactionHash({
            messageHash,
            moonbeamBlockHash: blockHash,
            moonbeamTransactionHash,
            moonbeamExtrinsicHash,
            parachainId,
            parachainExtrinsicHash,
            parachainBlockHash,
          });

          if (promiseResolver) {
            promiseResolver({ txHash });
          }

          unsubscriber();

          delete mrlMessageQueue[messageHash];
        } else {
          mrlMessageQueue[messageHash] = {
            moonbeamBlockHash: blockHash,
            moonbeamExtrinsicHash,
            moonbeamTransactionHash,
          };

          unsubscriber();

          console.log('xcmpMessageQueue saved on moonbeam', mrlMessageQueue, mrlMessageQueue[messageHash]);
        }
      }
    }
  }
}

function handlePolkachainMessageByMRL(options: {
  chainId: CarrierChainId;
  blockHash: string;
  extrinsicHash: string;
  events: EventRecord[];
  resolver: (options: { txHash: string }) => void;
  rejecter: (err: Error) => void;
}) {
  const { chainId, blockHash, extrinsicHash, events, resolver, rejecter } = options;

  const xcmpEvent = events.find((item) => {
    return item.event.section === 'xcmpQueue';
  });
  const sameExtrinsicEvents = events.filter((item) => {
    return (
      item.phase.isApplyExtrinsic &&
      xcmpEvent?.phase.isApplyExtrinsic &&
      item.phase.asApplyExtrinsic.eq(xcmpEvent?.phase.asApplyExtrinsic)
    );
  });
  const polkadotXcmSentEvent = sameExtrinsicEvents.find(
    (item) => item.event.section === 'polkadotXcm' && item.event.method === 'Sent',
  );
  const transferredMultiAssetsEvent = sameExtrinsicEvents.find(
    (item) => item.event.section === 'xTokens' && item.event.method === 'TransferredMultiAssets',
  );
  const isMRLTransfer: boolean =
    xcmpEvent != null && polkadotXcmSentEvent != null && transferredMultiAssetsEvent != null;
  const messageHash = (xcmpEvent?.event.data as any)?.messageHash?.toHex();

  console.log(`batchExtrinsic.signAndSend, isMRLTransfer: ${isMRLTransfer}, messageHash: ${messageHash}`);

  if (!messageHash) {
    rejecter(new Error(`empty messageHash. blockHash: ${blockHash}`));
  } else if (isMRLTransfer) {
    const xcmpMessage = mrlMessageQueue[messageHash];
    const { moonbeamBlockHash, moonbeamExtrinsicHash, moonbeamTransactionHash } = xcmpMessage || {};

    const xcmpEvents = sameExtrinsicEvents.filter((item) => {
      return item.event.section === 'xcmpQueue';
    });
    const isXcmpFailed = xcmpEvents.some((item) => item.event.method === 'Fail');
    // transfer has two xcmp events, and they all need to be successful
    const isSuccess = xcmpEvents.length === 2 && !isXcmpFailed;

    // if failed, reject the promise.
    if (!isSuccess) {
      rejecter(new Error(`xcmp message failed. blockHash: ${blockHash}, messageHash: ${messageHash}`));
    } else {
      if (moonbeamBlockHash && moonbeamExtrinsicHash && moonbeamTransactionHash) {
        const txHash = generateMRLTransactionHash({
          messageHash,
          moonbeamBlockHash,
          moonbeamExtrinsicHash,
          moonbeamTransactionHash,
          parachainId: chainId,
          parachainExtrinsicHash: extrinsicHash,
          parachainBlockHash: blockHash,
        });

        resolver({ txHash });

        delete mrlMessageQueue[messageHash];
      } else {
        mrlMessageQueue[messageHash] = {
          parachainBlockHash: blockHash,
          parachainExtrinsicHash: extrinsicHash,
          promiseResolver: resolver,
          promiseRejecter: rejecter,
        };
      }
    }
  }
}

// Creates an ethereumXCM extrinsic that approves WFTM + transfers tokens
async function batchApproveTransferTx(options: {
  recipientChain: CarrierChainId;
  recipientAddress: string;
  xcTokenAddressOnMoonBeam?: string;
  amount: string;
  fee: string;
}) {
  const { recipientChain, recipientAddress, xcTokenAddressOnMoonBeam, amount, fee } = options;
  const moonbeamApi = await getPolkadotProviderWithWormholeChainId(MOONBEAM_PARACHAIN_ID);

  // Get Batch, IERC20, ITokenBridge contracts
  const Batch = new ethers.utils.Interface(BatchABI);
  const xcToken = new ethers.utils.Interface(ERC20ABI);
  const TokenBridge = new ethers.utils.Interface(TokenBridgeABI);

  const moonbaseAlphaTokenBridgeAddress = getTokenBridgeAddressForChain(CHAIN_ID_MOONBEAM);

  // Create contract calls & batch them
  const approveTx = xcToken.encodeFunctionData('approve', [moonbaseAlphaTokenBridgeAddress, amount]);
  const transferTx = TokenBridge.encodeFunctionData('transferTokens', [
    xcTokenAddressOnMoonBeam,
    amount,
    recipientChain,
    tryCarrierNativeToUint8Array(recipientAddress, recipientChain),
    fee,
    createNonce().readUInt32LE(0),
  ]);

  const batchTx = Batch.encodeFunctionData('batchAll', [
    [xcTokenAddressOnMoonBeam, moonbaseAlphaTokenBridgeAddress],
    [0, 0],
    [approveTx, transferTx],
    [200000, sourceChainGasLimit.erc20Token.toString()],
  ]);

  // Create the ethereumXCM extrinsic that uses the batch precompile
  const batchXCMTx = moonbeamApi.tx.ethereumXcm.transact({
    V2: {
      gasLimit: '250000',
      feePayment: 'Auto',
      action: {
        Call: MOONBEAM_BATCH_PRECOMPILE_ADDRESS,
      },
      value: 0,
      input: batchTx, // Hex encoded input
    },
  });

  console.log('Increment Ethereum XCM Tx:', batchXCMTx);

  return batchXCMTx;
}

// reference: https://github.com/Moonsong-Labs/xcm-tools/blob/main/scripts/calculate-multilocation-derivative-account.ts
function calculateMultilocationDerivativeAccount(options: {
  address: string;
  chainId: CarrierChainId;
  isParent: boolean;
}) {
  const { address, chainId, isParent } = options;
  // Check Ethereum Address and/or Decode
  let decodedAddress;
  const ethAddress = address.length === 42;
  const accType = ethAddress ? 'AccountKey20' : 'AccountId32';

  // Decode Address if Needed
  if (!ethAddress) {
    decodedAddress = decodeAddress(address);
  } else {
    decodedAddress = hexToU8a(address);
  }

  // Describe Family
  // https://github.com/paritytech/polkadot/blob/master/xcm/xcm-builder/src/location_conversion.rs#L96-L118
  let family = 'SiblingChain';
  if (!isParent && chainId) family = 'ChildChain';
  else if (isParent && !chainId) family = 'ParentChain';

  // Calculate Hash Component
  const registry = new TypeRegistry();
  let toHash = new Uint8Array([
    ...new TextEncoder().encode(family),
    ...(chainId ? registry.createType('Compact<u32>', chainId).toU8a() : []),
    ...registry.createType('Compact<u32>', accType.length + (ethAddress ? 20 : 32)).toU8a(),
    ...new TextEncoder().encode(accType),
    ...decodedAddress,
  ]);

  console.log(`Remote Origin calculated as ${family}`);

  const MLDAccountAddress = u8aToHex(blake2AsU8a(toHash).slice(0, 20));

  console.log(`${accType}: ${address}, ${MLDAccountAddress}`);

  return MLDAccountAddress;
}

export function encodeAccount(options: { accounts: InjectedAccountWithMeta[]; prefix: number }) {
  const { accounts, prefix } = options;
  const accountAddresses = accounts
    .map((item) => {
      try {
        return encodeAddress(item.address, prefix);
      } catch (e) {
        console.error(e);
      }
    })
    .filter((item) => item != null) as string[];

  return accountAddresses;
}

export async function getAccounts(options: { chainId: CarrierChainId; walletName: string; withGenesisHash?: boolean }) {
  const { chainId, walletName, withGenesisHash } = options;

  const parachainAPI = await getPolkadotProviderWithWormholeChainId(chainId);
  const addressPrefix = await getParachainAddressPrefix(parachainAPI);
  const genesisHash = withGenesisHash ? parachainAPI.genesisHash.toHex() : undefined;
  const accounts = await web3Accounts({ extensions: [walletName], ss58Format: addressPrefix, genesisHash });

  console.log('getAccounts', { extensions: [walletName], ss58Format: addressPrefix, genesisHash }, accounts);

  const encodedAccounts =
    accounts && accounts.length && addressPrefix ? encodeAccount({ accounts, prefix: addressPrefix }) : [];

  return {
    accounts: encodedAccounts,
    addressPrefix,
    genesisHash,
  };
}
