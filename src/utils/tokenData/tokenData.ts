import {
  CHAIN_ID_ACALA,
  CHAIN_ID_ALGORAND,
  CHAIN_ID_ARBITRUM,
  CHAIN_ID_AURORA,
  CHAIN_ID_AVAX,
  CHAIN_ID_BASE,
  CHAIN_ID_BSC,
  CHAIN_ID_CELO,
  CHAIN_ID_ETH,
  CHAIN_ID_FANTOM,
  CHAIN_ID_KARURA,
  CHAIN_ID_KLAYTN,
  CHAIN_ID_MOONBEAM,
  CHAIN_ID_OASIS,
  CHAIN_ID_POLYGON,
  CHAIN_ID_SOLANA,
  ethers_contracts,
  WSOL_ADDRESS,
  WSOL_DECIMALS,
} from '@certusone/wormhole-sdk';
import {
  ACA_ADDRESS,
  ACA_DECIMALS,
  ASSET_SERVICE_GET_TOKENS_URL,
  BLOCKSCOUT_GET_TOKENS_URL,
  CELO_ADDRESS,
  CELO_DECIMALS,
  COVALENT_GET_TOKENS_URL,
  getDefaultNativeCurrencyAddress,
  getDefaultNativeCurrencyLogo,
  KAR_ADDRESS,
  KAR_DECIMALS,
  MOONBEAM_ADDRESS,
  MOONBEAM_DECIMALS,
  WAVAX_ADDRESS,
  WAVAX_DECIMALS,
  WBNB_ADDRESS,
  WBNB_DECIMALS,
  WETH_ADDRESS,
  WETH_ARBITRUM_ADDRESS,
  WETH_ARBITRUM_DECIMALS,
  WETH_AURORA_ADDRESS,
  WETH_AURORA_DECIMALS,
  WETH_DECIMALS,
  WFTM_ADDRESS,
  WFTM_DECIMALS,
  WKLAY_ADDRESS,
  WKLAY_DECIMALS,
  WMATIC_ADDRESS,
  WMATIC_DECIMALS,
  WROSE_ADDRESS,
  WROSE_DECIMALS,
  CarrierChainId,
  WETH_BASE_ADDRESS,
  WETH_BASE_DECIMALS,
  isDefaultCurrencyIsNativeCurrency,
} from '../consts';
import { getSplParsedTokenAccounts } from './solana';
import { ethers } from 'ethers';
import { Connection } from '@solana/web3.js';
import {
  createTokenData,
  getTokenContractAddressFromLocal,
  NFTData,
  removeTokenContractAddressesToLocal,
  saveTokenContractAddressesToLocal,
  TokenCacheData,
  TokenData,
} from './helper';
import { getEthNFTParsedTokenAccounts, getEthTokensParsedTokenAccounts } from './ethereum';
import { extractMintInfo, getMetaplexData, getMultipleAccountsRPC } from '../solana';
import { PublicKey, AccountInfo, ParsedAccountData } from '@solana/web3.js';
import sortBy from 'lodash/sortBy';
import { fetchSingleMetadata } from './algorand';
import { Algodv2 } from 'algosdk';
import { PolkachainToken, PolkachainTokens } from './mrl';

export type CovalentData = {
  contract_decimals: number;
  contract_ticker_symbol: string;
  contract_name: string;
  contract_address: string;
  logo_url: string | undefined;
  balance: string;
  quote: number | undefined;
  quote_rate: number | undefined;
  nft_data?: CovalentNFTData[];
};

export type CovalentNFTExternalData = {
  animation_url: string | null;
  external_url: string | null;
  image: string;
  image_256: string;
  name: string;
  description: string;
};

export type CovalentNFTData = {
  token_id: string;
  token_balance: string;
  external_data: CovalentNFTExternalData;
  token_url: string;
};

async function getEthereumAccountsCovalent(
  url: string,
  nft: boolean,
  chainId: CarrierChainId,
): Promise<CovalentData[]> {
  const output = [] as CovalentData[];
  const resp = await fetch(url);
  const respJson = await resp.json();
  const tokens = respJson.data?.items;

  if (tokens instanceof Array && tokens.length) {
    for (const item of tokens) {
      // TODO: filter?
      if (
        item.contract_decimals !== undefined &&
        item.contract_address &&
        item.contract_address.toLowerCase() !== getDefaultNativeCurrencyAddress(chainId).toLowerCase() && // native balance comes from querying token bridge
        item.balance &&
        item.balance !== '0' &&
        !item.native_token &&
        (nft ? item.supports_erc?.includes('erc721') : item.supports_erc?.includes('erc20'))
      ) {
        output.push({ ...item } as CovalentData);
      }
    }
  }

  return output;
}

