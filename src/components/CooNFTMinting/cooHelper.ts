import { providers } from '@0xsequence/multicall';
import { ethers } from 'ethers';
import { cooNFTMintParams } from '../../utils/consts';
import { getEvmProviderWithWormholeChainId } from '../../utils/web3Utils';
import CarrierCooNFTABI from '../../abis/CarrierCooNFT.json';

export const isEnableNFTMinting =
  process.env.ENABLE_NFT_MINTING && process.env.ENABLE_NFT_MINTING === 'true' ? true : false;

export const NO_NFT_TOKEN_ID = 0;

// number of envelopes to open (call contract to check eligibilty at at time)
export const ENVELOPE_LIMIT = 50;

// @see useFetchValidVaas for fetching the valid vaas
// 2 weeks in ms
export const bufferEndTime = 1209600000;

/**
 * for use if need to sign transactions
 * @param evmProvider
 * @returns
 */
export const getCooNFTContractInstance = (evmProvider?: ethers.providers.Provider | ethers.Signer) => {
  let provider;
  if (evmProvider) {
    provider = evmProvider;
  } else {
    provider = getEvmProviderWithWormholeChainId(cooNFTMintParams.chainId);
  }
  const cooNFTContract = new ethers.Contract(cooNFTMintParams.tokenAddress.toLowerCase(), CarrierCooNFTABI, provider);
  return cooNFTContract;
};

/**
 * for use if only need to fetch contract information
 * @returns
 */
export const getCooNFTContractInstanceMultiProvider = () => {
  const provider = getEvmProviderWithWormholeChainId(cooNFTMintParams.chainId);
  const multicallProvider = new providers.MulticallProvider(provider);

  const cooNFTContract = new ethers.Contract(
    cooNFTMintParams.tokenAddress.toLowerCase(),
    CarrierCooNFTABI,
    multicallProvider,
  );
  return cooNFTContract;
};

const isTimerValid = (time: number | undefined) => {
  const currentTime = Date.now();
  if (time && currentTime >= time) {
    return true;
  }
  return false;
};

export const isEventStarted = (startTime: number) => {
  return isTimerValid(startTime);
};

export const isEventEnded = (endTime: number | undefined) => {
  return isTimerValid(endTime);
};

export const isCountDownEnded = (hours: number, minutes: number, seconds: number) => {
  if (hours + minutes + seconds <= 0) {
    return true;
  }
  return false;
};
