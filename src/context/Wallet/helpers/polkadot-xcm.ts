import { Signer } from '@polkadot/types/types/extrinsic';
import { CLUSTER, CarrierChainId, MOONBEAM_PARACHAIN_ID, Polkachain } from '../../../utils/consts';
import { ethers } from 'ethers';
import { CHAIN_ID_MOONBEAM } from '@certusone/wormhole-sdk';
import { decodeAddress } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import type { Vec } from '@polkadot/types';
import { ApiPromise } from '@polkadot/api';
import type { EventRecord } from '@polkadot/types/interfaces';
import {
  generateXCMTransactionHash,
  getPolkadotProviderWithWormholeChainId,
  isAccountKey20,
  isPolkadotXCMV3,
} from '../../../utils/polkadot';
import { PolkachainToken, PolkachainTokens, XcGLMR } from '../../../utils/tokenData/mrl';
import { Sdk } from '@moonbeam-network/xcm-sdk';
import { ConfigService } from '@moonbeam-network/xcm-config';
import { assetsMap, chainsMap, getChainsConfigMap } from './xcm-configs';
import { getEvmProviderWithWormholeChainId } from '../../../utils/web3Utils';

export interface TransferFromPolkadotByXCMData {
  signer: Signer;
  token: PolkachainToken;
  xcGLMR: XcGLMR;
  walletAddress: string;
  decimals: number;
  amount: string;
  randomXCMFee?: number;
  recipientChain: CarrierChainId;
  recipientAddress: string;
  chainId: CarrierChainId;
}

