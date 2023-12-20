import { useEffect, useMemo, useState } from 'react';
import { TokenData } from '../../../utils/tokenData/helper';

interface AmountData {
  sourceAmount: string;
  targetAmount: string;
}

export interface TransferAmountData {
  amountString: AmountData;
  setAmountString: React.Dispatch<React.SetStateAction<AmountData>>;
}

export function useTransferAmountString(options: {
  sourceToken?: TokenData;
  targetToken?: TokenData;
  isCommandlineVisible: boolean;
}): TransferAmountData {
  const { sourceToken, targetToken, isCommandlineVisible } = options;
  const [amountString, setAmountString] = useState<AmountData>({
    sourceAmount: '',
    targetAmount: '',
  });

  // reset transfer amount string when source token address changed
  useEffect(() => {
    if (((sourceToken || targetToken) && !isCommandlineVisible) || (!sourceToken && !targetToken)) {
      setAmountString({ sourceAmount: '', targetAmount: '' });
    }
  }, [sourceToken, targetToken, setAmountString]);

  return useMemo(() => {
    return { amountString, setAmountString };
  }, [amountString, setAmountString]);
}
