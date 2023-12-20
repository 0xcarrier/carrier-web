import { BigNumber } from '@ethersproject/bignumber';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { MintLayout } from '@solana/spl-token';
import { AccountInfo, Connection, PublicKey } from '@solana/web3.js';

import { TransactionStatus } from '../context/Wallet/types';
import { CLUSTER, SOLANA_HOST } from './consts';
import { ChainId, Client, UtlConfig } from './solanaMetadata';

export async function getMetaplexData(mintAddresses: string[]) {
  const connection = getSolanaConnection();

  // wormhole uses Devnet solana in their testnet setup
  const solanaChainId = CLUSTER === 'mainnet' ? ChainId.MAINNET : ChainId.DEVNET;

  const config = new UtlConfig({
    /**
     * 101 - mainnet, 102 - testnet, 103 - devnet
     */
    chainId: solanaChainId,
    /**
     * number of miliseconds to wait until falling back to CDN
     */
    timeout: 2000,
    /**
     * Solana web3 Connection
     */
    connection,
    /**
     * Backend API url which is used to query tokens
     */
    apiUrl: 'https://token-list-api.solana.cloud',
    /**
     * CDN hosted static token list json which is used in case backend is down
     */
    cdnUrl: 'https://cdn.jsdelivr.net/gh/solflare-wallet/token-list/solana-tokenlist.json',
  });

  const utl = new Client(config);

  const mintkeys = mintAddresses.map((item) => {
    // @TODO might have an error if one of the item is a evm address
    // console.log('item: ', item);
    const address = new PublicKey(item);
    return address;
  });

  const tokens = await utl.fetchMints(mintkeys);

  return tokens;
}

export interface ExtractedMintInfo {
  mintAuthority?: string;
  supply?: string;
}

export function extractMintInfo(account: AccountInfo<Buffer>): ExtractedMintInfo {
  const data = Buffer.from(account.data);
  const mintInfo = MintLayout.decode(data);

  const uintArray = mintInfo?.mintAuthority;
  const pubkey = new PublicKey(uintArray);
  const supply = BigNumber.from(mintInfo?.supply).toString();
  const output = {
    mintAuthority: pubkey?.toString(),
    supply: supply.toString(),
  };

  return output;
}

export async function getMultipleAccountsRPC(
  connection: Connection,
  pubkeys: PublicKey[],
): Promise<(AccountInfo<Buffer> | null)[]> {
  return getMultipleAccounts(connection, pubkeys, 'confirmed');
}

export async function getMultipleAccounts(connection: any, pubkeys: PublicKey[], commitment: string) {
  return (
    await Promise.all(chunks(pubkeys, 99).map((chunk) => connection.getMultipleAccountsInfo(chunk, commitment)))
  ).flat();
}

export function chunks<T>(array: T[], size: number): T[][] {
  return Array.apply<number, T[], T[][]>(0, new Array(Math.ceil(array.length / size))).map((_, index) =>
    array.slice(index * size, (index + 1) * size),
  );
}

export function shortenAddress(address: string) {
  return address.length > 10 ? `${address.slice(0, 4)}...${address.slice(-4)}` : address;
}

export function isValidSolanaAddress(address: string) {
  try {
    const publicKey = new PublicKey(address);

    return publicKey != null;
  } catch (err) {
    return false;
  }
}

export async function getTokenAccounts(walletAddress: PublicKey) {
  const connection = getSolanaConnection();

  const result = await connection.getParsedTokenAccountsByOwner(walletAddress, {
    programId: new PublicKey(TOKEN_PROGRAM_ID),
  });

  return result;
}

export interface TokenAmount {
  amount: string;
  decimals: number;
  uiAmount: number;
  uiAmountString: string;
}

export async function getTokenAmount(walletAddress: PublicKey, mintKey: PublicKey): Promise<TokenAmount | undefined> {
  const result = await getTokenAccounts(walletAddress);

  const tokenAccount = result.value.find((item) => {
    const existedTokenMintKey = item.account.data.parsed?.info?.mint;

    return existedTokenMintKey ? existedTokenMintKey === mintKey.toBase58() : false;
  });

  if (tokenAccount) {
    const tokenAmount = tokenAccount.account.data.parsed?.info?.tokenAmount;

    return tokenAmount;
  }

  return undefined;
}

let solConnection: Connection | undefined = undefined;

export function getSolanaConnection() {
  if (solConnection) {
    return solConnection;
  }

  const connection = new Connection(SOLANA_HOST, { commitment: 'confirmed' });

  return connection;
}

export async function getSolanaTransaction(options: { txHash: string }) {
  const { txHash } = options;
  const connection = getSolanaConnection();

  return connection.getTransaction(txHash);
}

export async function getSolanaTransactionStatus(options: { txHash: string }) {
  const { txHash } = options;
  const connection = getSolanaConnection();

  const result = await connection.getSignatureStatus(txHash, {
    searchTransactionHistory: true,
  });

  return result.value?.err
    ? TransactionStatus.Failed
    : result.value?.confirmationStatus === 'confirmed' ||
      result.value?.confirmationStatus === 'processed' ||
      result.value?.confirmationStatus === 'finalized'
    ? TransactionStatus.Successful
    : TransactionStatus.Pending;
}