async function getEthereumAccountsBlockscout(
  url: string,
  nft: boolean,
  chainId: CarrierChainId,
): Promise<CovalentData[]> {
  const output = [] as CovalentData[];
  const resp = await fetch(url);
  const respJson = await resp.json();
  const tokens = respJson.result;

  if (tokens instanceof Array && tokens.length) {
    for (const item of tokens) {
      if (
        item.decimals !== undefined &&
        item.contractAddress &&
        item.contractAddress.toLowerCase() !== getDefaultNativeCurrencyAddress(chainId).toLowerCase() && // native balance comes from querying token bridge
        item.balance &&
        item.balance !== '0' &&
        (nft ? item.type?.includes('ERC-721') : item.type?.includes('ERC-20'))
      ) {
        output.push({
          contract_decimals: item.decimals,
          contract_address: item.contractAddress,
          balance: item.balance,
          contract_ticker_symbol: item.symbol,
          contract_name: item.name,
          logo_url: '',
          quote: 0,
          quote_rate: 0,
        });
      }
    }
  }

  return output;
}

async function getTokenFromTokenContracts(options: {
  isNFT: boolean;
  chainId: CarrierChainId;
  walletAddress: string;
  contracts?: TokenCacheData[];
}) {
  const { isNFT, chainId, walletAddress, contracts } = options;
  const result:
    | {
        parsedTokenAccounts: (NFTData | TokenData)[];
        errors: {
          tokenAddress: string;
          tokenId?: string;
          error: Error;
        }[];
      }
    | undefined = contracts
    ? await (isNFT
        ? getEthNFTParsedTokenAccounts({ tokens: contracts, chainId, signerAddress: walletAddress })
        : getEthTokensParsedTokenAccounts({ tokens: contracts, chainId, signerAddress: walletAddress }))
    : undefined;

  const tokenNonExistedErrors = result
    ? result.errors.filter((item) => {
        return item.error.message.includes('nonexistent token');
      })
    : undefined;
  const otherErrors = result
    ? result.errors.filter((item) => {
        return !item.error.message.includes('nonexistent token');
      })
    : [];

  if (tokenNonExistedErrors && tokenNonExistedErrors.length) {
    removeTokenContractAddressesToLocal({
      tokens: tokenNonExistedErrors.map((item) => {
        return { contractAddress: item.tokenAddress, tokenId: item.tokenId };
      }),
      chainId,
      walletAddress,
      isNFT,
    });
  }

  console.log('covalent parsedAccounts result', result);

  const filteredResult = {
    parsedTokenAccounts: result
      ? isNFT
        ? result.parsedTokenAccounts.filter((item) => {
            return item.uiAmount !== 0;
          })
        : result.parsedTokenAccounts
      : [],
    errors: otherErrors,
  };

  filteredResult.parsedTokenAccounts.sort((a, b) => {
    const nameOrder =
      !a.name && b.name
        ? 1
        : a.name && !b.name
        ? -1
        : a.name && b.name
        ? a.name > b.name
          ? 1
          : a.name < b.name
          ? -1
          : undefined
        : undefined;
    const contractOrder = a.tokenAddress > b.tokenAddress ? 1 : a.tokenAddress < b.tokenAddress ? -1 : 0;

    return nameOrder || contractOrder;
  });

  return filteredResult;
}

