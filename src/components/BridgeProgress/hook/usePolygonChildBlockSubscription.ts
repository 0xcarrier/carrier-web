import { DependencyList, useEffect, useState } from 'react';

import { CHAIN_ID_ETH } from '@certusone/wormhole-sdk';
import { getEvmProviderWithWormholeChainId } from '../../../utils/web3Utils';
import abi from '../../../abis/PolygonRootChainProxy.json';
import { CLUSTER } from '../../../utils/consts';
import { Contract } from 'ethers';
import BigNumber from 'bignumber.js';

const polygonRootChainProxyAddress =
  CLUSTER === 'mainnet' ? '0x86e4dc95c7fbdbf52e33d563bbdb00823894c287' : '0x2890ba17efe978480615e330ecb65333b880928e';

export const usePolygonChildBlockSubscription = (shouldFire: boolean, deps?: DependencyList) => {
  const [checkBlock, setCheckBlock] = useState<number>();

  async function getChildBlock(options: { isCancelled: () => boolean }) {
    const { isCancelled } = options;
    const ethProvider = getEvmProviderWithWormholeChainId(CHAIN_ID_ETH);

    if (ethProvider) {
      const contract = new Contract(polygonRootChainProxyAddress, abi, ethProvider);
      const checkBlock: BigNumber = await contract.getLastChildBlock();
      console.log('getChildBlock', checkBlock.toNumber());

      if (!isCancelled()) {
        setCheckBlock(checkBlock.toNumber());
      }
    }
  }

  function getBlockSubscription(options: { isCancelled: () => boolean }) {
    const { isCancelled } = options;

    getChildBlock(options);

    const timer = setInterval(() => {
      if (!isCancelled()) {
        console.log('getChildBlock');
        getChildBlock(options);
      }
    }, 30 * 1000);

    return () => {
      clearInterval(timer);
    };
  }

  useEffect(() => {
    let cancelled = false;

    const unsubscriber = shouldFire ? getBlockSubscription({ isCancelled: () => cancelled }) : undefined;

    return () => {
      if (unsubscriber) {
        unsubscriber();
      }

      cancelled = true;
    };
  }, [shouldFire].concat(deps || []));

  return checkBlock;
};
