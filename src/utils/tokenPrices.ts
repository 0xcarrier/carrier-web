import { PolkachainTokens } from './tokenData/mrl';
import uniq from 'lodash/uniq';

const COINGECKO_PRICE_API_URL = 'https://api.coingecko.com/api/v3/simple/price';
const MRL_TOKEN_IDS = Object.values(PolkachainTokens)
  .flat()
  .map((item) => item.coingeckoId);

const COINGECKO_TOKEN_IDS = uniq(
  [
    'solana',
    'ethereum',
    'usd-coin',
    'tether',
    'curve-dao-token',
    'binancecoin',
    'matic-network',
    'avalanche-2',
    'oasis-network',
    'fantom',
    'klay-token',
    'celo',
    //below not supported but required for native calc
    'fantom',
    'karura',
    'acala',
    'moonbeam',
  ].concat(MRL_TOKEN_IDS),
);

export type TokenPrice = {
  [id: string]: {
    usd: number;
  };
};

export async function fetchTokenPrices() {
  try {
    const response = await fetch(`${COINGECKO_PRICE_API_URL}?ids=${COINGECKO_TOKEN_IDS}&vs_currencies=usd`);
    const result = (await response.json()) as TokenPrice;

    return result;
  } catch (error) {
    console.error(error);
    throw error;
  }
}