export async function getParsedTokenAccountFromCovalent(options: {
  chainId: CarrierChainId;
  walletAddress: string;
  isNFT: boolean;
  includeTokens?: TokenCacheData[];
}): Promise<ReturnType<typeof getTokenFromTokenContracts>> {
  const { chainId, walletAddress, isNFT, includeTokens } = options;
  let url = ASSET_SERVICE_GET_TOKENS_URL(chainId, walletAddress, isNFT);
  let getAccounts = getEthereumAccountsCovalent;

  if (!url) {
    url = COVALENT_GET_TOKENS_URL(chainId, walletAddress, isNFT);
    getAccounts = getEthereumAccountsCovalent;
  }

  if (!url) {
    url = BLOCKSCOUT_GET_TOKENS_URL(chainId, walletAddress);
    getAccounts = getEthereumAccountsBlockscout;
  }

  const accounts = url ? await getAccounts(url, isNFT, chainId) : undefined;
  const contracts: { contractAddress: string; tokenIds?: string[] }[] | undefined = accounts
    ? isNFT
      ? accounts.map((item) => {
          return {
            contractAddress: ethers.utils.getAddress(item.contract_address),
            tokenIds: item.nft_data?.map((nft) => nft.token_id),
          };
        })
      : accounts.map((account) => {
          return { contractAddress: ethers.utils.getAddress(account.contract_address) };
        })
    : undefined;
  const nativeToken = getDefaultNativeCurrencyAddress(chainId);
  const filteredTokens = contracts
    ? filterTokens({ tokens: contracts, includeTokens, excludeTokens: [{ contractAddress: nativeToken }] })
    : undefined;

  if (filteredTokens) {
    saveTokenContractAddressesToLocal({
      tokens: filteredTokens,
      chainId: chainId,
      walletAddress,
      isNFT,
    });
  }

  const result = await getTokenFromTokenContracts({ isNFT, chainId, walletAddress, contracts: filteredTokens });

  return result;
}

function filterTokens(options: {
  tokens: TokenCacheData[];
  includeTokens?: TokenCacheData[];
  excludeTokens?: TokenCacheData[];
}) {
  const { tokens, includeTokens, excludeTokens } = options;

  const filteredContracts =
    includeTokens || excludeTokens
      ? (tokens
          .map((item) => {
            const includeToken = includeTokens?.find(
              (includeToken) => includeToken.contractAddress.toLowerCase() === item.contractAddress.toLowerCase(),
            );
            const excludeToken = excludeTokens?.find(
              (excludeToken) => excludeToken.contractAddress.toLowerCase() === item.contractAddress.toLowerCase(),
            );
            const matchedTokenIds =
              includeToken || excludeToken
                ? item.tokenIds && includeToken?.tokenIds
                  ? item.tokenIds.filter((tokenId) => includeToken.tokenIds?.includes(tokenId))
                  : item.tokenIds && excludeToken?.tokenIds
                  ? item.tokenIds.filter((tokenId) => !excludeToken.tokenIds?.includes(tokenId))
                  : undefined
                : undefined;

            return includeToken
              ? {
                  contractAddress: includeToken.contractAddress,
                  tokenIds: matchedTokenIds,
                }
              : excludeToken
              ? excludeToken.tokenIds
                ? {
                    contractAddress: excludeToken.contractAddress,
                    tokenIds: matchedTokenIds,
                  }
                : undefined
              : item;
          })
          .filter((item) => item != null) as TokenCacheData[])
      : tokens;

  return filteredContracts;
}

export async function getEvmTokens(options: {
  chainId: CarrierChainId;
  walletAddress: string;
  isNFT: boolean;
  includeTokens?: TokenCacheData[];
}): Promise<ReturnType<typeof getTokenFromTokenContracts>> {
  const { chainId, walletAddress, isNFT, includeTokens } = options;

  const contracts = getTokenContractAddressFromLocal({
    chainId,
    walletAddress,
    isNFT,
  });
  const nativeToken = getDefaultNativeCurrencyAddress(chainId);
  const filteredContracts = filterTokens({
    tokens: contracts,
    includeTokens,
    excludeTokens: [{ contractAddress: nativeToken }],
  });

  console.log('cache tokenContractAddresses result', contracts);

  const result = await getTokenFromTokenContracts({ isNFT, chainId, walletAddress, contracts: filteredContracts });

  return result;
}

