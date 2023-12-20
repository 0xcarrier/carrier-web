import { useCallback, useEffect, useMemo } from 'react';
import { NFTData } from '../utils/tokenData/helper';
import {
  CHAIN_ID_SOLANA,
  getOriginalAssetEth,
  uint8ArrayToHex,
  hexToUint8Array,
  isBytes,
  CHAIN_ID_ETH,
  ChainName,
  ChainId as WormholeChainId,
  CHAIN_ID_MOONBEAM,
  ChainId,
} from '@certusone/wormhole-sdk';
import { CarrierChainId, getNFTBridgeAddressForChain, getTokenBridgeAddressForChain } from '../utils/consts';
import { TokenData } from '../utils/tokenData/helper';
import {
  getEvmProviderWithWormholeChainId,
  isCarrierEVMChain,
  isCarrierPolkaChain,
  tryCarrierHexToNativeString,
  tryCarrierNativeToHexString,
  tryCarrierNativeToUint8Array,
} from '../utils/web3Utils';
import { useData } from './useData';
import { PublicKey } from '@solana/web3.js';
import {
  deriveWrappedMetaKey,
  deriveWrappedMintKey,
} from '@certusone/wormhole-sdk/lib/esm/solana/tokenBridge/accounts/wrapped';
import {
  deriveWrappedMintKey as deriveWrappedMintKeyNFT,
  deriveWrappedMetaKey as deriveWrappedMetaKeyNFT,
  WrappedMeta as WrappedMetaNFT,
} from '@certusone/wormhole-sdk/lib/esm/solana/nftBridge/accounts/wrapped';
import { getAccountData } from '@certusone/wormhole-sdk/lib/esm/solana/utils/account';
import { getSolanaConnection } from '../utils/solana';
import { getOriginalAssetEth as getOriginalAssetEthNFT } from '@certusone/wormhole-sdk/lib/esm/nft_bridge';
import { ethers } from 'ethers';
import uniqWith from 'lodash/uniqWith';
import { errorNeedRetry, runWithErrorRetry } from '../utils/timer';
import { getCluster } from '../utils/env';
import { getTBTCAddressForChain, getWtBTCAddressForChain } from '../utils/tbtc';
import { Bridge__factory, NFTBridge__factory } from '@certusone/wormhole-sdk/lib/esm/ethers-contracts';
import { PolkachainTokens } from '../utils/tokenData/mrl';
import { getCCTPNetworkConfigs, getCCTPNetworkConfigsByChainId } from '../utils/cctp';

export const errorTokenIsNotSupportedOnPolkachain = new Error(
  'This token is not supported on target network, please select another token.',
);

export interface WormholeWrappedNFTInfo {
  isWrapped: boolean;
  chainId: CarrierChainId;
  assetAddress: Uint8Array;
  tokenId?: string;
}

function removeDeprecatedCache() {
  const cache = getTargetAssetsCache();
  const newCache = cache.filter(
    (item) =>
      !(
        item.originChainId === CHAIN_ID_ETH &&
        item.originAddress.toLowerCase() === getTBTCAddressForChain(CHAIN_ID_ETH).toLowerCase() &&
        item.targetChainId === CHAIN_ID_SOLANA &&
        item.targetAddress?.toLowerCase() === getWtBTCAddressForChain(CHAIN_ID_SOLANA).toLowerCase()
      ),
  );
  const cluster = getCluster();

  localStorage.setItem(`${targetAssetsCacheKey}.${cluster}`, JSON.stringify(newCache));
}

const targetAssetsCacheKey = 'targetAssets';

export function getTargetAssetsCache(): TargetAsset[] {
  const cluster = getCluster();
  const cache = localStorage.getItem(`${targetAssetsCacheKey}.${cluster}`);

  return cache ? JSON.parse(cache) : [];
}

function setTargetAssetsCache(assets: TargetAsset[]) {
  const cluster = getCluster();
  const cache = getTargetAssetsCache();

  const newAssets = cache.concat(assets.filter((item) => !!item.targetAddress));

  const uniqAssets = uniqWith(newAssets, (a, b) => {
    return (
      a.originAddress.toLowerCase() === b.originAddress.toLowerCase() &&
      a.originChainId === b.originChainId &&
      a.sourceAddress.toLowerCase() === b.sourceAddress.toLowerCase() &&
      a.sourceChainId === b.sourceChainId &&
      a.targetChainId === b.targetChainId &&
      a.targetAddress === b.targetAddress &&
      a.originTokenId === b.originTokenId
    );
  });

  localStorage.setItem(`${targetAssetsCacheKey}.${cluster}`, JSON.stringify(uniqAssets));
}

