import {
  CHAIN_ID_ACALA,
  CHAIN_ID_ARBITRUM,
  CHAIN_ID_AURORA,
  CHAIN_ID_AVAX,
  CHAIN_ID_BSC,
  CHAIN_ID_CELO,
  CHAIN_ID_ETH,
  CHAIN_ID_FANTOM,
  CHAIN_ID_KARURA,
  CHAIN_ID_KLAYTN,
  CHAIN_ID_MOONBEAM,
  CHAIN_ID_OASIS,
  CHAIN_ID_POLYGON,
  CHAIN_ID_SOLANA,
  EVMChainId,
  CHAIN_ID_OPTIMISM,
  CHAIN_ID_BASE,
} from '@certusone/wormhole-sdk';
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';
import {
  CarrierChainId,
  approveGasLimit,
  destinationChainGasLimit,
  destinationChainNFTGasLimit,
  sourceChainGasLimit,
} from './consts';
import { TokenPrice } from './tokenPrices';
import { getEvmProviderWithWormholeChainId, isCarrierEVMChain, isCarrierPolkaChain } from './web3Utils';

export type SupportedEVMChainId = Exclude<EVMChainId, 17 | 25 | 33 | 10002>;

type TokenIdMapping = Record<SupportedEVMChainId, string>;

// Neon (17) and Gnosis (25) currently not supported
export const nativeCoinGeckoIdMapping: TokenIdMapping = {
  [CHAIN_ID_ACALA]: 'acala',
  [CHAIN_ID_ARBITRUM]: 'ethereum',
  [CHAIN_ID_AURORA]: 'ethereum',
  [CHAIN_ID_AVAX]: 'avalanche-2',
  [CHAIN_ID_BASE]: 'ethereum',
  [CHAIN_ID_BSC]: 'binancecoin',
  [CHAIN_ID_CELO]: 'celo',
  [CHAIN_ID_ETH]: 'ethereum',
  [CHAIN_ID_FANTOM]: 'fantom',
  [CHAIN_ID_KARURA]: 'karura',
  [CHAIN_ID_KLAYTN]: 'klay-token',
  [CHAIN_ID_MOONBEAM]: 'moonbeam',
  [CHAIN_ID_OASIS]: 'oasis-network',
  [CHAIN_ID_OPTIMISM]: 'ethereum',
  [CHAIN_ID_POLYGON]: 'matic-network',
};

// https://atanet.atlassian.net/browse/DEV-1328 refer this for details
export async function calculateFeesInUSD(options: {
  isSource: boolean;
  chainId: CarrierChainId;
  tokenPrices: TokenPrice;
  isNFT: boolean;
  approvalRequired?: boolean;
  isNativeAsset?: boolean;
}): Promise<BigNumber | undefined> {
  const { isSource, chainId, tokenPrices, isNFT, isNativeAsset } = options;

  if (tokenPrices) {
    if (isCarrierEVMChain(chainId)) {
      return calculateEVMFees(options);
    } else if (chainId === CHAIN_ID_SOLANA) {
      // fees on solana is based on the singers number, and signers number is decided by the program
      // so we just need to calculate fees by different program.
      // token:
      //   transfer native: https://solscan.io/tx/2GCNtzJJXgFv9h4gLsmF2gNqmQgaSd1oCE2YtQ7Xjun5kwkPmGZwqU44aFV6BRkhqnJ7UP8LC8gZbc7j77qG2FY?cluster=devnet
      //   transfer erc20: https://solscan.io/tx/4d7cEZpFeXU4CtnhABJ4NS2EjJXdunTKe8CkRV3f6r2G3FGsJtu9dKxygbyyuG5Fx3TwF3YU7pj2WbFdjttFeHoS?cluster=devnet
      //   redeem: https://solscan.io/tx/4wiS5tPFTaEWzNaTXHZBUmcd49phyriNNKre3pqppBS7jucPXpK2JGbVCRNe8qHGKhEsDcPEK2PdiUoPeZ5wxJfB?cluster=devnet

      // nft:
      //   transfer: https://solscan.io/tx/42GVYq2tgLRrDJCbQ74JoF9gcMo1Trzk68tHLrNx1T5MmDV4V4YyGSRAMQm9C22jYR2vRzrx4LWMHXcgBgQnhtau?cluster=devnet
      //   redeem: https://solscan.io/tx/4kYyp9NmyX4pHrvjLVsqfXYtEeeNtbhs44ks32KDsSg2d4tpEUTMKK3XGWTzZps8jxFdZE3F5H6r9ej7MQoUTYG2?cluster=devnet
      const singers = isSource ? (isNFT ? 2 : isNativeAsset ? 3 : 2) : isNFT ? 1 : 1;

      return BigNumber(singers * 0.000005).multipliedBy(tokenPrices?.solana?.usd || 0);
    } else if (isCarrierPolkaChain(chainId)) {
      return calculateEVMFees({ ...options, chainId: CHAIN_ID_MOONBEAM });
    }
  }
}

