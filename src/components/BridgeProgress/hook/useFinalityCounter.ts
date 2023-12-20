import { useEffect, useMemo, useState } from 'react';

import {
  CHAIN_ID_ACALA,
  CHAIN_ID_ARBITRUM,
  CHAIN_ID_AURORA,
  CHAIN_ID_AVAX,
  CHAIN_ID_CELO,
  CHAIN_ID_ETH,
  CHAIN_ID_FANTOM,
  CHAIN_ID_KARURA,
  CHAIN_ID_KLAYTN,
  CHAIN_ID_MOONBEAM,
  CHAIN_ID_OASIS,
  CHAIN_ID_POLYGON,
  CHAIN_ID_SOLANA,
  CHAIN_ID_OPTIMISM,
  CHAIN_ID_BASE,
} from '@certusone/wormhole-sdk';

import { useCurrentBlockNumber } from './useCurrentBlockNumber';
import { useBlock } from './useBlock';
import { usePolygonChildBlockSubscription } from './usePolygonChildBlockSubscription';
import { useTransaction } from '../../../hooks/useTransaction';
import { useBlockPoller } from './useBlockPoller';
import { CarrierChainId } from '../../../utils/consts';
import { isCarrierPolkaChain } from '../../../utils/web3Utils';

// this not an arbitrum block number, it's a eth block number cache when arbitrum txn executed
// because we need to depend on eth network to calculate the arbitrum finality.
const arbitrumTxnEthBlockNumberCacheKey = 'arbitrumTxnEthBlockNumberCacheKey';

function getArbitrumTxnEthBlockNumber(options: { txHash: string; currentEthereumBlockNumber: number }) {
  const { currentEthereumBlockNumber, txHash } = options;

  const cache = localStorage.getItem(`${arbitrumTxnEthBlockNumberCacheKey}.${txHash}`);

  if (cache) {
    return parseInt(cache);
  } else {
    localStorage.setItem(`${arbitrumTxnEthBlockNumberCacheKey}.${txHash}`, `${currentEthereumBlockNumber}`);

    return currentEthereumBlockNumber;
  }
}

function calculateEthFinality(options: {
  ethereumFinalizedBlockNumber: number;
  transactionBlockNumber: number;
  latestBlockNumber: number;
}) {
  const { ethereumFinalizedBlockNumber, transactionBlockNumber, latestBlockNumber } = options;
  const targetBlockNumber =
    ethereumFinalizedBlockNumber +
    32 * (Math.ceil((transactionBlockNumber - ethereumFinalizedBlockNumber) / 32) + 1 + 1);
  const total = targetBlockNumber - transactionBlockNumber;
  const current =
    targetBlockNumber <= latestBlockNumber
      ? total
      : latestBlockNumber - transactionBlockNumber < 0
      ? 0
      : latestBlockNumber - transactionBlockNumber;

  return { current, total };
}

function calculateOptimismFinality(options: {
  transactionBlockNumber: number;
  optimismSafeBlockNumber: number;
  latestSafeBlockNumber: number;
}) {
  const { transactionBlockNumber, optimismSafeBlockNumber, latestSafeBlockNumber } = options;
  const targetSafeBlock = transactionBlockNumber + 1;
  const blocksToWait = transactionBlockNumber > optimismSafeBlockNumber ? targetSafeBlock - optimismSafeBlockNumber : 0;
  const blocksElapsed = latestSafeBlockNumber - optimismSafeBlockNumber;

  return { current: blocksElapsed > blocksToWait ? blocksToWait : blocksElapsed, total: blocksToWait };
}

function formatDefaultMessage(current: number, total: number) {
  return `Source transaction executed. waiting to reach finality (${
    current >= total ? `${total}/${total}` : current < 0 ? `0/${total}` : `${current}/${total}`
  } blocks).`;
}

function checkIfIsFinalityReached(current: number, total: number) {
  return current >= total;
}