export async function transferFromPolkadotByXCM(data: TransferFromPolkadotByXCMData) {
  const {
    signer,
    token,
    xcGLMR,
    walletAddress,
    decimals,
    amount,
    recipientChain,
    recipientAddress,
    chainId,
    randomXCMFee,
  } = data;
  console.log('transferFromPolkadotToMoonbeamByXCM', {
    signer,
    token,
    walletAddress,
    decimals,
    amount,
    recipientAddress,
    chainId,
    randomXCMFee,
  });
  const transferAmountParsed = ethers.utils.parseUnits(amount, decimals);
  const recipientAddressHex = isAccountKey20(recipientChain)
    ? recipientAddress
    : u8aToHex(decodeAddress(recipientAddress));
  const targetToken =
    recipientChain !== CHAIN_ID_MOONBEAM
      ? PolkachainTokens[recipientChain].find(
          (item) => item.tokenAddressOnMoonbeam.toLowerCase() === token.tokenAddressOnMoonbeam.toLowerCase(),
        )
      : undefined;

  const moonbeamApi = await getPolkadotProviderWithWormholeChainId(MOONBEAM_PARACHAIN_ID);
  const moonbeamUnsubscriber = await moonbeamApi.query.system.events((events) => {
    handleMoonbeamMessageByXCM({ api: moonbeamApi, events, token, targetToken, unsubscriber: moonbeamUnsubscriber });
  });

  if (recipientChain !== CHAIN_ID_MOONBEAM) {
    if (!targetToken) {
      throw new Error("can't find token");
    }

    const targetParachainApi = await getPolkadotProviderWithWormholeChainId(recipientChain);

    const targetParachainUnsubscriber = await targetParachainApi.query.system.events((events) => {
      handleTargetParachainMessageByXCM({
        chainId: recipientChain,
        api: targetParachainApi,
        events,
        token,
        targetToken,
        recipientChain,
        recipientAddress: recipientAddressHex,
        unsubscriber: targetParachainUnsubscriber,
      });
    });
  }

  // Send batch transaction
  return new Promise<{ txHash: string }>(async (resolve, reject) => {
    try {
      const sourceParachainApi = await getPolkadotProviderWithWormholeChainId(chainId);

      const { assets } = Sdk({
        configService: new ConfigService({
          assets: assetsMap,
          chains: chainsMap,
          chainsConfig: getChainsConfigMap({
            sourceChainId: chainId as Polkachain,
            targetChainId:
              recipientChain === CHAIN_ID_MOONBEAM ? MOONBEAM_PARACHAIN_ID : (recipientChain as Polkachain),
            randomXCMFee,
          }),
        }),
      });

      console.log(
        'transferFromPolkadotToMoonbeamByXCM',
        token.symbol.toLowerCase(),
        transferAmountParsed.toBigInt(),
        walletAddress,
        recipientAddress,
        {
          assets: assetsMap,
          chains: chainsMap,
          chainsConfig: getChainsConfigMap({
            sourceChainId: chainId as Polkachain,
            targetChainId:
              recipientChain === CHAIN_ID_MOONBEAM ? MOONBEAM_PARACHAIN_ID : (recipientChain as Polkachain),
            randomXCMFee,
          }),
        },
      );

      // xcm-sdk require an evmSigner, but we don't have it when we bridge xcToken
      // so we create a random one to perform no authorization required actions
      const provider =
        recipientChain === CHAIN_ID_MOONBEAM ? getEvmProviderWithWormholeChainId(CHAIN_ID_MOONBEAM) : undefined;
      const pKey = provider ? ethers.Wallet.createRandom() : undefined;
      const evmSigner = pKey && provider ? new ethers.Wallet(pKey, provider) : undefined;
      const sourceChain =
        chainId === Polkachain.HydraDX
          ? 'hydra-dx'
          : chainId === Polkachain.Interlay
          ? 'interlay'
          : chainId === Polkachain.PeaqAgung
          ? 'peaq-agung'
          : '';
      const destChain =
        recipientChain === CHAIN_ID_MOONBEAM
          ? CLUSTER === 'mainnet'
            ? 'moonbeam'
            : 'moonbase-alpha'
          : recipientChain === Polkachain.HydraDX
          ? 'hydra-dx'
          : recipientChain === Polkachain.Interlay
          ? 'interlay'
          : recipientChain === Polkachain.PeaqAgung
          ? 'peaq-agung'
          : '';
      console.log('xcm chains', sourceChain, destChain);
      const dataViaAssetsMethod = await assets()
        .asset(token.symbol.toLowerCase())
        .source(sourceChain)
        .destination(destChain)
        .accounts(walletAddress, recipientAddress, {
          polkadotSigner: signer,
          evmSigner: recipientChain === CHAIN_ID_MOONBEAM ? evmSigner : undefined,
        });

      const hash = await dataViaAssetsMethod.transfer(transferAmountParsed.toBigInt());

      const sourceParachainUnsubscriber = await sourceParachainApi.query.system.events((events) => {
        handleSourceParachainMessageByXCM({
          chainId,
          api: sourceParachainApi,
          events,
          token,
          targetToken,
          recipientChain,
          recipientAddress: recipientAddressHex,
          resolver: resolve,
          rejecter: reject,
          unsubscriber: sourceParachainUnsubscriber,
        });
      });
    } catch (e) {
      reject(e);
    }
  });
}

const xcmMessageQueue: {
  sourceParachainId?: CarrierChainId;
  sourceParachainBlockHash?: string;
  sourceParachainExtrinsicHash?: string;
  sourceParachainMessageHash?: string;
  targetParachainId?: CarrierChainId;
  targetParachainBlockHash?: string;
  targetParachainExtrinsicHash?: string;
  targetParachainMessageHash?: string;
  promiseResolver?: (options: { txHash: string }) => void;
  promiseRejecter?: (err: Error) => void;
}[] = [];

export async function getExtrinsicHashByBlockHashAndMessageHash(options: {
  api: ApiPromise;
  blockHash: string;
  messageHash: string;
  events: Vec<EventRecord>;
}) {
  const { api, blockHash, messageHash, events } = options;

  const block = await api.rpc.chain.getBlock(blockHash);
  const extrinsicIndex = block.block.extrinsics.findIndex((item, index) => {
    const extrinsicEvents = events.filter(({ phase }) => phase.isApplyExtrinsic && phase.asApplyExtrinsic.eq(index));
    const eventIncludingMessageHash = extrinsicEvents.find(
      (item) => (item.event.data as any)?.messageHash?.toHex() === messageHash,
    );

    return eventIncludingMessageHash != null;
  });
  const extrinsic = block.block.extrinsics[extrinsicIndex];
  const extrinsicEvents = events.filter(
    ({ phase }) => phase.isApplyExtrinsic && phase.asApplyExtrinsic.eq(extrinsicIndex),
  );
  const ethereumTransactionEvents = extrinsicEvents.filter(
    (item) => item.event.section === 'ethereum' && item.event.method === 'Executed',
  );
  const ethereumTransactionEvent =
    ethereumTransactionEvents && ethereumTransactionEvents.length > 0
      ? ethereumTransactionEvents.reverse()[0]
      : undefined;
  const ethereumTransactionHash = (ethereumTransactionEvent?.event.data as any)?.transactionHash?.toHex();

  return { extrinsicHash: extrinsic?.hash.toHex(), ethereumTransactionHash };
}

