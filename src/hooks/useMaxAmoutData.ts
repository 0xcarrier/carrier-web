import { CHAIN_ID_SOLANA } from '@certusone/wormhole-sdk';
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';
import { DataResult, getPendingPromise, useData } from './useData';
import { CarrierChainId, sourceChainGasLimit } from '../utils/consts';
import { TokenData } from '../utils/tokenData/helper';
import { getEvmProviderWithWormholeChainId, isCarrierEVMChain, toFixed } from '../utils/web3Utils';
import { ProviderFeeData } from './useProviderFeeData';

export interface MaxAmountData {
  maxAmount: BigNumber;
  maxAmountString: string;
  maxAmountInWei: ethers.BigNumber;
}

async function getMaxAmount(options: {
  signal: AbortSignal;
  sourceChainId?: CarrierChainId;
  targetChainId?: CarrierChainId;
  sourceToken?: TokenData;
  providerFeeData: DataResult<ProviderFeeData | undefined>;
}) {
  const { signal, sourceChainId, sourceToken, providerFeeData } = options;

  if (providerFeeData.error) {
    throw providerFeeData.error;
  }

  if (providerFeeData.loading) {
    return getPendingPromise(signal);
  }

  if (sourceToken && providerFeeData.data) {
    let maxAmount: BigNumber | undefined;

    if (sourceChainId) {
      if (!sourceToken.isNativeAsset) {
        const targetFees = providerFeeData.data.hasFees
          ? BigNumber(providerFeeData.data.totalFeeFormatted || '0')
          : BigNumber('0');
        maxAmount = BigNumber(sourceToken.uiAmountString).minus(targetFees);
      } else {
        if (isCarrierEVMChain(sourceChainId)) {
          const provider = getEvmProviderWithWormholeChainId(sourceChainId);

          const gasPrice = await provider.getGasPrice();
          const gasPriceBigNumber = BigNumber(gasPrice.toString());
          const gasInWei = gasPriceBigNumber.multipliedBy(sourceChainGasLimit.nativeCurrency).multipliedBy(1.1);
          const gasInEther = BigNumber(ethers.utils.formatEther(gasInWei.toString()).toString());
          const targetFees = providerFeeData.data.hasFees
            ? BigNumber(providerFeeData.data.totalFeeFormatted || '0')
            : BigNumber('0');
          maxAmount = BigNumber(sourceToken.uiAmountString).minus(targetFees).minus(gasInEther);
        } else if (sourceChainId === CHAIN_ID_SOLANA) {
          // fees on solana is based on the singers number, and signers number is decided by the program
          // so we just need to calculate fees by different program.
          // token:
          //   transfer native: https://solscan.io/tx/2GCNtzJJXgFv9h4gLsmF2gNqmQgaSd1oCE2YtQ7Xjun5kwkPmGZwqU44aFV6BRkhqnJ7UP8LC8gZbc7j77qG2FY?cluster=devnet
          //   transfer erc20: https://solscan.io/tx/4d7cEZpFeXU4CtnhABJ4NS2EjJXdunTKe8CkRV3f6r2G3FGsJtu9dKxygbyyuG5Fx3TwF3YU7pj2WbFdjttFeHoS?cluster=devnet
          //   redeem: https://solscan.io/tx/4wiS5tPFTaEWzNaTXHZBUmcd49phyriNNKre3pqppBS7jucPXpK2JGbVCRNe8qHGKhEsDcPEK2PdiUoPeZ5wxJfB?cluster=devnet

          // nft:
          //   transfer: https://solscan.io/tx/42GVYq2tgLRrDJCbQ74JoF9gcMo1Trzk68tHLrNx1T5MmDV4V4YyGSRAMQm9C22jYR2vRzrx4LWMHXcgBgQnhtau?cluster=devnet
          //   redeem: https://solscan.io/tx/4kYyp9NmyX4pHrvjLVsqfXYtEeeNtbhs44ks32KDsSg2d4tpEUTMKK3XGWTzZps8jxFdZE3F5H6r9ej7MQoUTYG2?cluster=devnet
          // as the data above, native token fees on solana transfer is 3 signer * 0.000005;
          const solanaNetworkFees = BigNumber(3 * 0.000005);
          const targetFees = providerFeeData.data.hasFees
            ? BigNumber(providerFeeData.data.totalFeeFormatted || '0')
            : BigNumber('0');
          maxAmount = BigNumber(sourceToken.uiAmountString).minus(targetFees).minus(solanaNetworkFees);
        }
      }
    }

    if (maxAmount) {
      const maxAmountBiggerThanZero = maxAmount.gt(0) ? maxAmount : BigNumber(0);
      const maxAmountString = maxAmount.gt(0) ? toFixed(maxAmount, sourceToken.decimals) : '0';
      const maxAmountInWei = maxAmount.gt(0)
        ? ethers.utils.parseUnits(maxAmountString, sourceToken.decimals)
        : ethers.BigNumber.from(0);
      return { maxAmount: maxAmountBiggerThanZero, maxAmountString, maxAmountInWei };
    }
  }
}

export function useMaxAmountData(options: {
  sourceChainId?: CarrierChainId;
  sourceToken?: TokenData;
  providerFeeData: DataResult<ProviderFeeData | undefined>;
}) {
  const { sourceChainId, sourceToken, providerFeeData } = options;

  const maxAmount = useData(
    async (signal) => {
      console.log('useMaxAmountData', { sourceChainId, sourceToken, providerFeeData });

      const data = await getMaxAmount({
        signal,
        sourceChainId,
        sourceToken,
        providerFeeData,
      });

      // console.log('useMaxAmountData result', data);

      return data;
    },
    [sourceChainId, sourceToken, providerFeeData],
  );

  return maxAmount;
}