export async function getSolTokens(options: {
  connection: Connection;
  walletAddress: string;
  isNFT: boolean;
  includeTokens?: TokenCacheData[];
}) {
  const { connection, walletAddress, isNFT, includeTokens } = options;
  // No matter what, we retrieve the spl tokens associated to this address.
  const tokenAccounts = await getSplParsedTokenAccounts(connection, walletAddress);

  const splParsedTokenAccounts = tokenAccounts.value
    .filter((item) => {
      return includeTokens
        ? includeTokens.find(
            (includeToken) => includeToken.contractAddress.toLowerCase() === item.pubkey.toBase58().toLowerCase(),
          ) != null
        : true;
    })
    .map((item) => createParsedTokenAccountFromInfo(item.pubkey, item.account));

  const mintKeys = splParsedTokenAccounts.map((item) => item.tokenAddress);

  const filteredTokenAccounts = isNFT
    ? splParsedTokenAccounts.filter((item) => {
        return item.decimals === 0 && item.uiAmount === 1;
      })
    : splParsedTokenAccounts.filter((item) => {
        return item.decimals !== 0;
      });

  const metadatas = await getMetaplexData(mintKeys);

  const filteredTokenAccountsWithMetadata: (TokenData | NFTData)[] = filteredTokenAccounts.map((item) => {
    const metadata = metadatas.find((meta) => meta.address === item.tokenAddress);
    const symbol = metadata?.json?.symbol || metadata?.symbol || '';
    const name = metadata?.json?.name || metadata?.name || '';
    const uri = metadata?.uri;

    const external_url = metadata?.json?.external_url || '';
    const image = metadata?.json?.image || '';
    const description = metadata?.json?.description || '';

    return {
      symbol,
      name,
      uri,
      external_url,
      image,
      description,
      ...item,
    };
  });

  const parsedTokenAccounts = sortBy(filteredTokenAccountsWithMetadata, ['symbol', 'mintKey']);

  const mintAddresses = parsedTokenAccounts.map((item) => item.tokenAddress);

  const mintAccounts = await getMultipleAccountsRPC(
    connection,
    mintAddresses.map((x) => new PublicKey(x)),
  );

  mintAccounts.forEach((result, index) => {
    const mintAddress = mintAddresses[index];
    const parsedTokenAccount = parsedTokenAccounts.find((item) => item.tokenAddress === mintAddress);

    if (parsedTokenAccount) {
      const mintAccount = (result && extractMintInfo(result)) || undefined;

      parsedTokenAccount.mintAccount = mintAccount;
    }
  });

  return { parsedTokenAccounts, errors: [] };
}

const createParsedTokenAccountFromInfo = (pubkey: PublicKey, item: AccountInfo<ParsedAccountData>): TokenData => {
  return {
    ownerAddress: pubkey?.toString(),
    tokenAddress: item.data.parsed?.info?.mint?.toString(),
    amount: item.data.parsed?.info?.tokenAmount?.amount,
    decimals: item.data.parsed?.info?.tokenAmount?.decimals,
    uiAmount: item.data.parsed?.info?.tokenAmount?.uiAmount,
    uiAmountString: item.data.parsed?.info?.tokenAmount?.uiAmountString,
  };
};

export async function getParachainTokens(options: {
  chainId: CarrierChainId;
  walletAddress: string;
  isNFT: boolean;
  includeTokens?: TokenCacheData[];
}) {
  const { chainId, walletAddress, isNFT, includeTokens } = options;

  if (isNFT) {
    return { parsedTokenAccounts: [], errors: [] };
  }

  const parachainTokens = PolkachainTokens[chainId];
  const filteredParachainTokens = (
    parachainTokens?.filter((item) => {
      return includeTokens
        ? includeTokens.find(
            (includeToken) => item.assetId && includeToken.contractAddress.toLowerCase() === item.assetId,
          ) != null
        : true;
    }) || []
  ).sort((a, b) => {
    const nameOrder =
      !a.name && b.name
        ? 1
        : a.name && !b.name
        ? -1
        : a.name && b.name
        ? a.name > b.name
          ? 1
          : a.name < b.name
          ? -1
          : undefined
        : undefined;
    const contractOrder = a.assetId > b.assetId ? 1 : a.assetId < b.assetId ? -1 : 0;

    return nameOrder || contractOrder;
  });
  const errors: { tokenAddress: string; error: Error }[] = [];
  const parsedTokenAccounts = (
    await Promise.all(
      filteredParachainTokens.map((token) =>
        createParachainTokenParsedTokenAccount({ chainId, token, walletAddress }).catch((e) => {
          console.error(e);

          errors.push({ tokenAddress: `${token.assetId}`, error: e });

          return undefined;
        }),
      ),
    )
  ).filter((item) => item != null) as TokenData[];

  return { parsedTokenAccounts, errors };
}

export async function createParachainTokenParsedTokenAccount(options: {
  chainId: CarrierChainId;
  token: PolkachainToken;
  walletAddress: string;
}) {
  const { chainId, token, walletAddress } = options;
  const { assetId, symbol, name, logo, decimals } = token;
  const balanceInWei = await token.getBalance({ chainId, assetId, walletAddress });
  const balanceInEther = ethers.utils.formatUnits(balanceInWei, decimals);

  return createTokenData(
    walletAddress, //publicKey
    `${assetId}`, //Mint key
    balanceInWei, //amount
    decimals, //decimals, 9
    parseFloat(balanceInEther),
    balanceInEther.toString(),
    symbol,
    name,
    logo,
    token.isNative,
    token.isNative,
  );
}