async function handleMoonbeamMessageByXCM(options: {
  api: ApiPromise;
  events: Vec<EventRecord>;
  token: PolkachainToken;
  targetToken?: PolkachainToken;
  unsubscriber: () => void;
}) {
  const { api, events, token, targetToken, unsubscriber } = options;
  const xcmpEvent = events.find((item) => item.event.section === 'xcmpQueue');
  const sameExtrinsicEvents = events.filter((item) => {
    return (
      item.phase.isApplyExtrinsic &&
      xcmpEvent?.phase.isApplyExtrinsic &&
      item.phase.asApplyExtrinsic.eq(xcmpEvent?.phase.asApplyExtrinsic)
    );
  });
  const xcmpEvents = sameExtrinsicEvents.filter((item) => item.event.section === 'xcmpQueue');
  const xcmpSuccessEvent = sameExtrinsicEvents.find(
    (item) => item.event.section === 'xcmpQueue' && item.event.method === 'Success',
  );
  const xcmpSentEvent = sameExtrinsicEvents.find(
    (item) => item.event.section === 'xcmpQueue' && item.event.method === 'XcmpMessageSent',
  );
  const ethereumExecutedEvents = sameExtrinsicEvents.filter(
    (item) => item.event.section === 'ethereum' && item.event.method === 'Executed',
  );
  const tokenTransferExecutedEvent =
    ethereumExecutedEvents && ethereumExecutedEvents.length > 0 ? ethereumExecutedEvents.reverse()[0] : undefined;

  const isXCMTransfer: boolean =
    (tokenTransferExecutedEvent?.event.data as any)?.to?.toHex() === token.tokenAddressOnMoonbeam.toLowerCase();

  const messageHash = (xcmpSuccessEvent?.event.data as any)?.messageHash?.toHex();
  const targetMessageHash = (xcmpSentEvent?.event.data as any)?.messageHash?.toHex();
  const blockHash = events.createdAtHash?.toHex();
  const isTargetMoonbeam = !targetMessageHash;

  if (isXCMTransfer) {
    if (!blockHash) {
      console.error(new Error(`fail to find block hash on moonbeam.`));

      unsubscriber();
    } else if (!messageHash) {
      console.error(new Error(`empty messageHash on moonbeam, blockHash: ${blockHash}`));

      unsubscriber();
    } else {
      console.log(`XCM Transfer received on moonbeam. blockHash: ${blockHash}, messageHash: ${messageHash}`);

      const { extrinsicHash } = await getExtrinsicHashByBlockHashAndMessageHash({
        api,
        blockHash,
        messageHash,
        events,
      });

      const isXcmFailed = xcmpEvents.some((item) => item.event.method === 'Fail');
      // transfer has two xcmp events on parachain bridging, and only one when the target is moonbeam.
      const isSuccess = xcmpEvents.length >= 1 && !isXcmFailed;
      const xcmMessageIndex = xcmMessageQueue.findIndex(
        (item) =>
          item.sourceParachainMessageHash === messageHash ||
          (targetMessageHash != null ? item.targetParachainMessageHash === targetMessageHash : false),
      );
      const xcmMessage = xcmMessageQueue[xcmMessageIndex];

      const {
        promiseResolver,
        promiseRejecter,
        sourceParachainMessageHash,
        sourceParachainId,
        sourceParachainBlockHash,
        sourceParachainExtrinsicHash,
        targetParachainMessageHash,
        targetParachainId,
        targetParachainBlockHash,
        targetParachainExtrinsicHash,
      } = xcmMessage || {};

      // if failed, save failed result and exist.
      if (!isSuccess) {
        const err = new Error(`xcmpQueue failed on moonbeam. blockHash: ${blockHash}, messageHash: ${messageHash}`);

        if (promiseRejecter) {
          promiseRejecter(err);
        } else {
          console.error(err);
        }

        unsubscriber();
      } else {
        if (
          sourceParachainMessageHash &&
          sourceParachainId &&
          sourceParachainBlockHash &&
          sourceParachainExtrinsicHash
        ) {
          if (isTargetMoonbeam) {
            const txHash = generateXCMTransactionHash({
              sourceMessageHash: sourceParachainMessageHash,
              sourceAssetId: token.assetId,
              sourceParachainId,
              sourceParachainBlockHash,
              sourceParachainExtrinsicHash,
              targetMessageHash: messageHash,
              targetAssetId: token.tokenAddressOnMoonbeam,
              targetParachainId: MOONBEAM_PARACHAIN_ID,
              targetParachainBlockHash: blockHash,
              targetParachainExtrinsicHash: extrinsicHash,
            });

            if (promiseResolver) {
              promiseResolver({ txHash });
            }

            unsubscriber();

            xcmMessageQueue.splice(xcmMessageIndex, 1);
          } else if (
            targetParachainMessageHash &&
            targetParachainId &&
            targetParachainBlockHash &&
            targetParachainExtrinsicHash &&
            targetToken
          ) {
            const txHash = generateXCMTransactionHash({
              sourceMessageHash: sourceParachainMessageHash,
              sourceAssetId: token.assetId,
              sourceParachainId,
              sourceParachainBlockHash,
              sourceParachainExtrinsicHash,
              targetMessageHash: targetParachainMessageHash,
              targetAssetId: targetToken.assetId,
              targetParachainId,
              targetParachainBlockHash,
              targetParachainExtrinsicHash,
            });

            if (promiseResolver) {
              promiseResolver({ txHash });
            }

            unsubscriber();

            xcmMessageQueue.splice(xcmMessageIndex, 1);
          } else {
            // if there is no targetMessageHash, means that the target is moonbeam, then we use messageHash to be target message
            xcmMessage.targetParachainMessageHash = targetMessageHash || messageHash;

            unsubscriber();

            console.log('targetParachainMessageHash saved on moonbeam', xcmMessageQueue, xcmMessage);
          }
        } else {
          if (targetParachainId && targetParachainBlockHash && targetParachainExtrinsicHash) {
            xcmMessage.sourceParachainMessageHash = messageHash;

            unsubscriber();

            console.log('sourceParachainMessageHash saved on moonbeam', xcmMessageQueue, xcmMessage);
          } else {
            xcmMessageQueue.push({
              sourceParachainMessageHash: messageHash,
              // if there is no targetMessageHash, means that the target is moonbeam, then we use messageHash to be target message
              targetParachainMessageHash: targetMessageHash || messageHash,
              ...(isTargetMoonbeam
                ? {
                    targetParachainId: MOONBEAM_PARACHAIN_ID,
                    targetParachainBlockHash: blockHash,
                    targetParachainExtrinsicHash: extrinsicHash,
                    targetParachainMessageHash: messageHash,
                  }
                : {}),
            });

            unsubscriber();

            console.log('xcmMessageQueue saved on moonbeam', xcmMessageQueue);
          }
        }
      }
    }
  }
}

