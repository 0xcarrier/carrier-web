import { useEffect, useMemo, useState } from 'react';
import { TokensData } from '../../../hooks/useTokens';
import { Wallet } from '../../../hooks/useWallet';

export function useSourceTokenData(options: { sourceWallet: Wallet; sourceTokens: TokensData }) {
  const [sourceTokenData, setSourceTokenData] = useState<{ tokenAddress: string; tokenId?: string }>();
  const { sourceWallet, sourceTokens } = options;
  const sourceToken = useMemo(() => {
    return sourceTokenData
      ? sourceTokens.cachedTokens.data?.tokens.find((item) => {
          const tokenIdMatched = sourceTokenData.tokenId ? item.tokenId === sourceTokenData.tokenId : true;

          return item.tokenAddress === sourceTokenData.tokenAddress && tokenIdMatched;
        })
      : undefined;
  }, [sourceTokens, sourceTokenData]);

  // reset source token when walletAddress or source chain changed
  useEffect(() => {
    setSourceTokenData(undefined);
  }, [sourceWallet.expectedChainId, sourceWallet.wallet?.walletAddress]);

  return useMemo(() => {
    return { sourceToken, setSourceTokenData };
  }, [sourceToken, setSourceTokenData]);
}