export interface TargetAsset {
  originChainId: CarrierChainId;
  originAddress: string;
  originTokenId?: string;
  targetChainId: CarrierChainId;
  targetAddress: string | null;
  sourceChainId: CarrierChainId;
  sourceAddress: string;
  sourceTokenId?: string;
}

interface OriginAsset {
  originChainId: CarrierChainId;
  originAddress: string;
  originTokenId?: string;
  sourceChainId: CarrierChainId;
  sourceAddress: string;
}

async function getSolanaWrappedMeta(mint: string, isNFT: boolean): Promise<WormholeWrappedNFTInfo> {
  const mintKey = new PublicKey(mint);
  const connection = getSolanaConnection();
  const tokenBridgeProgramId = getTokenBridgeAddressForChain(CHAIN_ID_SOLANA);
  const nftBridgeProgramId = getNFTBridgeAddressForChain(CHAIN_ID_SOLANA);
  const parsedAccount = await connection.getAccountInfo(
    isNFT ? deriveWrappedMetaKeyNFT(nftBridgeProgramId, mintKey) : deriveWrappedMetaKey(tokenBridgeProgramId, mintKey),
    { commitment: 'confirmed' },
  );
  const wrappedMeta = parsedAccount
    ? (isNFT ? WrappedMetaNFT : WrappedMeta).deserialize(getAccountData(parsedAccount))
    : undefined;

  return wrappedMeta == null
    ? {
        isWrapped: false,
        chainId: CHAIN_ID_SOLANA,
        assetAddress: mintKey.toBytes(),
      }
    : {
        isWrapped: true,
        chainId: wrappedMeta.chain as CarrierChainId,
        assetAddress: Uint8Array.from(wrappedMeta.tokenAddress),
        tokenId: isNFT && 'tokenId' in wrappedMeta ? wrappedMeta.tokenId.toString() : undefined,
      };
}

// refer to https://github.com/wormhole-foundation/wormhole/blob/c19e6b972e4c7d5fdfe0974d04c71e5023749588/sdk/js/src/solana/tokenBridge/accounts/wrapped.ts#L67
// the origin code check data length == 35, but the newest data length is not 35, so we need to wait them to fix this error.
export class WrappedMeta {
  chain: ChainId;
  tokenAddress: Uint8Array;
  originalDecimals: number;

  constructor(chain: ChainId, tokenAddress: Uint8Array, originalDecimals: number) {
    this.chain = chain;
    this.tokenAddress = tokenAddress;
    this.originalDecimals = originalDecimals;
  }
  static deserialize(data: Buffer) {
    const chain = data.readUInt16LE(0);
    const tokenAddress = data.subarray(2, 34);
    const originalDecimals = data.readUInt8(34);
    return new WrappedMeta(chain as ChainId, tokenAddress, originalDecimals);
  }
}