async function handleSourceParachainMessageByXCM(options: {
  chainId: CarrierChainId;
  api: ApiPromise;
  events: Vec<EventRecord>;
  recipientChain: CarrierChainId;
  recipientAddress: string;
  token: PolkachainToken;
  targetToken?: PolkachainToken;
  resolver: (options: { txHash: string }) => void;
  rejecter: (err: Error) => void;
  unsubscriber: () => void;
}) {
  const {
    chainId,
    api,
    events,
    recipientChain,
    recipientAddress,
    token,
    targetToken,
    resolver,
    rejecter,
    unsubscriber,
  } = options;

  function reject(e: Error) {
    rejecter(e);

    unsubscriber();
  }

  function resolve(options: { txHash: string }) {
    resolver(options);

    unsubscriber();
  }

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

  const transferredMultiAssetsEvent = sameExtrinsicEvents.find(
    (item) => item.event.section === 'xTokens' && item.event.method === 'TransferredMultiAssets',
  );
  const transferredMultiAssetsEventRecipientChain = (
    transferredMultiAssetsEvent?.event.data as any
  )?.dest?.interior?.asX2[0]?.asParachain?.toNumber() as Polkachain;
  const transferredMultiAssetsEventRecipientAddressU8a =
    recipientChain === CHAIN_ID_MOONBEAM
      ? ((transferredMultiAssetsEvent?.event.data as any)?.dest?.interior?.asX2[1]?.asAccountKey20?.key as Uint8Array)
      : ((transferredMultiAssetsEvent?.event.data as any)?.dest?.interior?.asX2[1]?.asAccountId32?.id as Uint8Array);
  const transferredMultiAssetsEventRecipientAddress = u8aToHex(transferredMultiAssetsEventRecipientAddressU8a);
  console.log(
    'handleSourceParachainMessageByXCM',
    transferredMultiAssetsEvent,
    transferredMultiAssetsEventRecipientChain,
    transferredMultiAssetsEventRecipientAddressU8a,
    transferredMultiAssetsEventRecipientAddress,
  );
  const isXCMTransfer: boolean =
    xcmpEvent != null &&
    transferredMultiAssetsEvent != null &&
    (recipientChain === CHAIN_ID_MOONBEAM
      ? transferredMultiAssetsEventRecipientChain === MOONBEAM_PARACHAIN_ID
      : transferredMultiAssetsEventRecipientChain === recipientChain) &&
    transferredMultiAssetsEventRecipientAddress.toLowerCase() === recipientAddress.toLowerCase();
  const messageHash = (xcmpEvent?.event.data as any)?.messageHash?.toHex();
  const blockHash = events.createdAtHash?.toHex();

  console.log(`batchExtrinsic.signAndSend, isXCMTransfer: ${isXCMTransfer}, messageHash: ${messageHash}`);

  if (isXCMTransfer) {
    if (!blockHash) {
      reject(new Error(`fail to find block hash on target parachain.`));
    } else if (!messageHash) {
      reject(new Error(`empty messageHash. blockHash: ${blockHash}`));
    } else {
      const xcmMessageIndex = xcmMessageQueue.findIndex((item) => item.sourceParachainMessageHash === messageHash);
      const xcmMessage = xcmMessageQueue[xcmMessageIndex];
      const {
        targetParachainMessageHash,
        targetParachainId,
        targetParachainBlockHash,
        targetParachainExtrinsicHash,
        sourceParachainMessageHash,
      } = xcmMessage || {};

      const xcmpEvents = sameExtrinsicEvents.filter((item) => {
        return item.event.section === 'xcmpQueue';
      });
      const isXcmpFailed = xcmpEvents.some((item) => item.event.method === 'Fail');
      // transfer has two xcmp events, and they all need to be successful
      const isSuccess = xcmpEvents.length === 1 && !isXcmpFailed;

      // if failed, reject the promise.
      if (!isSuccess) {
        reject(new Error(`xcmp message failed. blockHash: ${blockHash}, messageHash: ${messageHash}`));
      } else {
        const { extrinsicHash } = await getExtrinsicHashByBlockHashAndMessageHash({
          api,
          blockHash,
          messageHash,
          events,
        });

        if (sourceParachainMessageHash) {
          if (
            targetParachainMessageHash &&
            targetParachainId &&
            targetParachainBlockHash &&
            targetParachainExtrinsicHash
          ) {
            const txHash = generateXCMTransactionHash({
              sourceMessageHash: sourceParachainMessageHash,
              sourceAssetId: token.assetId,
              sourceParachainId: chainId,
              sourceParachainExtrinsicHash: extrinsicHash,
              sourceParachainBlockHash: blockHash,
              targetMessageHash: targetParachainMessageHash,
              targetAssetId: targetToken?.assetId || token.tokenAddressOnMoonbeam,
              targetParachainId,
              targetParachainBlockHash,
              targetParachainExtrinsicHash,
            });

            resolve({ txHash });

            xcmMessageQueue.splice(xcmMessageIndex, 1);

            console.log('txHash generated on source parachain', xcmMessageQueue, xcmMessage);
          } else {
            xcmMessage.sourceParachainId = chainId;
            xcmMessage.sourceParachainExtrinsicHash = extrinsicHash;
            xcmMessage.sourceParachainBlockHash = blockHash;
            xcmMessage.promiseResolver = resolve;
            xcmMessage.promiseRejecter = reject;

            console.log(
              'sourceParachainExtrinsicHash and sourceParachainBlockHash saved on source parachain',
              xcmMessageQueue,
              xcmMessage,
            );
          }
        } else {
          if (targetParachainId && targetParachainBlockHash && targetParachainExtrinsicHash) {
            xcmMessage.sourceParachainId = chainId;
            xcmMessage.sourceParachainExtrinsicHash = extrinsicHash;
            xcmMessage.sourceParachainBlockHash = blockHash;
            xcmMessage.sourceParachainMessageHash = messageHash;
            xcmMessage.promiseResolver = resolve;
            xcmMessage.promiseRejecter = reject;

            console.log(
              'sourceParachainExtrinsicHash and sourceParachainBlockHash and sourceParachainMessageHash saved on source parachain',
              xcmMessageQueue,
              xcmMessage,
            );
          } else {
            xcmMessageQueue.push({
              sourceParachainId: chainId,
              sourceParachainExtrinsicHash: extrinsicHash,
              sourceParachainBlockHash: blockHash,
              sourceParachainMessageHash: messageHash,
              promiseResolver: resolve,
              promiseRejecter: reject,
            });

            console.log('xcmMessage created on source parachain', xcmMessageQueue);
          }
        }
      }
    }
  }
}

