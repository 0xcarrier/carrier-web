import { useEffect, useMemo, useState } from 'react';
import { TokenData } from '../utils/tokenData/helper';

export function useTransferAmountString(options: { sourceToken?: TokenData; isCommandlineVisible: boolean }) {
  const { sourceToken, isCommandlineVisible } = options;
  const [transferAmountString, setTransferAmountString] = useState('');

  // reset transfer amount string when source token address changed
  useEffect(() => {
    if ((sourceToken && !isCommandlineVisible) || !sourceToken) {
      setTransferAmountString('');
    }
  }, [sourceToken, setTransferAmountString]);

  return useMemo(() => {
    return { transferAmountString, setTransferAmountString };
  }, [transferAmountString, setTransferAmountString]);
}