export async function createNativeSolParsedTokenAccount(connection: Connection, walletAddress: string) {
  // const walletAddress = "H69q3Q8E74xm7swmMQpsJLVp2Q9JuBwBbxraAMX5Drzm" // known solana mainnet wallet with tokens
  const fetchAccounts = await getMultipleAccountsRPC(connection, [new PublicKey(walletAddress)]);

  if (fetchAccounts && fetchAccounts.length && fetchAccounts[0]) {
    return createTokenData(
      walletAddress, //publicKey
      WSOL_ADDRESS, //Mint key
      fetchAccounts[0].lamports.toString(), //amount
      WSOL_DECIMALS, //decimals, 9
      parseFloat(ethers.utils.formatUnits(fetchAccounts[0].lamports, WSOL_DECIMALS)),
      ethers.utils.formatUnits(fetchAccounts[0].lamports, WSOL_DECIMALS).toString(),
      'SOL',
      'Solana',
      getDefaultNativeCurrencyLogo(CHAIN_ID_SOLANA),
      isDefaultCurrencyIsNativeCurrency(CHAIN_ID_SOLANA),
    );
  }
}

export const createNativeEthParsedTokenAccount = (
  provider: ethers.providers.StaticJsonRpcProvider,
  signerAddress: string | undefined,
) => {
  return !(provider && signerAddress)
    ? Promise.reject()
    : provider.getBalance(signerAddress).then((balanceInWei) => {
        const balanceInEth = ethers.utils.formatEther(balanceInWei);
        return createTokenData(
          signerAddress, //public key
          WETH_ADDRESS, //Mint key, On the other side this will be WETH, so this is hopefully a white lie.
          balanceInWei.toString(), //amount, in wei
          WETH_DECIMALS, //Luckily both ETH and WETH have 18 decimals, so this should not be an issue.
          parseFloat(balanceInEth), //This loses precision, but is a limitation of the current datamodel. This field is essentially deprecated
          balanceInEth.toString(), //This is the actual display field, which has full precision.
          'ETH', //A white lie for display purposes
          'Ethereum', //A white lie for display purposes
          getDefaultNativeCurrencyLogo(CHAIN_ID_ETH),
          isDefaultCurrencyIsNativeCurrency(CHAIN_ID_ETH), //isNativeAsset
          true,
        );
      });
};

export function createNativeBscParsedTokenAccount(
  provider: ethers.providers.StaticJsonRpcProvider,
  signerAddress: string | undefined,
) {
  return !(provider && signerAddress)
    ? Promise.reject()
    : provider.getBalance(signerAddress).then((balanceInWei) => {
        const balanceInEth = ethers.utils.formatEther(balanceInWei);
        return createTokenData(
          signerAddress, //public key
          WBNB_ADDRESS, //Mint key, On the other side this will be WBNB, so this is hopefully a white lie.
          balanceInWei.toString(), //amount, in wei
          WBNB_DECIMALS, //Luckily both BNB and WBNB have 18 decimals, so this should not be an issue.
          parseFloat(balanceInEth), //This loses precision, but is a limitation of the current datamodel. This field is essentially deprecated
          balanceInEth.toString(), //This is the actual display field, which has full precision.
          'BNB', //A white lie for display purposes
          'Binance Coin', //A white lie for display purposes
          getDefaultNativeCurrencyLogo(CHAIN_ID_BSC),
          isDefaultCurrencyIsNativeCurrency(CHAIN_ID_BSC), //isNativeAsset
          true,
        );
      });
}

export function createNativePolygonParsedTokenAccount(
  provider: ethers.providers.StaticJsonRpcProvider,
  signerAddress: string | undefined,
) {
  return !(provider && signerAddress)
    ? Promise.reject()
    : provider.getBalance(signerAddress).then((balanceInWei) => {
        const balanceInEth = ethers.utils.formatEther(balanceInWei);
        return createTokenData(
          signerAddress, //public key
          WMATIC_ADDRESS, //Mint key, On the other side this will be WMATIC, so this is hopefully a white lie.
          balanceInWei.toString(), //amount, in wei
          WMATIC_DECIMALS, //Luckily both MATIC and WMATIC have 18 decimals, so this should not be an issue.
          parseFloat(balanceInEth), //This loses precision, but is a limitation of the current datamodel. This field is essentially deprecated
          balanceInEth.toString(), //This is the actual display field, which has full precision.
          'MATIC', //A white lie for display purposes
          'Matic', //A white lie for display purposes
          getDefaultNativeCurrencyLogo(CHAIN_ID_POLYGON),
          isDefaultCurrencyIsNativeCurrency(CHAIN_ID_POLYGON), //isNativeAsset
          true,
        );
      });
}