export async function getSolanaForeignAsset(
  originAsset: { originChainId: CarrierChainId; originAddress: string; originTokenId?: string },
  isNFT: boolean,
): Promise<string | null> {
  if (isNFT) {
    // we don't require NFT accounts to exist, so don't check them.
    const nftBridgeProgramId = getNFTBridgeAddressForChain(CHAIN_ID_SOLANA);

    return originAsset.originTokenId
      ? originAsset.originChainId === CHAIN_ID_SOLANA
        ? originAsset.originAddress
        : deriveWrappedMintKeyNFT(
            nftBridgeProgramId,
            originAsset.originChainId,
            originAsset.originAddress,
            BigInt(
              isBytes(originAsset.originTokenId)
                ? ethers.BigNumber.from(originAsset.originTokenId).toString()
                : originAsset.originTokenId,
            ),
          ).toString()
      : null;
  }

  const tokenBridgeProgramId = getTokenBridgeAddressForChain(CHAIN_ID_SOLANA);
  const mint =
    originAsset.originChainId === CHAIN_ID_SOLANA
      ? { publicKey: new PublicKey(originAsset.originAddress), isOriginSol: true }
      : {
          publicKey: deriveWrappedMintKey(tokenBridgeProgramId, originAsset.originChainId, originAsset.originAddress),
          isOriginSol: false,
        };
  const ethTbtcAddress = getTBTCAddressForChain(CHAIN_ID_ETH);
  const solWrappedTbtcAddress = getWtBTCAddressForChain(CHAIN_ID_SOLANA);
  const solTbtcAddress = getTBTCAddressForChain(CHAIN_ID_SOLANA);
  const tbtcMint =
    originAsset.originChainId === CHAIN_ID_ETH &&
    originAsset.originAddress.toLowerCase() === ethTbtcAddress.toLowerCase()
      ? mint.publicKey.toBase58().toLowerCase() === solWrappedTbtcAddress.toLowerCase()
        ? solTbtcAddress
        : undefined
      : undefined;
  const mintPubkey = mint.publicKey;

  if (tbtcMint) {
    return tbtcMint;
  } else {
    const connection = getSolanaConnection();
    const wrappedMetaAccount = await connection.getAccountInfo(deriveWrappedMetaKey(tokenBridgeProgramId, mintPubkey), {
      commitment: 'confirmed',
    });
    const wrappedMeta = wrappedMetaAccount ? WrappedMeta.deserialize(getAccountData(wrappedMetaAccount)) : null;

    return mint.isOriginSol || wrappedMeta != null ? mintPubkey.toBase58() : null;
  }
}

export async function getForeignAssetEthNFT(
  nftBridgeAddress: string,
  provider: ethers.Signer | ethers.providers.Provider,
  originChain: CarrierChainId,
  originAsset: Uint8Array,
): Promise<string | null> {
  const tokenBridge = NFTBridge__factory.connect(nftBridgeAddress, provider);

  if (originChain === CHAIN_ID_SOLANA) {
    // All NFTs from Solana are minted to the same address, the originAsset is encoded as the tokenId as
    // BigNumber.from(new PublicKey(originAsset).toBytes()).toString()
    const addr = await tokenBridge.wrappedAsset(
      originChain,
      '0x0101010101010101010101010101010101010101010101010101010101010101',
    );

    return addr;
  }

  return await tokenBridge.wrappedAsset(originChain, originAsset);
}

export async function getForeignAssetEth(
  tokenBridgeAddress: string,
  provider: ethers.Signer | ethers.providers.Provider,
  originChain: CarrierChainId | ChainName,
  originAsset: Uint8Array,
): Promise<string | null> {
  const tokenBridge = Bridge__factory.connect(tokenBridgeAddress, provider);

  return await tokenBridge.wrappedAsset(originChain, originAsset);
}

export async function getEvmForeignAsset(
  originAsset: { originChainId: CarrierChainId; originAddress: string; originTokenId?: string },
  targetChainId: CarrierChainId,
  isNFT: boolean,
): Promise<string | null | undefined> {
  const provider = getEvmProviderWithWormholeChainId(targetChainId);
  const ethTbtcAddress = getTBTCAddressForChain(CHAIN_ID_ETH);
  const targetChainWtbtcAddress = getWtBTCAddressForChain(targetChainId);
  const targetChainTbtcAddress = getTBTCAddressForChain(targetChainId);
  const cctpConfig = getCCTPNetworkConfigs({ sourceChainId: originAsset.originChainId, targetChainId });

  const foreignAssetPromise =
    originAsset.originChainId === targetChainId
      ? Promise.resolve(originAsset.originAddress)
      : isNFT
      ? getForeignAssetEthNFT(
          getNFTBridgeAddressForChain(targetChainId),
          provider,
          originAsset.originChainId,
          hexToUint8Array(tryCarrierNativeToHexString(originAsset.originAddress, originAsset.originChainId)),
        )
      : cctpConfig &&
        cctpConfig.cctpSourceNetworkConfigs.usdcContractAddress.toLowerCase() ===
          originAsset.originAddress.toLowerCase()
      ? Promise.resolve(cctpConfig.cctpTargetNetworkConfigs.usdcContractAddress)
      : getForeignAssetEth(
          getTokenBridgeAddressForChain(targetChainId),
          provider,
          originAsset.originChainId,
          hexToUint8Array(tryCarrierNativeToHexString(originAsset.originAddress, originAsset.originChainId)),
        );
  const foreignAsset = await foreignAssetPromise;
  const tbtcForeignAsset =
    originAsset.originChainId === CHAIN_ID_ETH &&
    originAsset.originAddress.toLowerCase() === ethTbtcAddress.toLowerCase()
      ? foreignAsset?.toLowerCase() === targetChainWtbtcAddress.toLowerCase()
        ? targetChainTbtcAddress
        : undefined
      : undefined;

  return tbtcForeignAsset || foreignAsset;
}

