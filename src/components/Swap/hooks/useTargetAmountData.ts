import { ethers } from 'ethers';
import { useMemo } from 'react';
import { DataResult, getPendingPromise, useData } from '../../../hooks/useData';
import { TokenData } from '../../../utils/tokenData/helper';
import { parseAmount, toFixed } from '../../../utils/web3Utils';
import { MaxAmountData } from '../../../hooks/useMaxAmoutData';

function validateInputAmount(input: string) {
  return input !== '' && /[0-9.]*/.test(input);
}

export interface AmountValidationInfo {
  transferAmountError: Error | undefined;
  transferAmountValid: boolean;
  transferAmountParsed: ethers.BigNumber | undefined;
}

export const amountErrorInsufficientBalance = new Error('Insufficient balance for relayer fee.');
export const amountErrorZero = new Error('Input amount cannot be 0.');
export const amountErrorExceedsSourceMaxAmount = new Error('Input amount exceeds maximum amount.');

async function getAmountValidationInfo(options: {
  signal: AbortSignal;
  transferAmountString: string;
  sourceToken?: TokenData;
  maxTargetAmountData: DataResult<MaxAmountData | undefined>;
}): Promise<AmountValidationInfo | undefined> {
  const { transferAmountString, sourceToken, maxTargetAmountData, signal } = options;

  if (maxTargetAmountData.error) {
    throw maxTargetAmountData.error;
  }

  if (maxTargetAmountData.loading) {
    return getPendingPromise(signal);
  }

  const transferAmountStringValid =
    validateInputAmount(transferAmountString) && !isNaN(parseFloat(transferAmountString));
  const transferAmountParsed =
    transferAmountStringValid && sourceToken ? parseAmount(transferAmountString, sourceToken.decimals) : undefined;

  let amountError: Error | undefined;

  if (transferAmountParsed && sourceToken && maxTargetAmountData.data) {
    if (transferAmountParsed.eq(0)) {
      amountError = amountErrorZero;
    } else if (
      maxTargetAmountData.data.maxAmount &&
      transferAmountParsed.gt(
        parseAmount(toFixed(maxTargetAmountData.data.maxAmount, sourceToken.decimals), sourceToken.decimals),
      )
    ) {
      amountError = amountErrorExceedsSourceMaxAmount;
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

export function useTargetAmountData(options: {
  transferAmountString: string;
  sourceToken?: TokenData;
  maxTargetAmountData: DataResult<MaxAmountData | undefined>;
}): AmountData {
  const { transferAmountString, sourceToken, maxTargetAmountData } = options;

  const amountValidationInfo = useData(
    async (signal) => {
      console.log('getAmountValidationInfo', { transferAmountString, sourceToken, maxTargetAmountData });
      const data = await getAmountValidationInfo({
        signal,
        transferAmountString,
        sourceToken,
        maxTargetAmountData,
      });
      // console.log('getAmountValidationInfo result', data);
      return data;
    },
    [transferAmountString, sourceToken, maxTargetAmountData],
  );

  return useMemo(() => {
    return {
      amountValidationInfo,
      transferAmountString,
    };
  }, [amountValidationInfo, transferAmountString]);
}
