import { CLUSTER } from '../utils/consts';
import { useData } from './useData';

const BLOCKED_WALLETS = process.env.BLOCKED_WALLETS;
const TRMLABS_KEY = process.env.TRMLABS_KEY;

export const BLACKLIST_SCREEN_URL =
  CLUSTER === 'mainnet'
    ? 'https://api.trmlabs.com/public/v1/sanctions/screening'
    : CLUSTER === 'testnet'
    ? process.env.NODE_ENV === 'production'
      ? '/public/wallet-blacklist-testdata.json'
      : '/wallet-blacklist-testdata.json'
    : '';
export const blockedWallets: string[] =
  BLOCKED_WALLETS && typeof BLOCKED_WALLETS === 'string' ? BLOCKED_WALLETS.split(',') : [];

const memCache: { [walletAddress: string]: boolean } = {};

export function useWalletBlackList(options: { walletAddress?: string }) {
  const { walletAddress } = options;

  return useData(
    async (signal) => {
      if (walletAddress) {
        if (blockedWallets.includes(walletAddress)) {
          return true;
        }

        if (memCache[walletAddress] != null) {
          return memCache[walletAddress];
        }

        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };

        if (TRMLABS_KEY && typeof TRMLABS_KEY === 'string') {
          headers['Authorization'] = `Basic ${TRMLABS_KEY}`;
        }

        const resp = await fetch(BLACKLIST_SCREEN_URL, {
          signal,
          method: CLUSTER === 'mainnet' ? 'POST' : 'GET',
          headers,
          body: CLUSTER === 'mainnet' ? JSON.stringify([{ address: walletAddress }]) : undefined,
        });
        // DO NOT local cache the result, because it can be tampered with and bypass the checks.
        const respJSON = await resp.json();
        const isSanctioned = Array.isArray(respJSON)
          ? respJSON.some((item) => item.address === walletAddress && item.isSanctioned)
          : false;

        memCache[walletAddress] = isSanctioned;

        return isSanctioned;
      }
    },
    [walletAddress],
  );
}
