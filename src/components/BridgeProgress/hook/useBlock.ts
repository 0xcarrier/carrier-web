import { DependencyList, useEffect, useState } from 'react';

import { CHAIN_ID_SOLANA } from '@certusone/wormhole-sdk';
import { getSolanaConnection } from '../../../utils/solana';
import { GetBlockConfig, BlockResponse } from '@solana/web3.js';
import { getEvmProviderWithWormholeChainId, isCarrierEVMChain } from '../../../utils/web3Utils';
import { CarrierChainId } from '../../../utils/consts';

export const useBlock = (data: {
  chainId?: CarrierChainId;
  options: { blockTag?: string; solanaConfig?: GetBlockConfig };
  shouldFire: boolean;
  deps?: DependencyList;
}) => {
  const { chainId, options, shouldFire, deps } = data;
  const { blockTag, solanaConfig } = options;
  const [evmBlock, setEvmBlock] = useState<any>();
  const [solanaBlock, setSolanaBlock] = useState<BlockResponse>();
  const [error, setError] = useState<Error>();

  async function getBlock(options: { chainId: CarrierChainId; isCancelled: () => boolean }) {
    const { chainId, isCancelled } = options;
    if (!isCancelled()) {
      setError(undefined);
    }

    try {
      if (isCarrierEVMChain(chainId) && blockTag) {
        const ethProvider = getEvmProviderWithWormholeChainId(chainId);

        console.log('getBlock 1', blockTag);
        const block = await ethProvider.getBlock(blockTag);
        console.log('getBlock 2', blockTag);

        if (!isCancelled()) {
          setEvmBlock(block);
        }
      } else if (chainId === CHAIN_ID_SOLANA) {
        const connection = getSolanaConnection();
        const slot = await connection.getSlot();
        const block = await connection.getBlock(slot, solanaConfig);

        if (!isCancelled() && block) {
          setSolanaBlock(block);
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

  return { evmBlock, solanaBlock, error };
};