async function handleTargetParachainMessageByXCM(options: {
  chainId: CarrierChainId;
  api: ApiPromise;
  events: Vec<EventRecord>;
  recipientChain: CarrierChainId;
  recipientAddress: string;
  token: PolkachainToken;
  targetToken: PolkachainToken;
  unsubscriber: () => void;
}) {
  const { chainId, api, events, recipientChain, recipientAddress, token, targetToken, unsubscriber } = options;
  const xcmEvent = events.find((item) => item.event.section === 'xcmpQueue');
  const sameExtrinsicEvents = events.filter((item) => {
    return (
      item.phase.isApplyExtrinsic &&
      xcmEvent?.phase.isApplyExtrinsic &&
      item.phase.asApplyExtrinsic.eq(xcmEvent?.phase.asApplyExtrinsic)
    );
  });
  const assetsIssuedEvents = sameExtrinsicEvents.filter((item) =>
    isPolkadotXCMV3(recipientChain)
      ? item.event.section === 'tokens' && item.event.method === 'Deposited'
      : item.event.section === 'assets' && item.event.method === 'Issued',
  );
  const assetIds: string[] = assetsIssuedEvents
    .map((item) => {
      try {
        return isPolkadotXCMV3(recipientChain)
          ? recipientChain === Polkachain.Interlay
            ? (item?.event.data as any)?.currencyId?.asForeignAsset?.toString()
            : recipientChain === Polkachain.PeaqAgung
            ? (item?.event.data as any)?.currencyId?.asToken.toString()
            : (item?.event.data as any)?.currencyId?.toString()
          : (item?.event.data as any)?.assetId.toString();
      } catch (e) {}
    })
    .filter((item) => item != null);
  const recipientU8As: Uint8Array[] = assetsIssuedEvents.map((item) =>
    isPolkadotXCMV3(recipientChain) ? (item?.event.data as any)?.who : (item?.event.data as any)?.owner,
  );
  const recipients: string[] = recipientU8As.map((item) => u8aToHex(item));

  console.log('handleTargetParachainMessageByXCM', assetIds, recipients, recipientAddress);

  const isXCMRedemption =
    xcmEvent != null &&
    assetsIssuedEvents != null &&
    assetIds.includes(
      recipientChain === Polkachain.PeaqAgung ? targetToken.parachainSymbol || targetToken.symbol : targetToken.assetId,
    ) &&
    recipients.includes(recipientAddress);
  const messageHash = (xcmEvent?.event.data as any)?.messageHash?.toHex();
  const blockHash = events.createdAtHash?.toHex();

  if (isXCMRedemption) {
    if (!blockHash) {
      console.error(new Error(`fail to find block hash on target parachain.`));

      unsubscriber();
    } else if (!messageHash) {
      console.error(new Error(`empty messageHash on target parachain, blockHash: ${blockHash}`));

      unsubscriber();
    } else {
      console.log(`XCM Redemption received on target parachain. blockHash: ${blockHash}, messageHash: ${messageHash}`);

      const { extrinsicHash } = await getExtrinsicHashByBlockHashAndMessageHash({
        api,
        blockHash,
        messageHash,
        events,
      });

      console.log(`get extrinsic hash successfully on target parachain. extrinsicHash: ${extrinsicHash}`);

      const xcmEvents = sameExtrinsicEvents.filter((item) => {
        return item.event.section === 'xcmpQueue';
      });
      const isXcmFailed = xcmEvents.some((item) => item.event.method === 'Fail');
      // transfer has two xcmp events and redemption has one, and they all need to be successful
      const isSuccess = xcmEvents.length === 1 && !isXcmFailed && extrinsicHash;
      const xcmMessageIndex = xcmMessageQueue.findIndex((item) => item.targetParachainMessageHash === messageHash);
      const xcmMessage = xcmMessageQueue[xcmMessageIndex];
      const {
        promiseResolver,
        promiseRejecter,
        sourceParachainMessageHash,
        sourceParachainId,
        sourceParachainBlockHash,
        sourceParachainExtrinsicHash,
        targetParachainMessageHash,
      } = xcmMessage || {};

      // if failed, save failed result and exist.
      if (!isSuccess) {
        if (promiseRejecter) {
          promiseRejecter(
            new Error(`xcmpQueue failed on target parachain. blockHash: ${blockHash}, messageHash: ${messageHash}`),
          );
        }

        unsubscriber();
      } else {
        if (targetParachainMessageHash) {
          if (
            sourceParachainMessageHash &&
            sourceParachainId &&
            sourceParachainBlockHash &&
            sourceParachainExtrinsicHash
          ) {
            const txHash = generateXCMTransactionHash({
              sourceMessageHash: sourceParachainMessageHash,
              sourceAssetId: token.assetId,
              sourceParachainId,
              sourceParachainBlockHash,
              sourceParachainExtrinsicHash,
              targetMessageHash: targetParachainMessageHash,
              targetAssetId: targetToken.assetId,
              targetParachainId: chainId,
              targetParachainExtrinsicHash: extrinsicHash,
              targetParachainBlockHash: blockHash,
            });

            if (promiseResolver) {
              promiseResolver({ txHash });
            }

            unsubscriber();

            xcmMessageQueue.splice(xcmMessageIndex, 1);

            console.log('txHash generated on target parachain', xcmMessageQueue, xcmMessage);
          } else {
            xcmMessage.targetParachainId = chainId;
            xcmMessage.targetParachainExtrinsicHash = extrinsicHash;
            xcmMessage.targetParachainBlockHash = blockHash;

            unsubscriber();

            console.log(
              'targetParachainExtrinsicHash and targetParachainBlockHash saved on target parachain',
              xcmMessageQueue,
              xcmMessage,
            );
          }
        } else {
          if (sourceParachainId && sourceParachainBlockHash && sourceParachainExtrinsicHash) {
            xcmMessage.targetParachainId = chainId;
            xcmMessage.targetParachainExtrinsicHash = extrinsicHash;
            xcmMessage.targetParachainBlockHash = blockHash;
            xcmMessage.targetParachainMessageHash = messageHash;

            unsubscriber();

            console.log(
              'targetParachainExtrinsicHash and targetParachainBlockHash and targetParachainMessageHash saved on source parachain',
              xcmMessageQueue,
              xcmMessage,
            );
          } else {
            xcmMessageQueue.push({
              targetParachainId: chainId,
              targetParachainExtrinsicHash: extrinsicHash,
              targetParachainBlockHash: blockHash,
              targetParachainMessageHash: messageHash,
            });

            unsubscriber();

            console.log('xcmMessage created on target parachain', xcmMessageQueue);
          }
        }
      }
    }
  }
}
