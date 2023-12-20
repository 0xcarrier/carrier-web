import { Connection } from '@solana/web3.js';
import { getSolanaConnection } from '../../solana';
import { ChainId } from '../types';

const DEFAULT_CHAIN_ID = ChainId.MAINNET;
const DEFAULT_API_URL = 'https://token-list-api.solana.cloud';
const DEFAULT_CDN_URL = 'https://cdn.jsdelivr.net/gh/solflare-wallet/token-list/solana-tokenlist.json';
const DEFAULT_TIMEOUT = 2000;

export class UtlConfig {
  /**
   * Chain id - unique chain id (mainnet 101, testnet 102, devnet 103)
   */
  chainId = DEFAULT_CHAIN_ID;

  /**
   * Solana web3 connection
   */
  connection = getSolanaConnection();

  /**
   * URL of unified token list backend
   */
  apiUrl = DEFAULT_API_URL;

  /**
   * URL where unified token list JSON is hosted
   */
  cdnUrl = DEFAULT_CDN_URL;

  /**
   * Number of miliseconds to wait for token list backend to respond
   */
  timeout = DEFAULT_TIMEOUT;

  constructor(configOverrides: Partial<UtlConfig> = {}) {
    Object.assign(this, configOverrides);
  }
}
