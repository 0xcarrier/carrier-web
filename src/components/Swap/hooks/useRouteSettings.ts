import { DataResult, getPendingPromise, useData } from '../../../hooks/useData';
import { TokenData } from '../../../utils/tokenData/helper';
import { getEthTokensParsedTokenAccounts } from '../../../utils/tokenData/ethereum';
import { Wallet } from '../../../hooks/useWallet';
import { ethers } from 'ethers';
import BigNumber from 'bignumber.js';
import { api } from '../../../utils/http/api';
import { ApiV1WormholeXswapPost200Response } from '../../../indexer-client';
import { AmountData } from '../../../hooks/useAmountData';
import { TokenPrice } from '../../../utils/tokenPrices';
import { SupportedEVMChainId, getEvmGasPrice, nativeCoinGeckoIdMapping } from '../../../utils/fees';
import {
  CarrierChainId,
  destinationChainGasLimit,
  getDefaultNativeCurrencyAddress,
  sourceChainGasLimit,
} from '../../../utils/consts';
import { loadNativeToken } from '../../../hooks/useTokens';
import { useEffect } from 'react';
import { TransferAmountData } from './useTransferAmountString';

export async function calculateGasFeesInUSD(options: {
  isSource: boolean;
  chainId: CarrierChainId;
  tokenPrices: TokenPrice;
}): Promise<BigNumber | undefined> {
  const { isSource, chainId, tokenPrices } = options;

  const tokenPrice = tokenPrices[nativeCoinGeckoIdMapping[chainId as SupportedEVMChainId]]?.usd || 0;
  const tokenPriceBigNumber = BigNumber(tokenPrice);
  const gasPrice = await getEvmGasPrice(chainId);
  const gasPriceBigNumber = BigNumber(gasPrice ? gasPrice.toString() : '0');

  const gasInWei = gasPriceBigNumber.multipliedBy(
    // TODO: confirm the gas limit on swap contract calls
    isSource ? sourceChainGasLimit.nativeCurrency : destinationChainGasLimit,
  );
  const gasInEther = BigNumber(ethers.utils.formatEther(gasInWei.toString()).toString());

  return gasInEther.multipliedBy(tokenPriceBigNumber);
}