// this hook is used for count finality on carrier bridge
// Details see: https://atanet.atlassian.net/browse/DEV-1437
export function useFinalityCounter(options: {
  chainId?: CarrierChainId;
  txHash?: string;
  tx: ReturnType<typeof useTransaction>;
  isXCMBridge: boolean;
}) {
  const { chainId, txHash, tx, isXCMBridge } = options;
  const [isFinalityReached, setIsFinalityReached] = useState(false);

  const { evmBlock: ethereumFinalizedBlock, error: ethereumFinalizedBlockError } = useBlock({
    chainId: CHAIN_ID_ETH,
    options: { blockTag: 'finalized' },
    shouldFire: tx.data != null && !isFinalityReached && (chainId === CHAIN_ID_ETH || chainId === CHAIN_ID_ARBITRUM),
  });

  const { evmBlock: safeBlock, error: safeBlockError } = useBlock({
    chainId,
    options: { blockTag: 'safe' },
    shouldFire: tx.data != null && !isFinalityReached && (chainId === CHAIN_ID_OPTIMISM || chainId === CHAIN_ID_BASE),
  });

  // we use eth network to calculate finality on arbitrum
  const { currentBlock: currentEthereumBlockNumber, error: currentEthereumBlockNumberError } = useCurrentBlockNumber(
    CHAIN_ID_ETH,
    tx.data != null && !isFinalityReached && chainId === CHAIN_ID_ARBITRUM,
  );
  const latestBlockNumber = useBlockPoller({
    chainId: chainId === CHAIN_ID_ARBITRUM ? CHAIN_ID_ETH : isCarrierPolkaChain(chainId) ? CHAIN_ID_MOONBEAM : chainId,
    interval: 1000,
    shouldFire:
      tx.data != null &&
      !isFinalityReached &&
      chainId !== CHAIN_ID_OPTIMISM &&
      chainId !== CHAIN_ID_BASE &&
      !isXCMBridge,
  });
  const latestSafeBlockNumber = useBlockPoller({
    chainId,
    blockTag: 'safe',
    shouldFire: tx.data != null && !isFinalityReached && (chainId === CHAIN_ID_OPTIMISM || chainId === CHAIN_ID_BASE),
  });

  // should only fire when chain id is polygon
  const polygonChildBlock = usePolygonChildBlockSubscription(chainId === CHAIN_ID_POLYGON && !isFinalityReached);

  const transactionBlockNumber = useMemo(
    () =>
      tx.data
        ? 'slot' in tx.data
          ? tx.data.slot
          : 'blockNumber' in tx.data
          ? tx.data.blockNumber
          : undefined
        : undefined,
    [tx.data],
  );

  function getFinalityResult() {
    if (ethereumFinalizedBlockError != null || currentEthereumBlockNumberError != null || safeBlockError != null) {
      return {
        message: 'Error happens on finality calculation; continue...',
        isFinalityReached: true,
      };
    }

    if (isXCMBridge) {
      return { message: 'Source transaction executed.', isFinalityReached: true };
    } else if (txHash && transactionBlockNumber != null) {
      if (chainId === CHAIN_ID_POLYGON) {
        if (polygonChildBlock && latestBlockNumber) {
          const leftMinute =
            latestBlockNumber <= polygonChildBlock + 900
              ? Math.ceil((900 - latestBlockNumber + polygonChildBlock) / 30)
              : 0;
          const isFinalityReached = polygonChildBlock >= transactionBlockNumber;

          return {
            message: `Source transaction executed.\n Transaction in block#${transactionBlockNumber}, latest finalized block#${polygonChildBlock} (${
              leftMinute === 0 ? 'Delayed' : `Remains: ~${leftMinute} minutes`
            })`,
            isFinalityReached,
          };
        }
      } else if (chainId === CHAIN_ID_ETH) {
        if (ethereumFinalizedBlock && latestBlockNumber) {
          const { current, total } = calculateEthFinality({
            ethereumFinalizedBlockNumber: ethereumFinalizedBlock.number,
            transactionBlockNumber,
            latestBlockNumber,
          });

          return {
            message: `Source transaction executed, waiting to reach finality (${current}/${total}; approx)`,
            isFinalityReached: checkIfIsFinalityReached(current, total),
          };
        }
      } else if (chainId === CHAIN_ID_OPTIMISM || chainId === CHAIN_ID_BASE) {
        if (safeBlock && latestSafeBlockNumber && transactionBlockNumber) {
          const { current, total } = calculateOptimismFinality({
            transactionBlockNumber,
            optimismSafeBlockNumber: safeBlock.number,
            latestSafeBlockNumber,
          });

          return {
            message: `Source transaction executed, waiting to reach finality${
              total !== 0 ? ` (${current}/${total}; approx)` : ''
            }`,
            isFinalityReached: checkIfIsFinalityReached(current, total),
          };
        }
      } else if (chainId === CHAIN_ID_ARBITRUM) {
        if (ethereumFinalizedBlock && currentEthereumBlockNumber && latestBlockNumber) {
          const arbitrumTxnEthBlockNumber = getArbitrumTxnEthBlockNumber({
            txHash,
            currentEthereumBlockNumber,
          });

          const { current, total } = calculateEthFinality({
            ethereumFinalizedBlockNumber: ethereumFinalizedBlock.number,
            transactionBlockNumber: arbitrumTxnEthBlockNumber,
            latestBlockNumber,
          });

          return {
            message: `Source transaction executed, waiting to reach finality on Ethereum (${current}/${total}; approx)`,
            isFinalityReached: checkIfIsFinalityReached(current, total),
          };
        }
      } else {
        if (latestBlockNumber) {
          // default is wait for 15 blocks, like bnb
          const total =
            chainId === CHAIN_ID_OASIS ||
            chainId === CHAIN_ID_AURORA ||
            chainId === CHAIN_ID_FANTOM ||
            chainId === CHAIN_ID_ACALA ||
            chainId === CHAIN_ID_KARURA ||
            chainId === CHAIN_ID_KLAYTN ||
            chainId === CHAIN_ID_CELO ||
            chainId === CHAIN_ID_MOONBEAM ||
            chainId === CHAIN_ID_AVAX ||
            isCarrierPolkaChain(chainId) // parachain finality is the same as moonbeam
              ? 1
              : chainId === CHAIN_ID_SOLANA
              ? 32
              : 15;
          const current = latestBlockNumber - transactionBlockNumber;

          return {
            message: formatDefaultMessage(current, total),
            isFinalityReached: checkIfIsFinalityReached(current, total),
          };
        }
      }
    }

    return { message: 'Calculating finality, please wait...', isFinalityReached: false };
  }

  const result = useMemo(() => {
    const result = getFinalityResult();

    return result;
  }, [
    chainId,
    ethereumFinalizedBlock,
    currentEthereumBlockNumber,
    latestBlockNumber,
    latestSafeBlockNumber,
    transactionBlockNumber,
    polygonChildBlock,
    ethereumFinalizedBlockError,
    currentEthereumBlockNumberError,
    isXCMBridge,
  ]);

  useEffect(() => {
    if (result.isFinalityReached) {
      setIsFinalityReached(true);
    }
  }, [result]);

  return result;
}
