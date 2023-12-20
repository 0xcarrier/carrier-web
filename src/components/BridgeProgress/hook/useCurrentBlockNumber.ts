import { DependencyList, useEffect, useState } from 'react';

import { CHAIN_ID_SOLANA } from '@certusone/wormhole-sdk';
import { getEvmProviderWithWormholeChainId, isCarrierEVMChain } from '../../../utils/web3Utils';
import { getSolanaConnection } from '../../../utils/solana';
import { CarrierChainId } from '../../../utils/consts';

export const useCurrentBlockNumber = (chainId?: CarrierChainId, shouldFire?: boolean, deps?: DependencyList) => {
  const [currentBlock, setCurrentBlock] = useState<number>();
  const [error, setError] = useState<Error>();

  async function getBlock(options: { chainId: CarrierChainId; isCancelled: () => boolean }) {
    const { chainId, isCancelled } = options;

    if (!isCancelled()) {
      setError(undefined);
    }

    try {
      if (isCarrierEVMChain(chainId)) {
        const ethProvider = getEvmProviderWithWormholeChainId(chainId);
        const blockNumber = await ethProvider.getBlockNumber();

        if (!isCancelled()) {
          setCurrentBlock(blockNumber);
        }
      } else if (chainId === CHAIN_ID_SOLANA) {
        const connection = getSolanaConnection();
        const blockNumber = await connection.getSlot();

        if (!isCancelled()) {
          setCurrentBlock(blockNumber);
        }
      }
    } catch (e) {
      if (!isCancelled()) {
        setError(e as Error);
      }

      throw e;
    }
  }

  useEffect(() => {
    let cancelled = false;

    if (shouldFire && chainId) {
      getBlock({ chainId, isCancelled: () => cancelled });
    }

    return () => {
      cancelled = true;
    };
  }, [chainId, shouldFire].concat(deps || []));

  return { currentBlock, error };
};
