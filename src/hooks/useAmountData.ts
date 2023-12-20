import { ethers } from 'ethers';
import { useMemo } from 'react';
import { DataResult, getPendingPromise, useData } from './useData';
import { TokenData } from '../utils/tokenData/helper';
import { getEvmProviderWithWormholeChainId, isCarrierPolkaChain, parseAmount } from '../utils/web3Utils';
import { MaxAmountData } from './useMaxAmoutData';
import BigNumber from 'bignumber.js';
import { ProviderFeeData } from './useProviderFeeData';
import {
  CarrierChainId,
  MOONBEAM_ASSET_TRANSACT_WEIGHTS,
  MOONBEAM_DECIMALS,
  MOONBEAM_TRANSFER_MULTIASSETS_WEIGHTS,
} from '../utils/consts';
import { PolkachainTokens, PolkachainXcGLMR } from '../utils/tokenData/mrl';
import { formatAmount } from '../utils/format-amount';
import { TargetAsset } from './useTargetAsset';
import { needXCMTransfer } from '../utils/polkadot';
import { CHAIN_ID_MOONBEAM } from '@certusone/wormhole-sdk';

function validateInputAmount(input: string) {
  return input !== '' && /[0-9.]*/.test(input);
}

export interface AmountValidationInfo {
  transferAmountError: Error | undefined;
  transferAmountValid: boolean;
  transferAmountParsed: ethers.BigNumber | undefined;
}

export const minimumAmount = '0.00000001';

export const amountErrorNameLowerThanExistentialDeposit = 'LowerThanExistentialDeposit';
export const amountErrorNameInsufficientXcGLMR = 'InsufficientXcGLMR';
export const amountErrorInsufficientBalanceForMRLFee = new Error('Insufficient balance for xcm fee.');
export const amountErrorInsufficientBalance = new Error('Insufficient balance for relayer fee.');
export const amountErrorZero = new Error('Input amount cannot be 0.');
export const amountErrorExceedsMaxAmount = new Error('Input amount exceeds maximum amount.');
export const amountErrorLessThanEightDecimals = new Error(`Input amount cannot be less than ${minimumAmount}`);

