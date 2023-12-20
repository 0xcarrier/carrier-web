import { CHAIN_ID_SOLANA } from '@certusone/wormhole-sdk';
import { useData } from '../../../hooks/useData';
import {
  getEvmForeignAsset,
  getPolkadotForeignAsset,
  getSolanaForeignAsset,
  getTargetAssetsCache,
} from '../../../hooks/useTargetAsset';
import { ethers } from 'ethers';
import { errorNeedRetry, runWithErrorRetry } from '../../../utils/timer';
import { CarrierChainId, MOONBEAM_PARACHAIN_ID } from '../../../utils/consts';
import { isCarrierEVMChain, isCarrierPolkaChain } from '../../../utils/web3Utils';
import { ParachainBridgeType, ParsedParachainTxHash } from '../../../utils/polkadot';
import { PolkachainTokens } from '../../../utils/tokenData/mrl';

export interface TargetAsset {
  originChainId: CarrierChainId;
  originAddress: string;
  originTokenId?: string;
  targetChainId: CarrierChainId;
  targetAddress: string | null;
}

async function getTargetAssetOnChain(options: {
  originChainId: CarrierChainId;
  originAddress: string;
  originTokenId?: string;
  targetChainId: CarrierChainId;
}): Promise<TargetAsset> {
  const { originChainId, originAddress, targetChainId, originTokenId } = options;
  const isNFT = !!originTokenId;

  const targetAsset = isCarrierEVMChain(targetChainId)
    ? await getEvmForeignAsset({ originChainId, originAddress, originTokenId }, targetChainId, isNFT)
    : targetChainId === CHAIN_ID_SOLANA
    ? await getSolanaForeignAsset({ originChainId, originAddress, originTokenId }, isNFT)
    : isCarrierPolkaChain(targetChainId)
    ? getPolkadotForeignAsset({ originChainId, originAddress, originTokenId }, targetChainId, isNFT)
    : undefined;

  return {
    ...options,
    targetAddress: !targetAsset || targetAsset == ethers.constants.AddressZero ? null : targetAsset,
  };
}

async function getTargetAsset(options: {
  originChainId: CarrierChainId;
  originAddress: string;
  originTokenId?: string;
  targetChainId: CarrierChainId;
}) {
  const { originChainId, originAddress, originTokenId, targetChainId } = options;

  const cache = getTargetAssetsCache();
  const targetAssetCache = cache.find((cacheItem) => {
    const isTokenIdMatched = originTokenId
      ? cacheItem.originTokenId
        ? originTokenId === cacheItem.originTokenId
        : false
      : true;

    return (
      cacheItem.originChainId === originChainId &&
      cacheItem.originAddress.toLowerCase() === originAddress.toLowerCase() &&
      cacheItem.targetChainId === targetChainId &&
      isTokenIdMatched
    );
  });

  const targetAssetsOnChain = !targetAssetCache
    ? await getTargetAssetOnChain({
        originChainId,
        originAddress,
        originTokenId,
        targetChainId,
      })
    : undefined;

  // we suppose target asset here should be cache before,
  // unless user change their device to redeem,
  // also we lack of the source token info here
  // so we don't cache asset here.

  return targetAssetCache || targetAssetsOnChain;
}

interface TargetAssetWithOriginData {
  originChainId?: CarrierChainId;
  originAddress?: string;
  originTokenId?: string;
  targetChainId?: CarrierChainId;
  xcmTxHash?: ParsedParachainTxHash;
}

export function useTargetAssetWithOriginData(options: TargetAssetWithOriginData) {
  const { originChainId, originAddress, originTokenId, targetChainId, xcmTxHash } = options;

  const targetAsset = useData(
    async (signal, _, retryTimes) => {
      console.log('useTargetAssetWithOriginData', {
        originChainId,
        originAddress,
        originTokenId,
        targetChainId,
        xcmTxHash,
      });

      if (originChainId && originAddress && targetChainId) {
        const maxRetry = retryTimes !== 0 ? 30 : 0;

        const data = await runWithErrorRetry(
          async ({ retryCount }) => {
            const targetAssetData = await getTargetAsset({
              originChainId,
              originAddress,
              originTokenId,
              targetChainId,
            });

            if (retryCount < maxRetry && (!targetAssetData || !targetAssetData.targetAddress)) {
              throw errorNeedRetry;
            }

            return targetAssetData;
          },
          { signal, maxRetry, backoffStrategyFactor: 1.04 },
        );

        // console.log('useTargetAssets result', data);

        return data;
      } else if (xcmTxHash) {
        if (xcmTxHash.bridgeType === ParachainBridgeType.XCM && 'sourceAssetId' in xcmTxHash) {
          const { sourceAssetId, sourceParachainId, targetAssetId, targetParachainId } = xcmTxHash;

          if (targetParachainId === MOONBEAM_PARACHAIN_ID) {
            const sourceToken = PolkachainTokens[sourceParachainId]?.find((item) => item.assetId === sourceAssetId);

            if (!sourceToken) {
              throw new Error("can't find source token");
            }

            return {
              originChainId: sourceToken.originChainId,
              originAddress: sourceToken.oringinAddress,
              targetChainId: targetParachainId,
              targetAddress: targetAssetId,
            };
          } else {
            const targetToken = PolkachainTokens[targetParachainId]?.find((item) => item.assetId === targetAssetId);

            if (!targetToken) {
              throw new Error("can't find target token");
            }

            return {
              originChainId: targetToken.originChainId,
              originAddress: targetToken.oringinAddress,
              targetChainId: targetParachainId,
              targetAddress: targetAssetId,
            };
          }
        }
      }
    },
    [originChainId, originAddress, originTokenId, targetChainId, xcmTxHash],
  );

  return targetAsset;
}
