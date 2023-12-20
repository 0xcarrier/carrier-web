import { CHAIN_ID_ETH, CHAIN_ID_POLYGON } from '@certusone/wormhole-sdk';
import { CarrierChainId, ChainInfo } from './consts';

const CHAIN_WALLET_CACHE_KEY = 'CACHED_CHAIN_WALLET';

export interface ChainCache {
  sourceChainId: CarrierChainId;
  previousConnectedSourceWalletName?: { [chainId: number]: string };
  previousConnectedSourceWalletAddress?: { [chainId: number]: string };
  targetChainId: CarrierChainId;
  previousConnectedTargetWallet?: { [chainId: number]: { walletName: string; walletAddress: string } };
}

export const getAvailableChainCache = (availableChains: ChainInfo[]): ChainCache => {
  const storedInputs = localStorage.getItem(CHAIN_WALLET_CACHE_KEY);
  //returns source = eth and target = polygon if not defined
  const chainCache = storedInputs ? (JSON.parse(storedInputs) as ChainCache) : undefined;

  let sourceChainId: CarrierChainId = CHAIN_ID_ETH;
  let targetChainId: CarrierChainId = CHAIN_ID_POLYGON;

  if (chainCache && availableChains.map((item) => item.id).includes(chainCache.sourceChainId)) {
    sourceChainId = chainCache.sourceChainId;
  }

  if (chainCache && availableChains.map((item) => item.id).includes(chainCache.targetChainId)) {
    targetChainId = chainCache.targetChainId;
  }

  return {
    previousConnectedSourceWalletName: chainCache && chainCache.previousConnectedSourceWalletName,
    previousConnectedSourceWalletAddress: chainCache && chainCache.previousConnectedSourceWalletAddress,
    previousConnectedTargetWallet: chainCache && chainCache.previousConnectedTargetWallet,
    sourceChainId,
    targetChainId,
  };
};

export const getChainCache = (): ChainCache => {
  const storedInputs = localStorage.getItem(CHAIN_WALLET_CACHE_KEY);
  //returns source = eth and target = polygon if not defined
  return storedInputs ? JSON.parse(storedInputs) : { sourceChainId: CHAIN_ID_ETH, targetChainId: CHAIN_ID_POLYGON };
};

export const cacheSourceChainIdToLocal = (sourceChainId: CarrierChainId) => {
  const storedInputs = getChainCache();

  storedInputs.sourceChainId = sourceChainId;

  localStorage.setItem(CHAIN_WALLET_CACHE_KEY, JSON.stringify(storedInputs));
};

export const cacheTargetChainIdToLocal = (targetChainId: CarrierChainId) => {
  const storedInputs = getChainCache();

  storedInputs.targetChainId = targetChainId;

  localStorage.setItem(CHAIN_WALLET_CACHE_KEY, JSON.stringify(storedInputs));
};

export const cacheSourceWalletNameToLocal = (
  sourceChainId: CarrierChainId,
  walletName: string,
  walletAddress?: string,
) => {
  const storedInputs = getChainCache();

  storedInputs.previousConnectedSourceWalletName = storedInputs.previousConnectedSourceWalletName || {};
  storedInputs.previousConnectedSourceWalletName[sourceChainId] = walletName;

  if (walletAddress) {
    storedInputs.previousConnectedSourceWalletAddress = storedInputs.previousConnectedSourceWalletAddress || {};
    storedInputs.previousConnectedSourceWalletAddress[sourceChainId] = walletAddress;
  }

  localStorage.setItem(CHAIN_WALLET_CACHE_KEY, JSON.stringify(storedInputs));
};

export const removeSourceWalletNameFromLocal = (sourceChainId: CarrierChainId, walletAddress?: string) => {
  const storedInputs = getChainCache();

  storedInputs.previousConnectedSourceWalletName = storedInputs.previousConnectedSourceWalletName || {};

  delete storedInputs.previousConnectedSourceWalletName[sourceChainId];

  if (walletAddress) {
    storedInputs.previousConnectedSourceWalletAddress = storedInputs.previousConnectedSourceWalletAddress || {};

    delete storedInputs.previousConnectedSourceWalletAddress[sourceChainId];
  }

  localStorage.setItem(CHAIN_WALLET_CACHE_KEY, JSON.stringify(storedInputs));
};

export const cacheTargetWalletNameAndAddressToLocal = (
  targetChain: CarrierChainId,
  walletName: string,
  walletAddress: string,
) => {
  const storedInputs = getChainCache();

  storedInputs.previousConnectedTargetWallet = storedInputs.previousConnectedTargetWallet || {};
  storedInputs.previousConnectedTargetWallet[targetChain] = { walletName, walletAddress };

  localStorage.setItem(CHAIN_WALLET_CACHE_KEY, JSON.stringify(storedInputs));
};

export const removeTargetWalletNameAndAddressFromLocal = (targetChain: CarrierChainId) => {
  const storedInputs = getChainCache();

  storedInputs.previousConnectedTargetWallet = storedInputs.previousConnectedTargetWallet || {};
  delete storedInputs.previousConnectedTargetWallet[targetChain];

  localStorage.setItem(CHAIN_WALLET_CACHE_KEY, JSON.stringify(storedInputs));
};

export const removePreviousConnectedSourceWalletFromLocal = () => {
  const storedInputs = getChainCache();

  delete storedInputs.previousConnectedSourceWalletName;

  delete storedInputs.previousConnectedSourceWalletAddress;

  localStorage.setItem(CHAIN_WALLET_CACHE_KEY, JSON.stringify(storedInputs));
};

export const removePreviousConnectedTargetWalletFromLocal = () => {
  const storedInputs = getChainCache();

  delete storedInputs.previousConnectedTargetWallet;

  localStorage.setItem(CHAIN_WALLET_CACHE_KEY, JSON.stringify(storedInputs));
};
