import { CHAIN_ID_ACALA, CHAIN_ID_ETH, CHAIN_ID_KARURA, CHAIN_ID_MOONBEAM } from '@certusone/wormhole-sdk';
import { ethers } from 'ethers';
import { ACALA_SHOULD_RELAY_URL, CarrierChainId, RELAYER_COMPARE_ASSET } from './consts';
import { TokenData } from './tokenData/helper';
import { TokenPrice } from './tokenPrices';
import { getEvmGasPrice } from './fees';
import { PolkachainTokens } from './tokenData/mrl';
import BigNumber from 'bignumber.js';
import { isCarrierEVMChain, isCarrierPolkaChain, parseAmount } from './web3Utils';
import { needToPayMRLFee } from './polkadot';
import { getCCTPNetworkConfigs } from './cctp';

export type RelayToken = {
  chainId?: CarrierChainId;
  address?: string;
  coingeckoId?: string;
};

export type Relayer = {
  name?: string;
  url?: string;
};

export type FeeScheduleEntryFlat = {
  type: 'flat';
  feeUsd: number;
};

export type FeeScheduleEntryPercent = {
  type: 'percent';
  feePercent: number;
  gasEstimate: number;
};

export type FeeSchedule = {
  // ChainId as a string
  [key: string]: FeeScheduleEntryFlat | FeeScheduleEntryPercent;
};

export type RelayerTokenInfo = {
  supportedTokens?: RelayToken[];
  relayers?: Relayer[];
  feeSchedule?: FeeSchedule;
};

function getRelayAssetInfo(originChain: CarrierChainId, originAsset: string, relayerInfo: RelayerTokenInfo) {
  if (!originChain || !originAsset || !relayerInfo) {
    return null;
  }
  return relayerInfo.supportedTokens?.find(
    (x) => originAsset.toLowerCase() === x.address?.toLowerCase() && originChain === x.chainId,
  );
}

function calculateFeeFormatted(feeUsd: number, originAssetPrice: number, sourceAssetDecimals: number) {
  const sendableDecimals = Math.min(8, sourceAssetDecimals);
  const minimumFee = parseFloat((10 ** -sendableDecimals).toFixed(sendableDecimals));
  const calculatedFee = feeUsd / originAssetPrice;
  return Math.max(minimumFee, calculatedFee).toFixed(sourceAssetDecimals);
}

function calculateFeeUsd(
  info: RelayerTokenInfo,
  comparisonAssetPrice: number,
  targetChain: CarrierChainId,
  gasPrice?: ethers.BigNumber,
) {
  let feeUsd = 0;

  if (info?.feeSchedule) {
    try {
      if (info.feeSchedule[targetChain]?.type === 'flat') {
        feeUsd = (info.feeSchedule[targetChain] as FeeScheduleEntryFlat).feeUsd;
      } else if (info.feeSchedule[targetChain]?.type === 'percent') {
        const entry = info.feeSchedule[targetChain] as FeeScheduleEntryPercent;

        if (!gasPrice) {
          feeUsd = 0;
        } else {
          // Number should be safe as long as we don't modify highGasEstimate to be in the BigInt range
          feeUsd =
            ((Number(entry.gasEstimate) * parseFloat(ethers.utils.formatUnits(gasPrice, 'gwei'))) / 1000000000) *
            comparisonAssetPrice *
            entry.feePercent;
        }
      } else if (targetChain === CHAIN_ID_ACALA || targetChain === CHAIN_ID_KARURA) {
        // ACALA and KARURA doesn't have fee settings.
        // so we set it to 0.5 as other evms
        feeUsd = 0.5;
      }
    } catch (e) {
      console.error(e);
    }
  }

  return feeUsd;
}

function requireGasPrice(targetChain: CarrierChainId) {
  return targetChain === CHAIN_ID_ETH;
}

function isRelayable(originChain: CarrierChainId, originAsset: string, info: RelayerTokenInfo) {
  if (!originChain || !originAsset || !info) {
    return false;
  }

  const tokenRecord = info.supportedTokens?.find(
    (x) => originAsset.toLowerCase() === x.address?.toLowerCase() && originChain === x.chainId,
  );

  return !!(tokenRecord && tokenRecord.address && tokenRecord.chainId && tokenRecord.coingeckoId);
}

export function calculateMRLFee(options: {
  sourceChainId: CarrierChainId;
  targetChainId: CarrierChainId;
  originChainId: CarrierChainId;
  originAddress: string;
  tokenPricesData: TokenPrice;
  decimals: number;
}) {
  const { sourceChainId, targetChainId, originChainId, originAddress, tokenPricesData, decimals } = options;
  const isUsingMRL = needToPayMRLFee(sourceChainId, targetChainId);
  const polkadotTokenData = needToPayMRLFee(sourceChainId, targetChainId)
    ? PolkachainTokens[targetChainId].find(
        (item) =>
          item.originChainId === originChainId && item.oringinAddress.toLowerCase() === originAddress.toLowerCase(),
      )
    : undefined;
  const feeFormatted =
    polkadotTokenData && polkadotTokenData.MRLFees !== '0'
      ? BigNumber(ethers.utils.formatUnits(polkadotTokenData.MRLFees, polkadotTokenData.decimals))
      : undefined;
  const feeFormattedFixed = feeFormatted?.toFixed(decimals);
  const feeParsed = feeFormattedFixed ? parseAmount(feeFormattedFixed, decimals) : undefined;
  const tokenPrice = polkadotTokenData ? tokenPricesData[polkadotTokenData.coingeckoId] : undefined;
  const feeUsd = feeFormatted?.multipliedBy(tokenPrice?.usd || 0).toNumber();
  const usdString = feeUsd?.toFixed(2);

  return {
    feeFormatted: feeFormatted?.toFixed(decimals),
    feeParsed,
    feeUsd,
    usdString,
    isUsingMRL,
  };
}

