import { CarrierChainId, MOONBEAM_MRL_PRECOMPILE_ADDRESS, MOONBEAM_PARACHAIN_ID } from '../../../utils/consts';
import {
  generateMRLTransactionHash,
  getPolkadotProviderWithWormholeChainId,
  isPolkadotXCMV3,
} from '../../../utils/polkadot';
import { ApiPromise } from '@polkadot/api';
import type { Vec } from '@polkadot/types';
import type { EventRecord } from '@polkadot/types/interfaces';
import { CHAIN_ID_MOONBEAM, parseVaa } from '@certusone/wormhole-sdk';
import { decodeTx, getEthTransaction } from '../../../utils/ethereum';
import wormholeMRLTransferABI from '../../../abis/WormholeMRLTransferABI.json';
import { useData } from '../../../hooks/useData';
import { ethers } from 'ethers';

const xcmpMessageQueue: {
  [messageHash: string]: {
    moonbeamBlockHash?: string;
    moonbeamExtrinsicHash?: string;
    moonbeamTransactionHash?: string;
    parachainBlockHash?: string;
    parachainExtrinsicHash?: string;
  };
} = {};

async function getVaaAndTransactionHashFromEthereumExecutedEvent(ethereumExecutedEvent: EventRecord | undefined) {
  if (ethereumExecutedEvent) {
    if (
      (ethereumExecutedEvent.event.data as any).to.toHex().toLowerCase() ===
      MOONBEAM_MRL_PRECOMPILE_ADDRESS.toLowerCase()
    ) {
      const transactionHash = (ethereumExecutedEvent.event.data as any).transactionHash.toHex();
      const transaction = await getEthTransaction({ chainId: CHAIN_ID_MOONBEAM, txHash: transactionHash });
      const decodeData = transaction?.data ? decodeTx([wormholeMRLTransferABI], transaction?.data) : undefined;

      if (decodeData) {
        if (decodeData.functionFragment.name === 'wormholeTransferERC20') {
          const vaaHex = decodeData.args[0];
          const vaaBytes = ethers.utils.arrayify(vaaHex);
          const vaaParsed = parseVaa(vaaBytes);

          return { vaa: vaaParsed, transactionHash };
        }
      }
    }
  }
}