export function createNativeAvaxParsedTokenAccount(
  provider: ethers.providers.StaticJsonRpcProvider,
  signerAddress: string | undefined,
) {
  return !(provider && signerAddress)
    ? Promise.reject()
    : provider.getBalance(signerAddress).then((balanceInWei) => {
        const balanceInEth = ethers.utils.formatEther(balanceInWei);
        return createTokenData(
          signerAddress, //public key
          WAVAX_ADDRESS, //Mint key, On the other side this will be wavax, so this is hopefully a white lie.
          balanceInWei.toString(), //amount, in wei
          WAVAX_DECIMALS,
          parseFloat(balanceInEth), //This loses precision, but is a limitation of the current datamodel. This field is essentially deprecated
          balanceInEth.toString(), //This is the actual display field, which has full precision.
          'AVAX', //A white lie for display purposes
          'Avalanche', //A white lie for display purposes
          getDefaultNativeCurrencyLogo(CHAIN_ID_AVAX),
          isDefaultCurrencyIsNativeCurrency(CHAIN_ID_AVAX), //isNativeAsset
          true,
        );
      });
}

export function createNativeOasisParsedTokenAccount(
  provider: ethers.providers.StaticJsonRpcProvider,
  signerAddress: string | undefined,
) {
  return !(provider && signerAddress)
    ? Promise.reject()
    : provider.getBalance(signerAddress).then((balanceInWei) => {
        const balanceInEth = ethers.utils.formatEther(balanceInWei);
        return createTokenData(
          signerAddress, //public key
          WROSE_ADDRESS, //Mint key, On the other side this will be wavax, so this is hopefully a white lie.
          balanceInWei.toString(), //amount, in wei
          WROSE_DECIMALS,
          parseFloat(balanceInEth), //This loses precision, but is a limitation of the current datamodel. This field is essentially deprecated
          balanceInEth.toString(), //This is the actual display field, which has full precision.
          'ROSE', //A white lie for display purposes
          'Rose', //A white lie for display purposes
          getDefaultNativeCurrencyLogo(CHAIN_ID_OASIS),
          isDefaultCurrencyIsNativeCurrency(CHAIN_ID_OASIS), //isNativeAsset
          true,
        );
      });
}

export function createNativeAuroraParsedTokenAccount(
  provider: ethers.providers.StaticJsonRpcProvider,
  signerAddress: string | undefined,
) {
  return !(provider && signerAddress)
    ? Promise.reject()
    : provider.getBalance(signerAddress).then((balanceInWei) => {
        const balanceInEth = ethers.utils.formatEther(balanceInWei);
        return createTokenData(
          signerAddress, //public key
          WETH_AURORA_ADDRESS, //Mint key, On the other side this will be wavax, so this is hopefully a white lie.
          balanceInWei.toString(), //amount, in wei
          WETH_AURORA_DECIMALS,
          parseFloat(balanceInEth), //This loses precision, but is a limitation of the current datamodel. This field is essentially deprecated
          balanceInEth.toString(), //This is the actual display field, which has full precision.
          'ETH', //A white lie for display purposes
          'Aurora ETH', //A white lie for display purposes
          getDefaultNativeCurrencyLogo(CHAIN_ID_AURORA),
          isDefaultCurrencyIsNativeCurrency(CHAIN_ID_AURORA), //isNativeAsset
          true,
        );
      });
}

export function createNativeFantomParsedTokenAccount(
  provider: ethers.providers.StaticJsonRpcProvider,
  signerAddress: string | undefined,
) {
  return !(provider && signerAddress)
    ? Promise.reject()
    : provider.getBalance(signerAddress).then((balanceInWei) => {
        const balanceInEth = ethers.utils.formatEther(balanceInWei);
        return createTokenData(
          signerAddress, //public key
          WFTM_ADDRESS, //Mint key, On the other side this will be wavax, so this is hopefully a white lie.
          balanceInWei.toString(), //amount, in wei
          WFTM_DECIMALS,
          parseFloat(balanceInEth), //This loses precision, but is a limitation of the current datamodel. This field is essentially deprecated
          balanceInEth.toString(), //This is the actual display field, which has full precision.
          'FTM', //A white lie for display purposes
          'Fantom', //A white lie for display purposes
          getDefaultNativeCurrencyLogo(CHAIN_ID_FANTOM),
          isDefaultCurrencyIsNativeCurrency(CHAIN_ID_FANTOM), //isNativeAsset
          true,
        );
      });
}

