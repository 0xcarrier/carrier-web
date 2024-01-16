import { CLUSTER } from '../utils/consts';
import { useData } from './useData';

const BLOCKED_WALLETS = process.env.BLOCKED_WALLETS;
const TRMLABS_KEY = process.env.TRMLABS_KEY;

export const BLACKLIST_SCREEN_URL = 'https://api.trmlabs.com/public/v1/sanctions/screening';

export const blockedWallets: string[] =
  BLOCKED_WALLETS && typeof BLOCKED_WALLETS === 'string' ? BLOCKED_WALLETS.split(',') : [];

const memCache: { [walletAddress: string]: boolean } = {};

export function useWalletBlackList(options: { sourceWalletAddress?: string; targetWalletAddress?: string }) {
  const { sourceWalletAddress, targetWalletAddress } = options;

  return useData<{ isSourceWalletSanctioned: boolean; isTargetWalletSanctioned: boolean } | undefined>(
    async (signal) => {
      if (sourceWalletAddress && targetWalletAddress) {
        const sourceWalletBlockedByEnvVar = blockedWallets.includes(sourceWalletAddress);
        const targetWalletBlockedByEnvVar = blockedWallets.includes(targetWalletAddress);

        if (sourceWalletBlockedByEnvVar || targetWalletBlockedByEnvVar) {
          return {
            isSourceWalletSanctioned: sourceWalletBlockedByEnvVar,
            isTargetWalletSanctioned: targetWalletBlockedByEnvVar,
          };
        }

        const sourceCache = memCache[sourceWalletAddress];
        const targetCache = memCache[targetWalletAddress];

        if (sourceCache != null && targetCache != null) {
          return { isSourceWalletSanctioned: sourceCache, isTargetWalletSanctioned: targetCache };
        }

        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };

        if (TRMLABS_KEY && typeof TRMLABS_KEY === 'string') {
          headers['Authorization'] = `Basic ${TRMLABS_KEY}`;
        }

        const resp = await fetch(BLACKLIST_SCREEN_URL, {
          signal,
          method: 'POST',
          headers,
          body: JSON.stringify([{ address: sourceWalletAddress }, { address: targetWalletAddress }]),
        });
        // DO NOT local cache the result, because it can be tampered with and bypass the checks.
        const respJSON = await resp.json();
        const isSourceSanctioned = Array.isArray(respJSON)
          ? respJSON.some((item) => item.address === sourceWalletAddress && item.isSanctioned)
          : false;

        const isTargetSanctioned = Array.isArray(respJSON)
          ? respJSON.some((item) => item.address === targetWalletAddress && item.isSanctioned)
          : false;

        memCache[sourceWalletAddress] = isSourceSanctioned;
        memCache[targetWalletAddress] = isTargetSanctioned;

        return { isSourceWalletSanctioned: isSourceSanctioned, isTargetWalletSanctioned: isTargetSanctioned };
      }
    },
    [sourceWalletAddress, targetWalletAddress],
  );
}
