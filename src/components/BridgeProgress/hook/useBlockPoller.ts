import { DependencyList, useEffect, useState } from 'react';

import { CHAIN_ID_SOLANA, ChainId, isEVMChain } from '@certusone/wormhole-sdk';
import { getEvmProviderWithWormholeChainId, isCarrierEVMChain } from '../../../utils/web3Utils';
import { getSolanaConnection } from '../../../utils/solana';
import { Commitment } from '@solana/web3.js';
import { CarrierChainId } from '../../../utils/consts';

export const useBlockPoller = (options: {
  chainId?: CarrierChainId;
  shouldFire: boolean;
  blockTag?: number | string;
  interval?: number;
  deps?: DependencyList;
}) => {
  const { chainId, shouldFire, blockTag, interval, deps } = options;
  const [latestBlock, setLatestBlock] = useState<number>();

  async function getBlock(options: {
    chainId: CarrierChainId;
    blockTag?: number | string;
    isCancelled: () => boolean;
  }) {
    const { chainId, blockTag, isCancelled } = options;

    if (isCarrierEVMChain(chainId)) {
      const ethProvider = getEvmProviderWithWormholeChainId(chainId);

      const block = await ethProvider.getBlock(blockTag || 'latest');

      console.log('useBlockPoller', block.number, blockTag);

      if (!isCancelled()) {
        setLatestBlock(block.number);
      }
    } else if (chainId === CHAIN_ID_SOLANA) {
      const connection = getSolanaConnection();

      const slot = await connection.getSlot(typeof blockTag === 'string' ? (blockTag as Commitment) : 'confirmed');

      if (!isCancelled()) {
        setLatestBlock(slot);
      }
    }
  }

  useEffect(() => {
    let timer: any;
    let cancelled = false;

    if (shouldFire && chainId) {
      timer = setInterval(() => {
        getBlock({ chainId, blockTag, isCancelled: () => cancelled });
      }, interval || 10 * 1000);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }

      cancelled = true;
    };
  }, [chainId, shouldFire, blockTag, interval].concat(deps || []));

  return latestBlock;
};