async function calculateEVMFees(options: {
  isSource: boolean;
  chainId: CarrierChainId;
  tokenPrices: TokenPrice;
  isNFT: boolean;
  approvalRequired?: boolean;
  isNativeAsset?: boolean;
}) {
  const { isSource, chainId, tokenPrices, isNFT, isNativeAsset, approvalRequired } = options;
  const tokenPrice = tokenPrices[nativeCoinGeckoIdMapping[chainId as SupportedEVMChainId]]?.usd || 0;
  const tokenPriceBigNumber = BigNumber(tokenPrice);
  const gasPrice = await getEvmGasPrice(chainId);
  const gasPriceBigNumber = BigNumber(gasPrice ? gasPrice.toString() : '0');

  const approvalFeeInWei = approvalRequired
    ? await calculateEthApproveFee({
        chainId,
      })
    : BigNumber(0);
  const approvalFeeInEther = BigNumber(ethers.utils.formatEther(approvalFeeInWei.toString()).toString());

  const gasInWei = gasPriceBigNumber.multipliedBy(
    isSource
      ? isNFT
        ? sourceChainGasLimit.NFT
        : isNativeAsset
        ? sourceChainGasLimit.nativeCurrency
        : sourceChainGasLimit.erc20Token
      : isNFT
      ? destinationChainNFTGasLimit
      : destinationChainGasLimit,
  );
  const gasInEther = BigNumber(ethers.utils.formatEther(gasInWei.toString()).toString());
  console.log(
    'approvalFeeInEther',
    approvalFeeInEther.toString(),
    'gasInEther',
    gasInEther.toString(),
    'tokenPriceBigNumber',
    tokenPriceBigNumber.toString(),
  );

  // current gas price on source chain * gasLimit1 * current usd price of native token on source chain
  return gasInEther.multipliedBy(tokenPriceBigNumber).plus(approvalFeeInEther.multipliedBy(tokenPriceBigNumber));
}

export async function calculateEthApproveFee(options: { chainId: CarrierChainId }): Promise<BigNumber> {
  const { chainId } = options;

  const provider = getEvmProviderWithWormholeChainId(chainId);

  const gasPrice = await provider.getGasPrice();
  const gasPriceBigNumber = BigNumber(gasPrice.toString());

  return gasPriceBigNumber.multipliedBy(approveGasLimit);
}

export async function getEvmGasPrice(chainId: CarrierChainId) {
  const provider = getEvmProviderWithWormholeChainId(chainId);

  const gasPrice = provider ? await provider.getGasPrice() : undefined;

  return gasPrice;
}

export const roundOffFees = (fees: BigNumber) => {
  if (fees.lt(0)) {
    return '0';
  }
  if (fees.gt(0) && fees.lt(0.01)) {
    return '0.01';
  } else {
    return fees.toFixed(2);
  }
};