async function getAmountValidationInfo(options: {
  signal: AbortSignal;
  transferAmountString: string;
  sourceChainId?: CarrierChainId;
  targetChainId?: CarrierChainId;
  walletAddress?: string;
  targetWalletAddress?: string;
  sourceToken?: TokenData;
  providerFeeData: DataResult<ProviderFeeData | undefined>;
  maxAmountData: DataResult<MaxAmountData | undefined>;
  targetAssetData?: DataResult<TargetAsset | undefined>;
  randomXCMFee?: number;
}): Promise<AmountValidationInfo | undefined> {
  const {
    signal,
    transferAmountString,
    sourceChainId,
    targetChainId,
    walletAddress,
    targetWalletAddress,
    sourceToken,
    providerFeeData,
    maxAmountData,
    targetAssetData,
    randomXCMFee,
  } = options;

  if (maxAmountData.error) {
    throw maxAmountData.error;
  }

  if (providerFeeData.error) {
    throw providerFeeData.error;
  }

  if (targetAssetData?.error) {
    throw targetAssetData.error;
  }

  if (maxAmountData.loading || providerFeeData.loading || targetAssetData?.loading) {
    return getPendingPromise(signal);
  }

  const transferAmountStringValid =
    validateInputAmount(transferAmountString) && !isNaN(parseFloat(transferAmountString));
  const transferAmountParsed =
    transferAmountStringValid && sourceToken ? parseAmount(transferAmountString, sourceToken.decimals) : undefined;

  let amountError: Error | undefined;

  if (transferAmountParsed && sourceToken && maxAmountData.data && providerFeeData.data) {
    if (providerFeeData.data.hasFees && maxAmountData.data.maxAmountInWei.isZero()) {
      console.log(
        'providerFeeData.data.isUsingMRL',
        providerFeeData.data.isUsingMRL,
        providerFeeData.data.MRLFeeParsed,
      );
      if (providerFeeData.data.isUsingMRL) {
        amountError = amountErrorInsufficientBalanceForMRLFee;
      } else {
        amountError = amountErrorInsufficientBalance;
      }
    } else if (transferAmountParsed.eq(0)) {
      amountError = amountErrorZero;
      // wormhole token bridge only support 8 decimals maximum
      // so if we allow amount small than 8 decimals
      // the transfer amount will become 0 and the user token will be locked on the contract forever
    }

    if (BigNumber(transferAmountString).lt(BigNumber(minimumAmount))) {
      amountError = amountErrorLessThanEightDecimals;
    }

    if (maxAmountData.data.maxAmount && transferAmountParsed.gt(maxAmountData.data.maxAmountInWei)) {
      amountError = amountErrorExceedsMaxAmount;
    }

    if (sourceChainId && targetChainId && walletAddress && needXCMTransfer(sourceChainId)) {
      const xcGLMR = PolkachainXcGLMR[sourceChainId];
      const provider = getEvmProviderWithWormholeChainId(CHAIN_ID_MOONBEAM);
      const xcGLMRBalance =
        sourceChainId === CHAIN_ID_MOONBEAM
          ? (await provider.getBalance(walletAddress)).toString()
          : xcGLMR
          ? await xcGLMR.getBalance({
              chainId: sourceChainId,
              assetId: xcGLMR.assetId,
              walletAddress,
            })
          : undefined;

      if (!xcGLMRBalance) {
        throw new Error("Can't get GLMR balance");
      }

      const parsedXcGLMRBalance = ethers.BigNumber.from(xcGLMRBalance);
      console.log('xcGLMR balance', parsedXcGLMRBalance.toString());
      const xcmFee = needXCMTransfer(targetChainId)
        ? targetChainId !== CHAIN_ID_MOONBEAM
          ? MOONBEAM_TRANSFER_MULTIASSETS_WEIGHTS.mul(2)
          : MOONBEAM_TRANSFER_MULTIASSETS_WEIGHTS
        : MOONBEAM_TRANSFER_MULTIASSETS_WEIGHTS.add(MOONBEAM_ASSET_TRANSACT_WEIGHTS);
      const requiredGLMR = xcmFee.add(randomXCMFee || 0);

      if (parsedXcGLMRBalance.lt(requiredGLMR)) {
        const xcGLMRShortageAmount = formatAmount(
          BigNumber(ethers.utils.formatUnits(requiredGLMR.sub(parsedXcGLMRBalance), MOONBEAM_DECIMALS)),
        );
        const err = new Error(
          `Insufficient xcGLMR token balance for MRL fee. Please deposit at least ${xcGLMRShortageAmount} GLMR to your source wallet first.`,
        );

        err.name = amountErrorNameInsufficientXcGLMR;

        amountError = err;
      }
    }

    if (targetChainId && targetWalletAddress && isCarrierPolkaChain(targetChainId)) {
      const polkachainToken = PolkachainTokens[targetChainId].find(
        (item) => item.assetId === targetAssetData?.data?.targetAddress,
      );

      if (polkachainToken) {
        const existentialDeposit = polkachainToken.existentialDeposit;

        if (existentialDeposit) {
          const existentialDepositParsed = ethers.BigNumber.from(existentialDeposit);

          if (transferAmountParsed.lt(existentialDepositParsed)) {
            const minAmount = formatAmount(
              BigNumber(ethers.utils.formatUnits(existentialDepositParsed, polkachainToken.decimals)),
            );
            const err = new Error(
              `Transfer amount is lower than minimum allowed amount. The input amount must be greater than ${minAmount} ${polkachainToken.symbol}`,
            );

            err.name = amountErrorNameLowerThanExistentialDeposit;

            amountError = err;
          }
        }
      }
    }
  }

  return {
    transferAmountError: amountError,
    transferAmountValid: transferAmountStringValid && !amountError,
    transferAmountParsed,
  };
}

export interface AmountData {
  amountValidationInfo: DataResult<AmountValidationInfo | undefined>;
  transferAmountString: string;
}

export function useAmountData(options: {
  transferAmountString: string;
  sourceChainId?: CarrierChainId;
  targetChainId?: CarrierChainId;
  walletAddress?: string;
  targetWalletAddress?: string;
  sourceToken?: TokenData;
  providerFeeData: DataResult<ProviderFeeData | undefined>;
  maxAmountData: DataResult<MaxAmountData | undefined>;
  targetAssetData?: DataResult<TargetAsset | undefined>;
  randomXCMFee?: number;
}): AmountData {
  const {
    transferAmountString,
    sourceChainId,
    targetChainId,
    walletAddress,
    targetWalletAddress,
    sourceToken,
    providerFeeData,
    maxAmountData,
    targetAssetData,
    randomXCMFee,
  } = options;

  const amountValidationInfo = useData(
    async (signal) => {
      console.log('getAmountValidationInfo', {
        transferAmountString,
        sourceChainId,
        walletAddress,
        sourceToken,
        providerFeeData,
        maxAmountData,
      });
      const data = await getAmountValidationInfo({
        signal,
        transferAmountString,
        sourceChainId,
        targetChainId,
        walletAddress,
        targetWalletAddress,
        sourceToken,
        providerFeeData,
        maxAmountData,
        targetAssetData,
        randomXCMFee,
      });
      // console.log('getAmountValidationInfo result', data);
      return data;
    },
    [transferAmountString, sourceChainId, walletAddress, sourceToken, providerFeeData, maxAmountData, targetAssetData],
  );

  return useMemo(() => {
    return {
      amountValidationInfo,
      transferAmountString,
    };
  }, [amountValidationInfo, transferAmountString]);
}