export function getPolkadotForeignAsset(
  originAsset: { originChainId: CarrierChainId; originAddress: string; originTokenId?: string },
  targetChainId: CarrierChainId,
  isNFT: boolean,
) {
  if (isNFT) {
    throw new Error('NFT bridge is not supported on target network.');
  }

  const foreignAsset = PolkachainTokens[targetChainId].find(
    (item) =>
      item.originChainId === originAsset.originChainId &&
      item.oringinAddress.toLowerCase() === originAsset.originAddress.toLowerCase(),
  )?.assetId;

  if (isCarrierPolkaChain(targetChainId) && !foreignAsset) {
    throw errorTokenIsNotSupportedOnPolkachain;
  }

  return foreignAsset;
}

async function getOriginAssetOnChain(options: {
  sourceChainId: CarrierChainId;
  token: { tokenId?: string; tokenAddress: string };
  isNFT: boolean;
}): Promise<OriginAsset> {
  const { sourceChainId, token, isNFT } = options;

  const cctpConfig = getCCTPNetworkConfigsByChainId({ chainId: sourceChainId });
  const tbtcAddress = getTBTCAddressForChain(sourceChainId);
  const ethTbtcAddress = getTBTCAddressForChain(CHAIN_ID_ETH);

  let originAsset: WormholeWrappedNFTInfo | undefined;

  if (isCarrierEVMChain(sourceChainId)) {
    const provider = getEvmProviderWithWormholeChainId(sourceChainId);

    const promise = isNFT
      ? token.tokenId
        ? getOriginalAssetEthNFT(
            getNFTBridgeAddressForChain(sourceChainId),
            provider,
            token.tokenAddress,
            token.tokenId,
            sourceChainId as WormholeChainId,
          )
        : Promise.resolve(undefined)
      : cctpConfig && cctpConfig.usdcContractAddress.toLowerCase() === token.tokenAddress.toLowerCase()
      ? Promise.resolve({
          isWrapped: false,
          chainId: sourceChainId,
          assetAddress: tryCarrierNativeToUint8Array(token.tokenAddress, sourceChainId),
        })
      : tbtcAddress && tbtcAddress.toLowerCase() === token.tokenAddress.toLowerCase()
      ? Promise.resolve({
          isWrapped: true,
          chainId: CHAIN_ID_ETH,
          assetAddress: tryCarrierNativeToUint8Array(ethTbtcAddress, CHAIN_ID_ETH),
        })
      : getOriginalAssetEth(
          getTokenBridgeAddressForChain(sourceChainId),
          provider,
          token.tokenAddress,
          sourceChainId as WormholeChainId,
        );

    originAsset = await promise;
  } else if (sourceChainId === CHAIN_ID_SOLANA) {
    originAsset =
      tbtcAddress && tbtcAddress.toLowerCase() === token.tokenAddress.toLowerCase()
        ? {
            isWrapped: true,
            chainId: CHAIN_ID_ETH,
            assetAddress: tryCarrierNativeToUint8Array(ethTbtcAddress, CHAIN_ID_ETH),
          }
        : await getSolanaWrappedMeta(token.tokenAddress, isNFT);
  } else if (isCarrierPolkaChain(sourceChainId)) {
    const mrlTokenData = PolkachainTokens[sourceChainId]?.find((item) => item.assetId === token.tokenAddress);
    const tokenAddressOnMoonbeam = mrlTokenData?.tokenAddressOnMoonbeam;

    if (tokenAddressOnMoonbeam) {
      const moonbeamProvider = getEvmProviderWithWormholeChainId(CHAIN_ID_MOONBEAM);
      originAsset = await getOriginalAssetEth(
        getTokenBridgeAddressForChain(CHAIN_ID_MOONBEAM),
        moonbeamProvider,
        tokenAddressOnMoonbeam,
        CHAIN_ID_MOONBEAM as WormholeChainId,
      );
    }
  }

  if (!originAsset) {
    throw new Error("can't find origin asset");
  }

  return {
    originChainId: originAsset.chainId,
    originAddress: tryCarrierHexToNativeString(uint8ArrayToHex(originAsset.assetAddress), originAsset.chainId),
    originTokenId: originAsset.tokenId,
    sourceChainId,
    sourceAddress: token.tokenAddress,
  };
}