export async function getRouteSettings(options: {
  signal: AbortSignal;
  sourceWallet: Wallet;
  sourceChainId?: CarrierChainId;
  sourceToken?: TokenData;
  targetChainId?: CarrierChainId;
  targetToken?: TokenData;
  sourceTokenAmount?: AmountData;
  targetTokenAmount?: AmountData;
  tokenPricesData: DataResult<TokenPrice | undefined>;
}) {
  const {
    signal,
    sourceWallet,
    sourceChainId,
    sourceToken,
    targetChainId,
    targetToken,
    sourceTokenAmount,
    targetTokenAmount,
    tokenPricesData,
  } = options;

  if (sourceTokenAmount?.amountValidationInfo.error) {
    throw sourceTokenAmount.amountValidationInfo.error;
  }

  if (sourceTokenAmount?.amountValidationInfo.loading) {
    return getPendingPromise(signal);
  }

  if (targetTokenAmount?.amountValidationInfo.error) {
    throw targetTokenAmount.amountValidationInfo.error;
  }

  if (targetTokenAmount?.amountValidationInfo.loading) {
    return getPendingPromise(signal);
  }

  if (tokenPricesData.error) {
    throw tokenPricesData.error;
  }

  if (tokenPricesData.loading) {
    return getPendingPromise(signal);
  }

  console.log(
    'getRouteSettings',
    sourceChainId,
    sourceToken,
    targetChainId,
    targetToken,
    sourceTokenAmount,
    targetTokenAmount,
  );

  if (
    sourceChainId &&
    sourceToken &&
    targetChainId &&
    targetToken &&
    ((sourceTokenAmount?.amountValidationInfo.data?.transferAmountValid &&
      !targetTokenAmount?.amountValidationInfo.data?.transferAmountValid) ||
      (!sourceTokenAmount?.amountValidationInfo.data?.transferAmountValid &&
        targetTokenAmount?.amountValidationInfo.data?.transferAmountValid))
  ) {
    const indexerSwapData = await api.indexer.apiV1WormholeXswapPost({
      apiV1WormholeXswapPostRequest: {
        srcChain: sourceChainId,
        srcToken: sourceToken.tokenAddress,
        dstChain: targetChainId,
        dstToken: targetToken.tokenAddress,
        srcAmount: sourceTokenAmount?.amountValidationInfo.data?.transferAmountParsed?.toString(),
        dstAmount: targetTokenAmount?.amountValidationInfo.data?.transferAmountParsed?.toString(),
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

    // TODO: gas fee
    const gasFees: { [chainId: number]: FeeData } = {};
    const tokens: { [chainId: number]: string[] } = {};

    indexerSwapData.routes.forEach((route) => {
      route.hops?.forEach((token) => {
        tokens[token.tokenIn.chain] = tokens[token.tokenIn.chain] || [];
        tokens[token.tokenIn.chain].push(token.tokenIn.address);

        tokens[token.tokenOut.chain] = tokens[token.tokenOut.chain] || [];
        tokens[token.tokenOut.chain].push(token.tokenOut.address);
      });
    });

    const tokenInfos = (await Promise.all(
      Object.keys(tokens)
        .map(async (chainIdString) => {
          const chainId = parseInt(chainIdString) as CarrierChainId;
          const defaultNativeCurrency = getDefaultNativeCurrencyAddress(chainId);
          const nativeWrappedToken = tokens[chainId].find((item) => {
            return item.toLowerCase() === defaultNativeCurrency.toLowerCase();
          });
          const erc20Tokens = tokens[chainId].filter((item) => {
            return item.toLowerCase() !== defaultNativeCurrency.toLowerCase();
          });
          const walletAddress = sourceWallet.wallet?.walletAddress;
          const nativeTokenPromise =
            walletAddress && nativeWrappedToken ? await loadNativeToken({ chainId, walletAddress }) : undefined;
          const parsedTokenAccounts = walletAddress
            ? Promise.all([
                nativeTokenPromise?.nativeTokenPromise,
                getEthTokensParsedTokenAccounts({
                  tokens: erc20Tokens.map((item) => {
                    return { contractAddress: item };
                  }),
                  chainId,
                  signerAddress: walletAddress,
                }),
              ]).then(([nativeToken, erc20Token]) => {
                return {
                  chainId,
                  parsedTokenAccounts: (nativeToken ? [nativeToken] : []).concat(
                    erc20Token ? erc20Token.parsedTokenAccounts : [],
                  ),
                  errors: (erc20Token ? erc20Token.errors : []).concat(
                    nativeTokenPromise && nativeTokenPromise.nativeTokenError
                      ? [nativeTokenPromise.nativeTokenError]
                      : [],
                  ),
                };
              })
            : undefined;

          return parsedTokenAccounts;
        })
        .filter((item) => item != null),
    )) as {
      chainId: CarrierChainId;
      parsedTokenAccounts: TokenData[];
      errors: {
        tokenAddress: string;
        error: Error;
      }[];
    }[];

    return {
      tokenInfos,
      gasFees,
      indexerSwapData,
    };
  }
}

export interface FeeData {
  inWei: ethers.BigNumber;
  inUSD: BigNumber;
}

export interface RouteSettingsData {
  tokenInfos: {
    chainId: CarrierChainId;
    parsedTokenAccounts: TokenData[];
    errors: {
      tokenAddress: string;
      error: Error;
    }[];
  }[];
  gasFees: {
    [chainId: number]: FeeData;
  };
  indexerSwapData: ApiV1WormholeXswapPost200Response;
}

export function useRouteSettings(options: {
  sourceWallet: Wallet;
  sourceChainId?: CarrierChainId;
  sourceToken?: TokenData;
  targetChainId?: CarrierChainId;
  targetToken?: TokenData;
  sourceTokenAmount?: AmountData;
  targetTokenAmount?: AmountData;
  tokenPricesData: DataResult<TokenPrice | undefined>;
  transferAmount: TransferAmountData;
  selectedRouterIndex: number;
}): DataResult<RouteSettingsData | undefined> {
  const {
    sourceWallet,
    sourceChainId,
    sourceToken,
    targetChainId,
    targetToken,
    sourceTokenAmount,
    targetTokenAmount,
    tokenPricesData,
    transferAmount,
    selectedRouterIndex,
  } = options;

  const result = useData(
    async (signal) => {
      return getRouteSettings({
        signal,
        sourceWallet,
        sourceChainId,
        sourceToken,
        targetChainId,
        targetToken,
        sourceTokenAmount,
        targetTokenAmount,
        tokenPricesData,
      });
    },
    [sourceChainId, sourceToken, targetChainId, targetToken, sourceTokenAmount, targetTokenAmount, tokenPricesData],
  );

  useEffect(() => {
    if (result && !result.loading && !result.error && result.data) {
      const selectedRoute = result.data.indexerSwapData.routes[selectedRouterIndex];
      console.log('result.data.indexerSwapData', result.data.indexerSwapData);
      const firstHops = selectedRoute && selectedRoute.hops && selectedRoute.hops[0];
      const lastHops = selectedRoute && selectedRoute.hops && selectedRoute.hops[selectedRoute.hops.length - 1];
      const expectedSourceAmount = firstHops?.tokenIn.amount;
      const expectedTargetAmount = lastHops?.tokenOut.amount;

      if (
        expectedSourceAmount &&
        sourceToken &&
        !transferAmount.amountString.sourceAmount &&
        transferAmount.amountString.targetAmount
      ) {
        transferAmount.setAmountString({
          sourceAmount: ethers.utils.formatUnits(expectedSourceAmount, sourceToken.decimals),
          targetAmount: transferAmount.amountString.targetAmount,
        });
      } else if (
        expectedTargetAmount &&
        targetToken &&
        transferAmount.amountString.sourceAmount &&
        !transferAmount.amountString.targetAmount
      ) {
        transferAmount.setAmountString({
          sourceAmount: transferAmount.amountString.sourceAmount,
          targetAmount: ethers.utils.formatUnits(expectedTargetAmount, targetToken.decimals),
        });
      }
    }
  }, [selectedRouterIndex, result]);

  return result;
}
