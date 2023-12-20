import { DataResult, getPendingPromise, useData } from './useData';
import { CarrierChainId, RELAYER_INFO_URL } from '../utils/consts';
import { TokenData } from '../utils/tokenData/helper';
import { TokenPrice } from '../utils/tokenPrices';
import { TargetAsset } from './useTargetAsset';
import { RelayerTokenInfo, calculateRelayerFee, calculateMRLFee } from '../utils/relayer';
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';

export interface BaseProviderFeeData {
  totalFeeUsd: number | undefined;
  totalFeeFormatted: string | undefined;
  totalFeeParsed: ethers.BigNumber | undefined;
  totalFeeUsdString: string | undefined;
  hasFees: boolean;
}

interface RelayerData {
  relayable: boolean;
  relayerFeeUsd: number | undefined;
  relayerFeeFormatted: string | undefined;
  relayerFeeParsed: ethers.BigNumber | undefined;
  relayerUsdString: string | undefined;
}

interface MRLData {
  MRLFeeUsd: number | undefined;
  MRLFeeFormatted: string | undefined;
  MRLFeeParsed: ethers.BigNumber | undefined;
  MRLUsdString: string | undefined;
  isUsingMRL: boolean;
}

export interface ProviderFeeData extends BaseProviderFeeData, RelayerData, MRLData {}

async function computeProviderFeeData(options: {
  signal: AbortSignal;
  sourceChainId?: CarrierChainId;
  sourceToken?: TokenData;
  relayerInfo: DataResult<RelayerTokenInfo>;
  targetAssetData: DataResult<TargetAsset | undefined>;
  targetChainId: CarrierChainId;
  tokenPricesData: DataResult<TokenPrice | undefined>;
  transferAmountString: string;
  isUsingRelayer: boolean;
}): Promise<ProviderFeeData | undefined> {
  const {
    signal,
    sourceChainId,
    sourceToken,
    relayerInfo,
    targetAssetData,
    targetChainId,
    tokenPricesData,
    transferAmountString,
    isUsingRelayer,
  } = options;

  if (relayerInfo.error) {
    throw relayerInfo.error;
  }

  if (tokenPricesData.error) {
    throw tokenPricesData.error;
  }

  if (targetAssetData.error) {
    throw targetAssetData.error;
  }

  if (relayerInfo.loading || tokenPricesData.loading || targetAssetData.loading) {
    return getPendingPromise(signal);
  }

  if (sourceChainId && sourceToken && tokenPricesData.data && targetAssetData.data) {
    const relayerFee = await calculateRelayerFee({
      relayerTokenInfo: relayerInfo.data,
      originAddress: targetAssetData.data.originAddress,
      originChainId: targetAssetData.data.originChainId,
      sourceChainId,
      sourceToken,
      targetChainId,
      tokenPricesData: tokenPricesData.data,
      transferAmountString,
    });
    const MRLFee = calculateMRLFee({
      sourceChainId,
      targetChainId,
      originChainId: targetAssetData.data.originChainId,
      originAddress: targetAssetData.data.originAddress,
      tokenPricesData: tokenPricesData.data,
      decimals: sourceToken.decimals,
    });
    const totalFeeUsd = (relayerFee.feeUsd || 0) + (MRLFee.feeUsd || 0);
    const totalFeeFormatted =
      relayerFee.feeFormatted || MRLFee.feeFormatted
        ? BigNumber(relayerFee.feeFormatted || '0')
            .plus(BigNumber(MRLFee.feeFormatted || '0'))
            .toFormat()
        : undefined;
    const totalFeeParsed =
      relayerFee.feeParsed || MRLFee.feeParsed
        ? (relayerFee.feeParsed || ethers.BigNumber.from(0)).add(MRLFee.feeParsed || ethers.BigNumber.from(0))
        : undefined;
    const totalFeeUsdString = totalFeeUsd.toFixed(2);
    const hasFees = (isUsingRelayer && relayerFee.relayable) || MRLFee.isUsingMRL;

    console.log(
      'totalFeeParsed',
      hasFees,
      relayerFee,
      MRLFee,
      totalFeeFormatted,
      totalFeeParsed?.toString(),
      totalFeeUsdString,
      sourceToken.decimals,
    );

    return {
      totalFeeUsd,
      totalFeeFormatted,
      totalFeeUsdString,
      totalFeeParsed,
      hasFees,
      relayable: relayerFee.relayable,
      relayerFeeUsd: relayerFee.feeUsd,
      relayerFeeFormatted: relayerFee.feeFormatted,
      relayerUsdString: relayerFee.usdString,
      relayerFeeParsed: relayerFee.feeParsed,
      MRLFeeUsd: MRLFee.feeUsd,
      MRLFeeFormatted: MRLFee.feeFormatted,
      MRLUsdString: MRLFee.usdString,
      MRLFeeParsed: MRLFee.feeParsed,
      isUsingMRL: MRLFee.isUsingMRL,
    };
  }
}

export function useProviderFeeData(options: {
  sourceChainId?: CarrierChainId;
  sourceToken?: TokenData;
  targetChainId: CarrierChainId;
  targetAssetData: DataResult<TargetAsset | undefined>;
  tokenPricesData: DataResult<TokenPrice | undefined>;
  transferAmountString: string;
  isUsingRelayer: boolean;
}) {
  const {
    sourceChainId,
    sourceToken,
    targetAssetData,
    targetChainId,
    tokenPricesData,
    transferAmountString,
    isUsingRelayer,
  } = options;
  // only need to fetch relayer settings from wormhole once
  const relayerInfo = useData(async () => {
    const resp = RELAYER_INFO_URL ? await fetch(RELAYER_INFO_URL) : undefined;
    const data: RelayerTokenInfo = resp ? await resp.json() : undefined;

    return data;
  }, []);

  const result = useData(
    async (signal) => {
      console.log('computeProviderFeeData', {
        sourceChainId,
        sourceToken,
        relayerInfo,
        targetAssetData,
        targetChainId,
        tokenPricesData,
        transferAmountString,
        isUsingRelayer,
      });

      const relayerData = await computeProviderFeeData({
        signal,
        sourceChainId,
        sourceToken,
        relayerInfo,
        targetAssetData,
        targetChainId,
        tokenPricesData,
        transferAmountString,
        isUsingRelayer,
      });

      // console.log('computeProviderFeeData result', relayerData);

      return relayerData;
    },
    [
      sourceChainId,
      sourceToken,
      relayerInfo,
      targetAssetData,
      targetChainId,
      tokenPricesData,
      transferAmountString,
      isUsingRelayer,
    ],
  );

  return result;
}