async function getTargetAssetOnChain(options: {
  sourceChainId: CarrierChainId;
  targetChainId: CarrierChainId;
  token: TokenData;
  isNFT: boolean;
}): Promise<TargetAsset> {
  const { sourceChainId, targetChainId, token, isNFT } = options;

  const originAsset = await getOriginAssetOnChain({ sourceChainId, token, isNFT });

  const targetAsset = isCarrierEVMChain(targetChainId)
    ? await getEvmForeignAsset(originAsset, targetChainId, isNFT)
    : targetChainId === CHAIN_ID_SOLANA
    ? await getSolanaForeignAsset(originAsset, isNFT)
    : isCarrierPolkaChain(targetChainId)
    ? getPolkadotForeignAsset(originAsset, targetChainId, isNFT)
    : undefined;

  return {
    ...originAsset,
    targetChainId,
    targetAddress: !targetAsset || targetAsset == ethers.constants.AddressZero ? null : targetAsset,
  };
}

async function getTargetAsset(options: {
  sourceChainId: CarrierChainId;
  targetChainId: CarrierChainId;
  sourceToken: NFTData;
  isNFT: boolean;
}): Promise<TargetAsset> {
  const { sourceChainId, targetChainId, sourceToken, isNFT } = options;

  // we need to remove wtbtc target address from solana and refetch the tbtc address
  removeDeprecatedCache();

  const cache = getTargetAssetsCache();
  const targetAssetCache = cache.find((cacheItem) => {
    const tokenIdMatched = isNFT
      ? sourceToken.tokenId && cacheItem.sourceTokenId
        ? sourceToken.tokenId === cacheItem.sourceTokenId
        : false
      : true;

    return (
      cacheItem.sourceChainId === sourceChainId &&
      cacheItem.sourceAddress.toLowerCase() === sourceToken.tokenAddress.toLowerCase() &&
      cacheItem.targetChainId === targetChainId &&
      tokenIdMatched
    );
  });

  if (targetAssetCache) {
    return targetAssetCache;
  }

  const targetAssetsOnChain = await getTargetAssetOnChain({
    sourceChainId,
    targetChainId,
    token: sourceToken,
    isNFT,
  });

  if (targetAssetsOnChain) {
    setTargetAssetsCache([targetAssetsOnChain]);
  }

  return targetAssetsOnChain;
}

export function useTargetAsset(options: {
  sourceChainId?: CarrierChainId;
  sourceToken?: NFTData | undefined;
  targetChainId: CarrierChainId;
  isNFT: boolean;
}) {
  const { sourceChainId, sourceToken, targetChainId, isNFT } = options;

  const targetAsset = useData(
    async (signal, _, retryTimes) => {
      // sourceChainId will trigger sourceTokens refresh
      // so we only need to refresh data when sourceTokens changed

      if (sourceChainId && targetChainId && sourceToken) {
        const maxRetry = retryTimes !== 0 ? 30 : 0;

        return runWithErrorRetry(
          async ({ retryCount }) => {
            const targetAssetData = await getTargetAsset({ sourceChainId, targetChainId, sourceToken, isNFT });
            if (retryCount < maxRetry && !targetAssetData.targetAddress) {
              throw errorNeedRetry;
            }

            return targetAssetData;
          },
          { signal, maxRetry, backoffStrategyFactor: 1.04 },
        );
      }

      // console.log('useTargetAssets result', data);
    },
    [targetChainId, sourceToken, isNFT],
  );

  useEffect(() => {
    // reset when selected token/targetChainId changed or error happened
    targetAsset.resetRetryTimes();
  }, [sourceToken, targetAsset.error, targetChainId]);

  const refresh = useCallback(() => {
    targetAsset.retry();
  }, [targetAsset.retry]);

  return useMemo(() => {
    return {
      ...targetAsset,
      refresh,
    };
  }, [targetAsset, refresh]);
}
