import { useData } from './useData';

const BLOCKED_WALLETS = process.env.BLOCKED_WALLETS;
const TRMLABS_KEY = process.env.TRMLABS_KEY;

export const blockedWallets: string[] =
  BLOCKED_WALLETS && typeof BLOCKED_WALLETS === 'string' ? BLOCKED_WALLETS.split(',') : [];

export function useWalletBlackList(options: { walletAddress?: string }) {
  const { walletAddress } = options;

  return useData(
    async (signal) => {
      if (walletAddress) {
        if (blockedWallets.includes(walletAddress)) {
          return true;
        }

        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };

        if (TRMLABS_KEY && typeof TRMLABS_KEY === 'string') {
          headers['Authorization'] = `Basic ${TRMLABS_KEY}`;
        }

        const resp = await fetch(`https://api.trmlabs.com/public/v1/sanctions/screening`, {
          signal,
          method: 'POST',
          headers,
          body: JSON.stringify([{ address: walletAddress }]),
        });
        // DO NOT cache the result, because it can be tampered with and bypass the checks.
        const respJSON = await resp.json();
        const isSanctioned = Array.isArray(respJSON)
          ? respJSON.some((item) => item.address === walletAddress && item.isSanctioned)
          : false;

        return isSanctioned;
      }
    },
    [walletAddress],
  );
}
