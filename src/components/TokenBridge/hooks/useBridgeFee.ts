import BigNumber from 'bignumber.js';
import { useMemo } from 'react';
import { DataResult, getPendingPromise, useData } from '../../../hooks/useData';
import { calculateFeesInUSD } from '../../../utils/fees';
import { TokenData } from '../../../utils/tokenData/helper';
import { TokenPrice } from '../../../utils/tokenPrices';
import { AllowanceData } from '../../../hooks/useAllowance';
import { CarrierChainId } from '../../../utils/consts';
import { ProviderFeeData } from '../../../hooks/useProviderFeeData';

async function calculateFees(options: {
  signal: AbortSignal;
  sourceChainId?: CarrierChainId;
  targetChainId: CarrierChainId;
  tokenPricesData: DataResult<TokenPrice | undefined>;
  sourceToken?: TokenData;
  allowanceData: AllowanceData;
  isUsingRelayer: boolean;
}) {
  const { signal, sourceChainId, targetChainId, tokenPricesData, sourceToken, allowanceData, isUsingRelayer } = options;

  if (tokenPricesData.loading || allowanceData.loading) {
    return getPendingPromise(signal);
  }

  if (sourceChainId && tokenPricesData.data && sourceToken) {
    const sourceFee = await calculateFeesInUSD({
      isSource: true,
      chainId: sourceChainId,
      tokenPrices: tokenPricesData.data,
      isNFT: false,
      approvalRequired: allowanceData.data.approvalRequired,
      isNativeAsset: sourceToken.isNativeAsset,
    });

    const targetFee = !isUsingRelayer
      ? await calculateFeesInUSD({
          isSource: false,
          chainId: targetChainId,
          tokenPrices: tokenPricesData.data,
          isNFT: false,
        })
      : BigNumber(0);

    return { sourceFee, targetFee };
  }
}

export interface BridgeFee {
  feeData: DataResult<{ sourceFee: BigNumber | undefined; targetFee: BigNumber | undefined } | undefined>;
  totalFees: BigNumber | undefined;
}

export function useBridgeFee(options: {
  sourceChainId?: CarrierChainId;
  targetChainId: CarrierChainId;
  tokenPricesData: DataResult<TokenPrice | undefined>;
  sourceToken?: TokenData;
  allowanceData: AllowanceData;
  providerFeeData: DataResult<ProviderFeeData | undefined>;
  isUsingRelayer: boolean;
}) {
  const { sourceChainId, targetChainId, sourceToken, tokenPricesData, allowanceData, providerFeeData, isUsingRelayer } =
    options;

  const feeData = useData(
    async (signal) => {
      console.log('useBridgeFee', {
        signal,
        sourceChainId,
        targetChainId,
        tokenPricesData,
        sourceToken,
        allowanceData,
      });

      const data = await calculateFees({
        signal,
        sourceChainId,
        targetChainId,
        tokenPricesData,
        sourceToken,
        allowanceData,
        isUsingRelayer,
      });

      // console.log('useBridgeFee result', data);

      return data;
    },
    [sourceChainId, tokenPricesData, sourceToken, allowanceData],
  );

  return useMemo((): BridgeFee => {
    const bridgeFees = providerFeeData.data?.hasFees ? providerFeeData.data.totalFeeUsdString || '0' : '0';
    const totalFees =
      feeData.data && feeData.data.sourceFee && feeData.data.targetFee
        ? feeData.data.sourceFee.plus(feeData.data.targetFee).plus(BigNumber(bridgeFees))
        : undefined;

    return {
      feeData,
      totalFees,
    };
  }, [feeData, providerFeeData]);
}