export function createNativeKaruraParsedTokenAccount(
  provider: ethers.providers.StaticJsonRpcProvider,
  signerAddress: string | undefined,
) {
  return !(provider && signerAddress)
    ? Promise.reject()
    : ethers_contracts.TokenImplementation__factory.connect(KAR_ADDRESS, provider)
        .balanceOf(signerAddress)
        .then((balance) => {
          const balanceInEth = ethers.utils.formatUnits(balance, KAR_DECIMALS);
          return createTokenData(
            signerAddress, //public key
            KAR_ADDRESS, //Mint key, On the other side this will be wavax, so this is hopefully a white lie.
            balance.toString(), //amount, in wei
            KAR_DECIMALS,
            parseFloat(balanceInEth), //This loses precision, but is a limitation of the current datamodel. This field is essentially deprecated
            balanceInEth.toString(), //This is the actual display field, which has full precision.
            'KAR', //A white lie for display purposes
            'KAR', //A white lie for display purposes
            getDefaultNativeCurrencyLogo(CHAIN_ID_KARURA),
            isDefaultCurrencyIsNativeCurrency(CHAIN_ID_KARURA), //isNativeAsset
            true,
          );
        });
}

export function createNativeAcalaParsedTokenAccount(
  provider: ethers.providers.StaticJsonRpcProvider,
  signerAddress: string | undefined,
) {
  return !(provider && signerAddress)
    ? Promise.reject()
    : ethers_contracts.TokenImplementation__factory.connect(ACA_ADDRESS, provider)
        .balanceOf(signerAddress)
        .then((balance) => {
          const balanceInEth = ethers.utils.formatUnits(balance, ACA_DECIMALS);
          return createTokenData(
            signerAddress, //public key
            ACA_ADDRESS, //Mint key, On the other side this will be wavax, so this is hopefully a white lie.
            balance.toString(), //amount, in wei
            ACA_DECIMALS,
            parseFloat(balanceInEth), //This loses precision, but is a limitation of the current datamodel. This field is essentially deprecated
            balanceInEth.toString(), //This is the actual display field, which has full precision.
            'ACA', //A white lie for display purposes
            'ACA', //A white lie for display purposes
            getDefaultNativeCurrencyLogo(CHAIN_ID_ACALA),
            isDefaultCurrencyIsNativeCurrency(CHAIN_ID_ACALA), //isNativeAsset
            true,
          );
        });
}

export function createNativeKlaytnParsedTokenAccount(
  provider: ethers.providers.StaticJsonRpcProvider,
  signerAddress: string | undefined,
) {
  return !(provider && signerAddress)
    ? Promise.reject()
    : provider.getBalance(signerAddress).then((balanceInWei) => {
        const balanceInEth = ethers.utils.formatEther(balanceInWei);
        return createTokenData(
          signerAddress, //public key
          WKLAY_ADDRESS, //Mint key, On the other side this will be wklay, so this is hopefully a white lie.
          balanceInWei.toString(), //amount, in wei
          WKLAY_DECIMALS,
          parseFloat(balanceInEth), //This loses precision, but is a limitation of the current datamodel. This field is essentially deprecated
          balanceInEth.toString(), //This is the actual display field, which has full precision.
          'KLAY', //A white lie for display purposes
          'KLAY', //A white lie for display purposes
          getDefaultNativeCurrencyLogo(CHAIN_ID_KLAYTN),
          isDefaultCurrencyIsNativeCurrency(CHAIN_ID_KLAYTN), //isNativeAsset
          true,
        );
      });
}

