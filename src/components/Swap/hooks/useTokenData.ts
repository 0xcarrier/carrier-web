import { useMemo } from 'react';
import { TokensData } from '../../../hooks/useTokens';
import { CarrierChainId, getDefaultNativeCurrencyAddress } from '../../../utils/consts';

export function useTokenData(options: { chainId?: CarrierChainId; tokens: TokensData }) {
  const { chainId, tokens } = options;
  const token = useMemo(() => {
    return tokens.cachedTokens.data?.tokens.find((item) =>
      chainId ? item.tokenAddress === getDefaultNativeCurrencyAddress(chainId) : false,
    );
  }, [tokens, chainId]);

  return useMemo(() => {
    return { token };
  }, [token]);
}
