import { useEffect, useMemo, useState } from 'react';
import { TokensData } from '../../../hooks/useTokens';
import { Wallet } from '../../../hooks/useWallet';

export function useSourceTokenData(options: { sourceWallet: Wallet; sourceTokens: TokensData }) {
  const [sourceTokenAddress, setSourceTokenAddress] = useState<string>();
  const { sourceWallet, sourceTokens } = options;
  const sourceToken = useMemo(() => {
    return sourceTokens.cachedTokens.data?.tokens.find((item) => item.tokenAddress === sourceTokenAddress);
  }, [sourceTokens, sourceTokenAddress]);

  // reset source token when walletAddress or source chain changed
  useEffect(() => {
    setSourceTokenAddress(undefined);
  }, [sourceWallet.expectedChainId, sourceWallet.wallet?.walletAddress]);

  return useMemo(() => {
    return { sourceToken, setSourceTokenAddress };
  }, [sourceToken, setSourceTokenAddress]);
}
