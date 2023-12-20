import BigNumber from 'bignumber.js';
import { DataResult, getPendingPromise, useData } from '../../../hooks/useData';
import { TokenData } from '../../../utils/tokenData/helper';
import { api } from '../../../utils/http/api';
import { ethers } from 'ethers';
import { MaxAmountData } from '../../../hooks/useMaxAmoutData';
import { formatAmount } from '../../../utils/format-amount';
import { ApiV1WormholeXswapPost200Response } from '../../../indexer-client';
import { CarrierChainId } from '../../../utils/consts';
import { toFixed } from '../../../utils/web3Utils';

async function getMaxTargetAmount(options: {
  signal: AbortSignal;
  sourceChainId?: CarrierChainId;
  sourceToken?: TokenData;
  targetChainId?: CarrierChainId;
  targetToken?: TokenData;
  maxSourceAmountData: DataResult<MaxAmountData | undefined>;
  selectedRouterIndex: number;
}): Promise<MaxAmountData | undefined> {
  const { signal, sourceChainId, sourceToken, targetChainId, targetToken, maxSourceAmountData, selectedRouterIndex } =
    options;

  if (maxSourceAmountData.error) {
    throw maxSourceAmountData.error;
  }

  if (maxSourceAmountData.loading) {
    return getPendingPromise(signal);
  }

  if (maxSourceAmountData.data && sourceChainId && targetChainId && sourceToken && targetToken) {
    const indexerSwapData = await api.indexer.apiV1WormholeXswapPost({
      apiV1WormholeXswapPostRequest: {
        srcChain: sourceChainId,
        srcToken: sourceToken.tokenAddress,
        dstChain: targetChainId,
        dstToken: targetToken.tokenAddress,
        srcAmount: maxSourceAmountData.data.maxAmountInWei.toString(),
      },
    });

    // const indexerSwapData: ApiV1WormholeXswapPost200Response = {
    //   routes: [
    //     {
    //       amount: '100000000000000000',
    //       hops: [
    //         {
    //           type: 'swap',
    //           tokenIn: {
    //             chain: 2,
    //             address: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
    //             amount: '100000000000000000',
    //           },
    //           tokenOut: {
    //             chain: 2,
    //             address: '0x509ee0d083ddf8ac028f2a56731412edd63223b9',
    //             amount: '100000000000000000000',
    //           },
    //           providerFee: '100',
    //           bridge: 'wormhole',
    //           pool: 'uniswap_v2',
    //           dex: 'uniswap_v2',
    //         },
    //         {
    //           type: 'swap',
    //           tokenIn: {
    //             chain: 4,
    //             address: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',
    //             amount: '100000000000000000',
    //           },
    //           tokenOut: {
    //             chain: 4,
    //             address: '0xae13d989dac2f0debff460ac112a837c89baa7cd',
    //             amount: '100000000000000000000',
    //           },
    //           providerFee: '100',
    //           bridge: 'wormhole',
    //           pool: 'uniswap_v2',
    //           dex: 'uniswap_v2',
    //         },
    //       ],
    //     },
    //   ],
    // };

    const selectedRoute = indexerSwapData.routes[selectedRouterIndex];

    if (selectedRoute && selectedRoute.hops && selectedRoute.hops.length) {
      const maxAmountInWei = selectedRoute.hops[selectedRoute.hops.length - 1].tokenOut.amount;
      const maxAmountBigNumber = BigNumber(ethers.utils.formatUnits(maxAmountInWei, targetToken.decimals).toString());

      return {
        maxAmount: maxAmountBigNumber,
        maxAmountString: toFixed(maxAmountBigNumber, targetToken.decimals),
        maxAmountInWei: ethers.BigNumber.from(maxAmountInWei),
      };
    }
  }
}

export function useMaxTargetAmountData(options: {
  sourceChainId?: CarrierChainId;
  sourceToken?: TokenData;
  targetChainId?: CarrierChainId;
  targetToken?: TokenData;
  maxSourceAmountData: DataResult<MaxAmountData | undefined>;
  selectedRouterIndex: number;
}): DataResult<MaxAmountData | undefined> {
  const { sourceChainId, sourceToken, targetChainId, targetToken, maxSourceAmountData, selectedRouterIndex } = options;

  const maxAmount = useData(
    async (signal) => {
      console.log('useMaxTargetAmountData', {
        sourceChainId,
        sourceToken,
        targetChainId,
        targetToken,
        maxSourceAmountData,
      });

      const data = await getMaxTargetAmount({
        signal,
        sourceChainId,
        sourceToken,
        targetChainId,
        targetToken,
        maxSourceAmountData,
        selectedRouterIndex,
      });
      // console.log('useMaxAmountData result', data);

      return data;
    },
    [sourceChainId, sourceToken, targetChainId, targetToken, maxSourceAmountData],
  );

  return maxAmount;
}
