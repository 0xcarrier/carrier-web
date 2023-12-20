import BigNumber from 'bignumber.js';
import { useMemo } from 'react';
import { DataResult, getPendingPromise, useData } from '../../../hooks/useData';
import { calculateFeesInUSD } from '../../../utils/fees';
import { TokenData } from '../../../utils/tokenData/helper';
import { TokenPrice } from '../../../utils/tokenPrices';
import { CarrierChainId } from '../../../utils/consts';

async function calculateFees(options: {
  signal: AbortSignal;
  sourceChainId?: CarrierChainId;
  targetChainId: CarrierChainId;
  tokenPricesData: DataResult<TokenPrice | undefined>;
  sourceToken?: TokenData;
}) {
  const { signal, sourceChainId, targetChainId, tokenPricesData, sourceToken } = options;

  if (tokenPricesData.loading) {
    return getPendingPromise(signal);
  }

  if (sourceChainId && tokenPricesData.data && sourceToken) {
    const sourceFee = await calculateFeesInUSD({
      isSource: true,
      chainId: sourceChainId,
      tokenPrices: tokenPricesData.data,
      isNFT: true,
      approvalRequired: true,
    });

    const targetFee = await calculateFeesInUSD({
      isSource: false,
      chainId: targetChainId,
      tokenPrices: tokenPricesData.data,
      isNFT: true,
    });

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
}) {
  const { sourceChainId, targetChainId, sourceToken, tokenPricesData } = options;

  const feeData = useData(
    async (signal) => {
      console.log('useBridgeFee', {
        signal,
        sourceChainId,
        targetChainId,
        tokenPricesData,
        sourceToken,
      });

      const data = await calculateFees({
        signal,
        sourceChainId,
        targetChainId,
        tokenPricesData,
        sourceToken,
      });

      // console.log('useBridgeFee result', data);

      return data;
    },
    [sourceChainId, tokenPricesData, sourceToken],
  );

  return useMemo((): BridgeFee => {
    const totalFees =
      feeData.data && feeData.data.sourceFee && feeData.data.targetFee
        ? feeData.data.sourceFee.plus(feeData.data.targetFee)
        : undefined;

    return {
      feeData,
      totalFees,
    };
  }, [feeData]);
}
