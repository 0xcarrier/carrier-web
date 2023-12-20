import produce from 'immer';
import { ExtractedMintInfo } from '../solana';
import { isCarrierEVMChain, safeIPFS } from '../web3Utils';
import uniq from 'lodash/uniq';
import { getCluster } from '../env';
import { CHAIN_ID_SOLANA } from '@certusone/wormhole-sdk';
import { ethers } from 'ethers';
import { PublicKey } from '@solana/web3.js';
import { CarrierChainId } from '../consts';

export interface TokenData {
  ownerAddress: string;
  tokenAddress: string;
  amount: string;
  decimals: number;
  uiAmount: number;
  uiAmountString: string;
  symbol?: string;
  name?: string;
  logo?: string;
  isNativeAsset?: boolean;
  // this one only affect the UI presentation
  // the above one will affect transaction and approval logic
  isUINativeAsset?: boolean;
  mintAccount?: ExtractedMintInfo; // only for solana mint account
}

// these all are optional so NFT could share TokenSelectors
export interface NFTData extends TokenData {
  tokenId?: string;
  uri?: string;
  animation_url?: string | null;
  external_url?: string | null;
  image?: string;
  image_256?: string;
  nftName?: string;
  description?: string;
}

export interface NFTMetaData {
  image: string;
  name: string;
  image_256?: string;
  external_url?: string;
  animation_url?: string;
  description?: string;
  properties?: {
    [key: string]: string | number | object | (string | number | object)[];
  };
}

export function parseNFTMetaData(data: any) {
  const image = data?.properties?.image?.description || data?.image || data;
  const imageParsed = image ? safeIPFS(image) : typeof data === 'string' ? data : '';
  const imageCompressed = `https://image-proxy.svc.prod.covalenthq.com/cdn-cgi/image/width=256,fit/${imageParsed}`;
  const name = data?.properties?.name?.description || data?.name;
  const description = data?.properties?.description?.description || data?.description;
  const properties = data?.properties?.properties?.description || data?.properties;
  const externalUrl = data?.external_url;
  const animationUrl = data?.animation_url;

  return {
    image: imageParsed,
    image_256: imageCompressed,
    name: name != null ? name : 'Unknown',
    external_url: externalUrl,
    animation_url: animationUrl,
    description,
    properties,
  };
}

export async function getNFTMetaData(tokenURI: string): Promise<NFTMetaData> {
  const url = tokenURI ? safeIPFS(tokenURI) : undefined;
  const resp = url ? await fetch(url) : undefined;

  try {
    const respJson = resp ? await resp.json() : undefined;

    const metaData = parseNFTMetaData(respJson);

    return metaData;
  } catch (e) {
    console.error(e);

    return { image: tokenURI, name: 'Unknown token' };
  }
}

export interface TokenCacheData {
  contractAddress: string;
  tokenIds?: string[];
}

function generateLocalStorageKey(chainId: number, walletAddress: string, isNFT: boolean) {
  const cluster = getCluster();

  return `${isNFT ? 'nftContracts' : 'tokenContracts'}.${chainId}.${walletAddress}.${cluster}`;
}

export function getTokenContractAddressFromLocal(options: {
  chainId: number;
  walletAddress: string;
  isNFT: boolean;
}): TokenCacheData[] {
  const { chainId, walletAddress, isNFT } = options;
  const key = generateLocalStorageKey(chainId, walletAddress, isNFT);

  const result = localStorage.getItem(key);

  const parsedResult: TokenCacheData[] = result ? JSON.parse(result) : [];

  parsedResult.forEach((item) => {
    if (isCarrierEVMChain(chainId as CarrierChainId)) {
      item.contractAddress = ethers.utils.getAddress(item.contractAddress);
    } else if (chainId === CHAIN_ID_SOLANA) {
      item.contractAddress = new PublicKey(item.contractAddress).toBase58();
    }
  });

  return parsedResult;
}

export function saveTokenContractAddressToLocal(options: {
  address: string;
  chainId: number;
  walletAddress: string;
  isNFT: boolean;
  tokenIds?: string[];
}) {
  const { address, chainId, walletAddress, isNFT, tokenIds } = options;
  const key = generateLocalStorageKey(chainId, walletAddress, isNFT);

  const cache = getTokenContractAddressFromLocal({ chainId, walletAddress, isNFT });

  const contractCache = cache.find((item) => item.contractAddress.toLowerCase() === address.toLowerCase());

  if (contractCache) {
    if (isNFT) {
      contractCache.tokenIds = (contractCache.tokenIds || []).concat(tokenIds || []);
      contractCache.tokenIds = uniq(contractCache.tokenIds);
    }
  } else {
    cache.push({ contractAddress: address, tokenIds });
  }

  localStorage.setItem(key, JSON.stringify(cache));
}

