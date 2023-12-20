import { DataResult, getPendingPromise, useData } from '../../../hooks/useData';
import { CarrierChainId, RELAYER_INFO_URL } from '../../../utils/consts';
import { TokenData } from '../../../utils/tokenData/helper';
import { TokenPrice } from '../../../utils/tokenPrices';
import { RelayerTokenInfo, calculateRelayerFee } from '../../../utils/relayer';
import { ProviderFeeData } from '../../../hooks/useProviderFeeData';

async function computeRelayerData(options: {
  signal: AbortSignal;
  sourceChainId?: CarrierChainId;
  sourceToken?: TokenData;
  relayerInfo: DataResult<RelayerTokenInfo>;
  targetChainId: CarrierChainId;
  tokenPricesData: DataResult<TokenPrice | undefined>;
  transferAmountString: string;
}): Promise<ProviderFeeData | undefined> {
  const { signal, sourceChainId, sourceToken, relayerInfo, targetChainId, tokenPricesData, transferAmountString } =
    options;

  if (relayerInfo.error) {
    throw relayerInfo.error;
  }

  if (tokenPricesData.error) {
    throw tokenPricesData.error;
  }

  if (relayerInfo.loading || tokenPricesData.loading) {
    return getPendingPromise(signal);
  }

  if (sourceChainId && sourceToken && tokenPricesData.data) {
    const relayerFee = await calculateRelayerFee({
      relayerTokenInfo: relayerInfo.data,
      originAddress: sourceToken.tokenAddress,
      originChainId: sourceChainId,
      sourceChainId,
      sourceToken,
      targetChainId,
      tokenPricesData: tokenPricesData.data,
      transferAmountString,
    });

    return {
      hasFees: relayerFee.relayable,
      totalFeeFormatted: relayerFee.feeFormatted,
      totalFeeParsed: relayerFee.feeParsed,
      totalFeeUsd: relayerFee.feeUsd,
      totalFeeUsdString: relayerFee.usdString,
      relayable: relayerFee.relayable,
      relayerFeeFormatted: relayerFee.feeFormatted,
      relayerFeeParsed: relayerFee.feeParsed,
      relayerFeeUsd: relayerFee.feeUsd,
      relayerUsdString: relayerFee.usdString,
      isUsingMRL: false,
      MRLFeeUsd: undefined,
      MRLFeeFormatted: undefined,
      MRLFeeParsed: undefined,
      MRLUsdString: undefined,
    };
  }
}

export function useProviderFeeData(options: {
  sourceChainId?: CarrierChainId;
  sourceToken?: TokenData;
  targetChainId: CarrierChainId;
  tokenPricesData: DataResult<TokenPrice | undefined>;
  transferAmountString: string;
}) {
  const { sourceChainId, sourceToken, targetChainId, tokenPricesData, transferAmountString } = options;
  // only need to fetch relayer settings from wormhole once
  const relayerInfo = useData(async () => {
    const resp = RELAYER_INFO_URL ? await fetch(RELAYER_INFO_URL) : undefined;
    const data: RelayerTokenInfo = resp ? await resp.json() : undefined;

    return data;
  }, []);

  return useData(
    async (signal) => {
      console.log('computeRelayerData', {
        sourceChainId,
        sourceToken,
        relayerInfo,
        targetChainId,
        tokenPricesData,
        transferAmountString,
      });

      const relayerData = await computeRelayerData({
        signal,
        sourceChainId,
        sourceToken,
        relayerInfo,
        targetChainId,
        tokenPricesData,
        transferAmountString,
      });

      // console.log('computeRelayerData result', relayerData);

      return relayerData;
    },
    [sourceChainId, sourceToken, relayerInfo, targetChainId, tokenPricesData, transferAmountString],
  );
}