export function createNativeCeloParsedTokenAccount(
  provider: ethers.providers.StaticJsonRpcProvider,
  signerAddress: string | undefined,
) {
  // Celo has a "native asset" ERC-20
  // https://docs.celo.org/developer-guide/celo-for-eth-devs
  return !(provider && signerAddress)
    ? Promise.reject()
    : ethers_contracts.TokenImplementation__factory.connect(CELO_ADDRESS, provider)
        .balanceOf(signerAddress)
        .then((balance) => {
          const balanceInEth = ethers.utils.formatUnits(balance, CELO_DECIMALS);
          return createTokenData(
            signerAddress, //public key
            CELO_ADDRESS, //Mint key, On the other side this will be wavax, so this is hopefully a white lie.
            balance.toString(), //amount, in wei
            CELO_DECIMALS,
            parseFloat(balanceInEth), //This loses precision, but is a limitation of the current datamodel. This field is essentially deprecated
            balanceInEth.toString(), //This is the actual display field, which has full precision.
            'CELO', //A white lie for display purposes
            'CELO', //A white lie for display purposes
            getDefaultNativeCurrencyLogo(CHAIN_ID_CELO),
            isDefaultCurrencyIsNativeCurrency(CHAIN_ID_CELO), //isNativeAsset
            true,
          );
        });
}

export function createNativeArbitrumParsedTokenAccount(
  provider: ethers.providers.StaticJsonRpcProvider,
  signerAddress: string | undefined,
) {
  return !(provider && signerAddress)
    ? Promise.reject()
    : provider.getBalance(signerAddress).then((balanceInWei) => {
        const balanceInEth = ethers.utils.formatEther(balanceInWei);
        return createTokenData(
          signerAddress, //public key
          WETH_ARBITRUM_ADDRESS, //Mint key, On the other side this will be wavax, so this is hopefully a white lie.
          balanceInWei.toString(), //amount, in wei
          WETH_ARBITRUM_DECIMALS,
          parseFloat(balanceInEth), //This loses precision, but is a limitation of the current datamodel. This field is essentially deprecated
          balanceInEth.toString(), //This is the actual display field, which has full precision.
          'ETH', //A white lie for display purposes
          'Arbitrum ETH', //A white lie for display purposes
          getDefaultNativeCurrencyLogo(CHAIN_ID_ARBITRUM),
          isDefaultCurrencyIsNativeCurrency(CHAIN_ID_ARBITRUM), //isNativeAsset
          true,
        );
      });
}

export function createNativeMoonbeamParsedTokenAccount(
  provider: ethers.providers.StaticJsonRpcProvider,
  signerAddress: string | undefined,
) {
  return !(provider && signerAddress)
    ? Promise.reject()
    : provider.getBalance(signerAddress).then((balanceInWei) => {
        const balanceInEth = ethers.utils.formatEther(balanceInWei);
        return createTokenData(
          signerAddress, //public key
          // '0x0000000000006d6f6f6e626173652d616c706861', //DEV token mint key, from covalent
          MOONBEAM_ADDRESS,
          balanceInWei.toString(), //amount, in wei
          // 18, //Luckily both ETH and WETH have 18 decimals, so this should not be an issue.
          MOONBEAM_DECIMALS,
          parseFloat(balanceInEth), //This loses precision, but is a limitation of the current datamodel. This field is essentially deprecated
          balanceInEth.toString(), //This is the actual display field, which has full precision.
          'GLMR', //A white lie for display purposes
          'GLMR', //A white lie for display purposes
          getDefaultNativeCurrencyLogo(CHAIN_ID_MOONBEAM),
          isDefaultCurrencyIsNativeCurrency(CHAIN_ID_MOONBEAM), //isNativeAsset
          true,
        );
      });
}

export function createNativeBaseParsedTokenAccount(
  provider: ethers.providers.StaticJsonRpcProvider,
  signerAddress: string | undefined,
) {
  return !(provider && signerAddress)
    ? Promise.reject()
    : provider.getBalance(signerAddress).then((balanceInWei) => {
        const balanceInEth = ethers.utils.formatEther(balanceInWei);
        return createTokenData(
          signerAddress, //public key
          WETH_BASE_ADDRESS, //Mint key, On the other side this will be wavax, so this is hopefully a white lie.
          balanceInWei.toString(), //amount, in wei
          WETH_BASE_DECIMALS,
          parseFloat(balanceInEth), //This loses precision, but is a limitation of the current datamodel. This field is essentially deprecated
          balanceInEth.toString(), //This is the actual display field, which has full precision.
          'ETH', //A white lie for display purposes
          'Base ETH', //A white lie for display purposes
          getDefaultNativeCurrencyLogo(CHAIN_ID_BASE),
          isDefaultCurrencyIsNativeCurrency(CHAIN_ID_BASE), //isNativeAsset
          true,
        );
      });
}