export function saveTokenContractAddressesToLocal(options: {
  tokens: {
    contractAddress: string;
    tokenIds?: string[];
  }[];
  chainId: number;
  walletAddress: string;
  isNFT: boolean;
}) {
  const { tokens, chainId, walletAddress, isNFT } = options;
  const key = generateLocalStorageKey(chainId, walletAddress, isNFT);

  const cache = getTokenContractAddressFromLocal({ chainId, walletAddress, isNFT });

  tokens.forEach((token) => {
    const { contractAddress, tokenIds } = token;
    const contractCache = cache.find((item) => item.contractAddress.toLowerCase() === contractAddress.toLowerCase());

    if (contractCache) {
      if (isNFT) {
        contractCache.tokenIds = (contractCache.tokenIds || []).concat(tokenIds || []);
        contractCache.tokenIds = uniq(contractCache.tokenIds);
      }
    } else {
      cache.push({ contractAddress, tokenIds });
    }
  });

  localStorage.setItem(key, JSON.stringify(cache));
}

export function removeTokenContractAddressesToLocal(options: {
  tokens: {
    contractAddress: string;
    tokenId?: string;
  }[];
  chainId: number;
  walletAddress: string;
  isNFT: boolean;
}) {
  const { tokens, chainId, walletAddress, isNFT } = options;
  const key = generateLocalStorageKey(chainId, walletAddress, isNFT);

  const cache = getTokenContractAddressFromLocal({ chainId, walletAddress, isNFT });

  const newCache = produce(cache, (draft) => {
    tokens.forEach((token) => {
      const { contractAddress, tokenId } = token;
      const contractCacheIndex = draft.findIndex(
        (item) => item.contractAddress.toLowerCase() === contractAddress.toLowerCase(),
      );
      const contractCache = contractCacheIndex !== -1 ? draft[contractCacheIndex] : undefined;

      if (contractCache) {
        if (isNFT) {
          const tokenIdIndex = contractCache.tokenIds
            ? contractCache.tokenIds.findIndex((item) => item === tokenId)
            : -1;

          if (contractCache.tokenIds) {
            if (tokenIdIndex !== -1) {
              contractCache.tokenIds.splice(tokenIdIndex, 1);
            }

            if (!contractCache.tokenIds.length) {
              draft.slice(contractCacheIndex, 1);
            }
          }
        } else {
          draft.slice(contractCacheIndex, 1);
        }
      }
    });
  });

  localStorage.setItem(key, JSON.stringify(newCache));
}

export function createNFTData(data: {
  ownerAddress: string;
  nftAddress: string;
  amount: string;
  decimals: number;
  uiAmount: number;
  uiAmountString: string;
  tokenId?: string;
  symbol?: string;
  name?: string;
  uri?: string;
  logo?: string;
  animation_url?: string;
  external_url?: string;
  image?: string;
  image_256?: string;
  nftName?: string;
  description?: string;
}): NFTData {
  const {
    ownerAddress,
    nftAddress,
    amount,
    decimals,
    uiAmount,
    uiAmountString,
    tokenId,
    symbol,
    name,
    logo,
    uri,
    animation_url,
    external_url,
    image,
    image_256,
    nftName,
    description,
  } = data;

  return {
    ownerAddress,
    tokenAddress: nftAddress,
    amount,
    decimals,
    uiAmount,
    uiAmountString,
    tokenId,
    uri,
    animation_url,
    external_url,
    image,
    image_256,
    symbol,
    name,
    nftName,
    description,
    logo,
  };
}

export function createTokenData(
  ownerAddress: string,
  tokenAddress: string,
  amount: string,
  decimals: number,
  uiAmount: number,
  uiAmountString: string,
  symbol?: string,
  name?: string,
  logo?: string,
  isNativeAsset?: boolean,
  isUINativeAsset?: boolean,
): TokenData {
  return {
    ownerAddress,
    tokenAddress,
    amount,
    decimals,
    uiAmount,
    uiAmountString,
    symbol,
    name,
    logo,
    isNativeAsset,
    isUINativeAsset,
  };
}
