import { CarrierChainId } from '../utils/consts';
import { useMemo } from 'react';
import { disabledChains } from './useNetworkError';

export const errorTokenIsDisabled = new Error('token is disabled');

export function useTokenError(options: {
  sourceChainId?: CarrierChainId;
  targetChainId?: CarrierChainId;
  tokenAddress?: string;
}) {
  const { sourceChainId, targetChainId, tokenAddress } = options;

  // if we have any networks are not compatible with each other, we can add conditional check here.
  return useMemo(() => {
    const isTokenDisabled = tokenAddress
      ? disabledChains.find((item) => {
          return (
            (((item.source === sourceChainId || item.source === 'all') &&
              (item.target === targetChainId || item.target === 'all')) ||
              ((item.target === sourceChainId || item.target === 'all') &&
                (item.source === targetChainId || item.source === 'all') &&
                item.bothDirections)) &&
            !item.disableChain &&
            item.disableTokens?.map((item) => item.toLowerCase()).includes(tokenAddress.toLowerCase())
          );
        }) != null
      : false;

    return isTokenDisabled ? errorTokenIsDisabled : undefined;
  }, [sourceChainId, targetChainId, tokenAddress]);
}
