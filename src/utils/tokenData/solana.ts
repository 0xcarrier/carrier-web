import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey, Connection } from '@solana/web3.js';
import { getMetaplexData, getSolanaConnection } from '../solana';
import { createNFTData, createTokenData } from './helper';

async function solanaNFTToNFTParsedTokenAccount(data: {
  ownerAddress: PublicKey;
  mintKey: PublicKey;
  symbol: string;
  name: string;
  uri: string;
  logo?: string;
  externalUrl?: string;
  image?: string;
  description?: string;
}) {
  const { ownerAddress, mintKey, symbol, name, uri, logo, externalUrl, image, description } = data;

  return createNFTData({
    ownerAddress: ownerAddress.toString(),
    nftAddress: mintKey.toBase58(),
    amount: '1',
    decimals: 0,
    uiAmount: 1,
    uiAmountString: '1',
    symbol,
    name,
    uri,
    logo,
    external_url: externalUrl,
    image,
    description,
  });
}

async function solanaTokenToParsedTokenAccount(data: {
  ownerAddress: PublicKey;
  amount: string;
  uiAmount: number;
  uiAmountString: string;
  mintKey: PublicKey;
  symbol: string;
  name: string;
  decimals: number;
  logo?: string;
}) {
  const { ownerAddress, mintKey, symbol, name, decimals, logo, amount, uiAmount, uiAmountString } = data;

  return createTokenData(
    ownerAddress.toBase58(),
    mintKey.toBase58(),
    amount,
    decimals,
    uiAmount,
    uiAmountString,
    symbol,
    name,
    logo,
  );
}

export async function getSplParsedTokenAccounts(connection: Connection, walletAddress: string) {
  const splParsedTokenAccounts = await connection.getParsedTokenAccountsByOwner(new PublicKey(walletAddress), {
    programId: new PublicKey(TOKEN_PROGRAM_ID),
  });

  return splParsedTokenAccounts;
}

export async function getTokenDataByTokenMint(options: { tokenMint: string; walletAddress: string }) {
  const { tokenMint, walletAddress } = options;
  const connection = getSolanaConnection();
  const tokenMintKey = new PublicKey(tokenMint);
  const tokenMintInfo = await connection.getParsedAccountInfo(tokenMintKey);
  const decimals =
    tokenMintInfo.value?.data && 'parsed' in tokenMintInfo.value.data
      ? tokenMintInfo.value.data.parsed.info.decimals
      : undefined;

  if (!tokenMintInfo.value || !decimals) {
    return;
  }

  const tokenAccounts = await getSplParsedTokenAccounts(connection, walletAddress);
  const tokenAccountsWithMintKey = tokenAccounts.value.map((item) => {
    return {
      mintKey: item.account.data.parsed?.info?.mint,
      amount: item.account.data.parsed?.info?.tokenAmount?.amount,
      uiAmount: item.account.data.parsed?.info?.tokenAmount?.uiAmount,
      uiAmountString: item.account.data.parsed?.info?.tokenAmount?.uiAmountString,
    };
  });

  const tokenAccount = tokenAccountsWithMintKey.find((item) => item.mintKey && item.mintKey.toString() === tokenMint);

  const { amount, uiAmount, uiAmountString } = tokenAccount || {};

  const metaplexDatas = await getMetaplexData([tokenMint]);
  const metaplexData = metaplexDatas.find((item) => item.address === tokenMint);
  const symbol = metaplexData?.json?.symbol || metaplexData?.symbol || '';
  const name = metaplexData?.json?.name || metaplexData?.name || '';
  const logo = metaplexData?.logoURI;

  if (symbol == null || name == null || decimals == null) {
    return;
  }
  const parsedTokenAccount = await solanaTokenToParsedTokenAccount({
    ownerAddress: new PublicKey(walletAddress),
    mintKey: tokenMintKey,
    amount: amount || '0',
    uiAmount: uiAmount || 0,
    uiAmountString: uiAmountString || '0',
    symbol,
    name,
    decimals,
    logo,
  });

  return parsedTokenAccount;
}

export async function getNFTDataByTokenMint(options: { tokenMint: string }) {
  const { tokenMint } = options;
  const connection = getSolanaConnection();
  const tokenMintKey = new PublicKey(tokenMint);
  const tokenMintInfo = await connection.getParsedAccountInfo(tokenMintKey);
  const owner: string | undefined =
    tokenMintInfo.value?.data && 'parsed' in tokenMintInfo.value.data
      ? tokenMintInfo.value.data.parsed.info.owner
      : undefined;

  if (!tokenMintInfo.value || !owner) {
    return;
  }

  const metaplexDatas = await getMetaplexData([tokenMint]);
  const metaplexData = metaplexDatas.find((item) => item.address === tokenMint);
  const symbol = metaplexData?.json?.symbol || metaplexData?.symbol || '';
  const name = metaplexData?.json?.name || metaplexData?.name || '';
  const uri = metaplexData?.uri;
  const logo = metaplexData?.logoURI;

  const external_url = metaplexData?.json?.external_url || '';
  const image = metaplexData?.json?.image || '';
  const description = metaplexData?.json?.description || '';

  if (uri == null) {
    return;
  }

  const parsedTokenAccount = await solanaNFTToNFTParsedTokenAccount({
    ownerAddress: new PublicKey(owner),
    mintKey: tokenMintKey,
    symbol,
    name,
    uri,
    logo,
    externalUrl: external_url,
    image,
    description,
  });

  return parsedTokenAccount;
}
