import { CarrierChainId } from '../utils/consts';
import { useMemo } from 'react';

export const errorNetworksIsNotCompatible = new Error('networks are not compatible');
export const errorNetworksIsDisabled = new Error('networks are disabled');

interface DisabledChain {
  source: CarrierChainId | 'all';
  target: CarrierChainId | 'all';
  disableChain: boolean;
  bothDirections: boolean;
  disableTokens?: string[];
}

const DISABLED_CHAINS = process.env.DISABLED_CHAINS;

export let disabledChains: DisabledChain[] = [];

if (DISABLED_CHAINS && typeof DISABLED_CHAINS === 'string') {
  try {
    disabledChains = JSON.parse(DISABLED_CHAINS);
  } catch {}
}

export function useNetworkError(options: { sourceChainId?: CarrierChainId; targetChainId?: CarrierChainId }) {
  const { sourceChainId, targetChainId } = options;

  // if we have any networks are not compatible with each other, we can add conditional check here.
  return useMemo(() => {
    const isChainsDisabled =
      disabledChains.find((item) => {
        return (
          (((item.source === sourceChainId || item.source === 'all') &&
            (item.target === targetChainId || item.target === 'all')) ||
            ((item.target === sourceChainId || item.target === 'all') &&
              (item.source === targetChainId || item.source === 'all') &&
              item.bothDirections)) &&
          item.disableChain
        );
      }) != null;

    return isChainsDisabled ? errorNetworksIsDisabled : undefined;
  }, [sourceChainId, targetChainId]);
}