async function getExtrinsicHashByBlockHashAndMessageHash(options: {
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

  return { extrinsicHash: extrinsic?.hash.toHex() };
}

async function handleMoonbeamMessage(options: {
  api: ApiPromise;
  events: Vec<EventRecord>;
  emitterChain: CarrierChainId;
  emitterAddress: string;
  sequence: bigint;
  parachainId: CarrierChainId;
  resolver: (data: { parachainTxHash: string } | undefined) => void;
  rejecter: (e: Error) => void;
}) {
  const { api, events, emitterChain, emitterAddress, sequence, parachainId, resolver, rejecter } = options;

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
  const isMRLRedemption =
    xcmpEvent &&
    tokenTransferExecutedEvent &&
    (tokenTransferExecutedEvent.event.data as any)?.to?.toHex() === MOONBEAM_MRL_PRECOMPILE_ADDRESS.toLowerCase();

  const messageHash = (xcmpEvent?.event.data as any)?.messageHash?.toHex();
  const blockHash = events.createdAtHash?.toHex();

  if (isMRLRedemption) {
    if (!blockHash) {
      rejecter(new Error(`fail to find block hash on moonbeam.`));
    } else if (!messageHash) {
      rejecter(new Error(`empty messageHash on moonbeam, blockHash: ${blockHash}`));
    } else {
      console.log(`MRL Redemption received on moonbeam. blockHash: ${blockHash}, messageHash: ${messageHash}`);

      const { extrinsicHash: moonbeamExtrinsicHash } = await getExtrinsicHashByBlockHashAndMessageHash({
        api,
        blockHash,
        messageHash,
        events,
      });
      const vaaResult = await getVaaAndTransactionHashFromEthereumExecutedEvent(tokenTransferExecutedEvent);

      console.log('parachain extrinsic vaa result: ', vaaResult);

      // only process the extrinsic which has the same sequence with the current transaction
      if (
        vaaResult &&
        vaaResult.vaa.emitterAddress.toString('hex').toLowerCase() === emitterAddress.toLowerCase() &&
        vaaResult.vaa.emitterChain === emitterChain &&
        vaaResult.vaa.sequence === sequence
      ) {
        const isXcmpFailed = xcmpEvents.some((item) => item.event.method === 'Fail');
        // redemption has one xcmp event, and it need to be successful
        const isSuccess = !isXcmpFailed && moonbeamExtrinsicHash;

        // if failed, reject and exist.
        if (!isSuccess) {
          rejecter(new Error(`xcmpQueue failed on moonbeam. blockHash: ${blockHash}, messageHash: ${messageHash}`));
        } else {
          const xcmpMessage = xcmpMessageQueue[messageHash];

          const { parachainBlockHash, parachainExtrinsicHash } = xcmpMessage || {};

          if (parachainBlockHash && parachainExtrinsicHash) {
            const parachainTxHash = generateMRLTransactionHash({
              messageHash,
              moonbeamBlockHash: blockHash,
              moonbeamTransactionHash: vaaResult.transactionHash,
              moonbeamExtrinsicHash,
              parachainId,
              parachainExtrinsicHash,
              parachainBlockHash,
            });

            if (resolver) {
              resolver({ parachainTxHash });
            }

            delete xcmpMessageQueue[messageHash];
          } else {
            xcmpMessageQueue[messageHash] = {
              moonbeamBlockHash: blockHash,
              moonbeamExtrinsicHash,
              moonbeamTransactionHash: vaaResult.transactionHash,
            };
          }
        }
      }
    }
  }
}

async function handleParachainMessage(options: {
  api: ApiPromise;
  chainId: CarrierChainId;
  events: Vec<EventRecord>;
  resolver: (data: { parachainTxHash: string } | undefined) => void;
  rejecter: (e: Error) => void;
}) {
  const { api, chainId, events, resolver, rejecter } = options;

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
  const assetsIssuedEvent = sameExtrinsicEvents.find((item) =>
    isPolkadotXCMV3(chainId)
      ? item.event.section === 'tokens' && item.event.method === 'Deposited'
      : item.event.section === 'assets' && item.event.method === 'Issued',
  );
  const isMRLRedemption = xcmpEvent && assetsIssuedEvent;
  const messageHash = (xcmpEvent?.event.data as any)?.messageHash?.toHex();
  const blockHash = events.createdAtHash?.toHex();

  if (isMRLRedemption) {
    if (!blockHash) {
      rejecter(new Error(`fail to find block hash on chainId: ${chainId}.`));
    } else if (!messageHash) {
      rejecter(new Error(`empty messageHash on chainId: ${chainId}. blockHash: ${blockHash}`));
    } else {
      console.log(`MRL Redemption received. chainId: ${chainId}. blockHash: ${blockHash}, messageHash: ${messageHash}`);

      const { extrinsicHash: parachainExtrinsicHash } = await getExtrinsicHashByBlockHashAndMessageHash({
        api,
        blockHash,
        messageHash,
        events,
      });

      const xcmpEvents = sameExtrinsicEvents.filter((item) => {
        return item.event.section === 'xcmpQueue';
      });
      const isXcmpFailed = xcmpEvents.some((item) => item.event.method === 'Fail');
      // redemption has one xcmp event, and it needs to be successful
      const isSuccess = !isXcmpFailed && parachainExtrinsicHash;

      // if failed, save failed result and exist.
      if (!isSuccess) {
        rejecter(
          new Error(`xcmpQueue failed on chainId: ${chainId}. blockHash: ${blockHash}, messageHash: ${messageHash}.`),
        );
      } else {
        const xcmpMessage = xcmpMessageQueue[messageHash];
        const { moonbeamBlockHash, moonbeamExtrinsicHash, moonbeamTransactionHash } = xcmpMessage || {};

        if (moonbeamBlockHash && moonbeamExtrinsicHash && moonbeamTransactionHash) {
          const parachainTxHash = generateMRLTransactionHash({
            messageHash,
            moonbeamBlockHash,
            moonbeamExtrinsicHash,
            moonbeamTransactionHash,
            parachainId: chainId,
            parachainExtrinsicHash,
            parachainBlockHash: blockHash,
          });

          resolver({ parachainTxHash });

          delete xcmpMessageQueue[messageHash];
        } else {
          xcmpMessageQueue[messageHash] = {
            parachainBlockHash: blockHash,
            parachainExtrinsicHash,
          };
        }
      }
    }
  }
}

async function subscribeParachainExtrinsicResult(options: {
  signal: AbortSignal;
  parachainId: CarrierChainId;
  emitterChain: CarrierChainId;
  emitterAddress: string;
  sequence: bigint;
  resolver: (data: { parachainTxHash: string } | undefined) => void;
  rejecter: (e: Error) => void;
}) {
  const { signal, parachainId, emitterChain, emitterAddress, sequence, resolver, rejecter } = options;

  function resolve(data: { parachainTxHash: string } | undefined) {
    unsubMoonbeam();
    unsubParachain();
    resolver(data);
  }

  function reject(e: Error) {
    unsubMoonbeam();
    unsubParachain();
    rejecter(e);
  }

  function signalListener() {
    signal.removeEventListener('abort', signalListener);

    resolve(undefined);
  }

  const moonbeamApi = await getPolkadotProviderWithWormholeChainId(MOONBEAM_PARACHAIN_ID);

  const unsubMoonbeam = await moonbeamApi.query.system.events((events) => {
    handleMoonbeamMessage({
      api: moonbeamApi,
      emitterChain,
      emitterAddress,
      sequence,
      events,
      parachainId,
      resolver: resolve,
      rejecter: reject,
    });
  });

  const parachainApi = await getPolkadotProviderWithWormholeChainId(parachainId);

  const unsubParachain = await parachainApi.query.system.events((events) => {
    handleParachainMessage({ api: parachainApi, chainId: parachainId, events, resolver: resolve, rejecter: reject });
  });

  signal.addEventListener('abort', signalListener);
}

async function getParachainExtrinsicResult(options: {
  signal: AbortSignal;
  parachainId: CarrierChainId;
  emitterChain: CarrierChainId;
  emitterAddress: string;
  sequence: bigint;
}) {
  const { signal, parachainId, emitterChain, emitterAddress, sequence } = options;

  return new Promise<{ parachainTxHash: string } | undefined>((resolve, reject) => {
    subscribeParachainExtrinsicResult({
      signal,
      parachainId,
      emitterChain,
      emitterAddress,
      sequence,
      resolver: resolve,
      rejecter: reject,
    });
  });
}

export function useParachainExtrinsicResult(options: {
  parachainId?: CarrierChainId;
  emitterChain?: CarrierChainId;
  emitterAddress?: string;
  sequence?: bigint;
  shouldFire?: boolean;
}) {
  const { parachainId, emitterChain, emitterAddress, sequence, shouldFire } = options;

  const data = useData(
    async (signal) => {
      if (parachainId && emitterChain && emitterAddress && sequence && shouldFire) {
        const result = await getParachainExtrinsicResult({
          signal,
          parachainId,
          emitterChain,
          emitterAddress,
          sequence,
        });

        return result;
      }
    },
    [parachainId, emitterChain, emitterAddress, sequence, shouldFire],
  );

  return data;
}