export async function calculateRelayerFee(options: {
  relayerTokenInfo?: RelayerTokenInfo;
  originAddress: string;
  originChainId: CarrierChainId;
  sourceChainId: CarrierChainId;
  sourceToken: TokenData;
  targetChainId: CarrierChainId;
  tokenPricesData: TokenPrice;
  transferAmountString: string;
}) {
  const {
    relayerTokenInfo,
    originChainId,
    originAddress,
    sourceChainId,
    sourceToken,
    targetChainId,
    tokenPricesData,
    transferAmountString,
  } = options;

  let acalaShouldRelay = false;

  if (sourceChainId === CHAIN_ID_ACALA || sourceChainId === CHAIN_ID_KARURA) {
    let vaaNormalizedAmount: string | undefined = undefined;
    if (transferAmountString && sourceToken !== undefined) {
      try {
        vaaNormalizedAmount = ethers.utils
          .parseUnits(transferAmountString, Math.min(sourceToken.decimals, 8))
          .toString();
      } catch (e) {}
    }
    const url = new URL(ACALA_SHOULD_RELAY_URL);

    if (vaaNormalizedAmount) {
      url.searchParams.append('targetChain', `${targetChainId}`);
      url.searchParams.append('originAsset', originAddress);
      url.searchParams.append('amount', vaaNormalizedAmount);

      const resp = await fetch(url.href);
      const result = await resp.json();

      if (result.shouldRelay) {
        acalaShouldRelay = true;
      }
    }
  }

  const relayerAsset =
    relayerTokenInfo && originChainId && originAddress
      ? getRelayAssetInfo(originChainId, originAddress, relayerTokenInfo)
      : undefined;
  const comparisonAsset = targetChainId ? RELAYER_COMPARE_ASSET[targetChainId] : undefined;
  const coingeckoId = isCarrierPolkaChain(sourceChainId)
    ? PolkachainTokens[sourceChainId]?.find(
        (item) =>
          item.originChainId === originChainId && item.oringinAddress.toLowerCase() === originAddress.toLowerCase(),
      )?.coingeckoId
    : relayerAsset
    ? relayerAsset.coingeckoId
    : undefined;
  const originAssetPrice = coingeckoId ? tokenPricesData[coingeckoId]?.usd : undefined;
  const comparisonAssetPrice = comparisonAsset ? tokenPricesData[comparisonAsset]?.usd : undefined;
  const gasPrice = requireGasPrice(targetChainId) ? await getEvmGasPrice(targetChainId) : undefined;
  const cctpConfigs = getCCTPNetworkConfigs({ sourceChainId: originChainId, targetChainId });

  let feeUsd =
    isCarrierEVMChain(sourceChainId) && isCarrierPolkaChain(targetChainId)
      ? 0
      : relayerTokenInfo && comparisonAssetPrice
      ? calculateFeeUsd(relayerTokenInfo, comparisonAssetPrice, targetChainId, gasPrice)
      : undefined;

  let feeFormatted =
    isCarrierEVMChain(sourceChainId) && isCarrierPolkaChain(targetChainId)
      ? '0'
      : originAssetPrice && feeUsd != null
      ? calculateFeeFormatted(feeUsd, originAssetPrice, sourceToken.decimals)
      : undefined;
  let feeParsed = feeFormatted != null ? parseAmount(feeFormatted, sourceToken.decimals) : undefined;
  let usdString = feeUsd != null ? feeUsd.toFixed(2) : undefined;

  const relayable =
    (isCarrierEVMChain(sourceChainId) && sourceChainId !== CHAIN_ID_MOONBEAM && isCarrierPolkaChain(targetChainId)) ||
    (isCarrierPolkaChain(sourceChainId) && isCarrierEVMChain(targetChainId) && targetChainId !== CHAIN_ID_MOONBEAM)
      ? true
      : cctpConfigs
      ? false
      : relayerTokenInfo != null &&
        isRelayable(originChainId, originAddress, relayerTokenInfo) &&
        feeUsd != null &&
        feeUsd > 0;

  // ACALA and KARURA will do free relay for user, so relayable still true but feeUsd need set to undefined
  if (acalaShouldRelay) {
    feeUsd = undefined;
    feeFormatted = undefined;
    feeParsed = undefined;
    usdString = undefined;
  }

  console.log('relayer fee: ', { feeUsd, feeFormatted, feeParsed: feeParsed?.toString(), usdString, relayable });

  return { feeUsd, feeFormatted, feeParsed, usdString, relayable };
}
