import {
  CHAIN_ID_ACALA,
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
} from '@certusone/wormhole-sdk';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSolanaConnection } from '../utils/solana';
import {
  ethTokenToParsedTokenAccount,
  ethNFTToNFTParsedTokenAccount,
  getEthereumTokenWithChainId,
  getEthereumNFTWithChainId,
} from '../utils/tokenData/ethereum';
import { NFTData, saveTokenContractAddressToLocal, TokenCacheData, TokenData } from '../utils/tokenData/helper';
import { getTokenDataByTokenMint } from '../utils/tokenData/solana';
import {
  createNativeAcalaParsedTokenAccount,
  createNativeArbitrumParsedTokenAccount,
  createNativeAuroraParsedTokenAccount,
  createNativeAvaxParsedTokenAccount,
  createNativeBscParsedTokenAccount,
  createNativeCeloParsedTokenAccount,
  createNativeEthParsedTokenAccount,
  createNativeFantomParsedTokenAccount,
  createNativeKaruraParsedTokenAccount,
  createNativeKlaytnParsedTokenAccount,
  createNativeMoonbeamParsedTokenAccount,
  createNativeOasisParsedTokenAccount,
  createNativePolygonParsedTokenAccount,
  createNativeSolParsedTokenAccount,
  getEvmTokens,
  getParachainTokens,
  getParsedTokenAccountFromCovalent,
  getSolTokens,
} from '../utils/tokenData/tokenData';
import {
  getEvmProviderWithWormholeChainId,
  isCarrierEVMChain,
  isCarrierPolkaChain,
  isValidEthereumAddress,
  isValidPolkachainAddress,
  isValidSolanaAddress,
} from '../utils/web3Utils';
import { DataResult, useData } from './useData';
import { getNFTDataByTokenMint } from '../utils/tokenData/solana';
import { ethers } from 'ethers';
import { PublicKey } from '@solana/web3.js';
import { CarrierChainId, getDefaultNativeCurrencyAddress } from '../utils/consts';

export async function loadNativeToken(options: { chainId: CarrierChainId; walletAddress: string }): Promise<{
  nativeTokenError:
    | {
        tokenAddress: string;
        tokenId?: string;
        error: Error;
      }
    | undefined;
  nativeTokenPromise: Promise<TokenData | undefined>;
}> {
  const { chainId, walletAddress } = options;
  const evmProvider = isCarrierEVMChain(chainId) ? getEvmProviderWithWormholeChainId(chainId) : undefined;
  const evmNativeTokenGetter =
    chainId === CHAIN_ID_ETH
      ? createNativeEthParsedTokenAccount
      : chainId === CHAIN_ID_POLYGON
      ? createNativePolygonParsedTokenAccount
      : chainId === CHAIN_ID_BSC
      ? createNativeBscParsedTokenAccount
      : chainId === CHAIN_ID_AVAX
      ? createNativeAvaxParsedTokenAccount
      : chainId === CHAIN_ID_OASIS
      ? createNativeOasisParsedTokenAccount
      : chainId === CHAIN_ID_AURORA
      ? createNativeAuroraParsedTokenAccount
      : chainId === CHAIN_ID_FANTOM
      ? createNativeFantomParsedTokenAccount
      : chainId === CHAIN_ID_KARURA
      ? createNativeKaruraParsedTokenAccount
      : chainId === CHAIN_ID_ACALA
      ? createNativeAcalaParsedTokenAccount
      : chainId === CHAIN_ID_KLAYTN
      ? createNativeKlaytnParsedTokenAccount
      : chainId === CHAIN_ID_CELO
      ? createNativeCeloParsedTokenAccount
      : chainId === CHAIN_ID_ARBITRUM
      ? createNativeArbitrumParsedTokenAccount
      : chainId === CHAIN_ID_MOONBEAM
      ? createNativeMoonbeamParsedTokenAccount
      : undefined;
  const connection = getSolanaConnection();

  const nativeTokenPromise =
    chainId === CHAIN_ID_SOLANA && isValidSolanaAddress(walletAddress)
      ? createNativeSolParsedTokenAccount(connection, walletAddress)
      : evmNativeTokenGetter && evmProvider && isValidEthereumAddress(walletAddress)
      ? evmNativeTokenGetter(evmProvider, walletAddress)
      : Promise.resolve(undefined);

  let error: Error | undefined;

  nativeTokenPromise.catch((e) => {
    console.error(e);
    error = e;
  });

  return {
    nativeTokenError: error ? { error, tokenAddress: getDefaultNativeCurrencyAddress(chainId) } : undefined,
    nativeTokenPromise,
  };
}

async function loadCachedTokens(options: {
  chainId?: CarrierChainId;
  walletAddress?: string;
  isNFT: boolean;
  includeTokens?: TokenCacheData[];
}): Promise<
  | {
      tokens: (NFTData | TokenData)[];
      errors: {
        tokenAddress: string;
        tokenId?: string;
        error: Error;
      }[];
    }
  | undefined
> {
  const { chainId, walletAddress, isNFT, includeTokens } = options;

  if (!chainId || !walletAddress) {
    return undefined;
  }

  const { nativeTokenPromise, nativeTokenError } = !isNFT
    ? await loadNativeToken({ chainId, walletAddress })
    : { nativeTokenPromise: Promise.resolve(undefined), nativeTokenError: null };

  const connection = getSolanaConnection();
  const tokensPromise =
    chainId === CHAIN_ID_SOLANA && isValidSolanaAddress(walletAddress)
      ? getSolTokens({ connection, walletAddress, isNFT, includeTokens })
      : isCarrierPolkaChain(chainId) && (await isValidPolkachainAddress(walletAddress, chainId))
      ? getParachainTokens({ chainId, walletAddress, isNFT, includeTokens })
      : isCarrierEVMChain(chainId) && isValidEthereumAddress(walletAddress)
      ? getEvmTokens({ chainId, walletAddress, isNFT, includeTokens })
      : Promise.resolve(undefined);

  const [nativeToken, erc20orErc721Tokens] = await Promise.all([nativeTokenPromise, tokensPromise]);

  return {
    tokens: (nativeToken ? [nativeToken] : []).concat(
      erc20orErc721Tokens ? erc20orErc721Tokens.parsedTokenAccounts : [],
    ),
    errors: (erc20orErc721Tokens ? erc20orErc721Tokens.errors : []).concat(nativeTokenError ? [nativeTokenError] : []),
  };
}

async function loadRemoteTokens(options: {
  chainId?: CarrierChainId;
  walletAddress?: string;
  isNFT: boolean;
  includeTokens?: TokenCacheData[];
}): Promise<
  | {
      tokens: (NFTData | TokenData)[];
      errors: {
        tokenAddress: string;
        tokenId?: string;
        error: Error;
      }[];
    }
  | undefined
> {
  const { chainId, walletAddress, isNFT, includeTokens } = options;

  if (!chainId || !walletAddress) {
    return;
  }

  const result = await getParsedTokenAccountFromCovalent({ chainId, walletAddress, isNFT, includeTokens });

  return result ? { tokens: result.parsedTokenAccounts, errors: result.errors } : undefined;
}

export const tokenNotExisted = new Error('token does not exist');

async function loadToken(data: {
  chainId: CarrierChainId;
  cachedTokens: TokensDataResult;
  tokenData: Token;
  walletAddress: string;
  includeTokens?: TokenCacheData[];
}): Promise<NFTData | undefined> {
  const { cachedTokens, chainId, tokenData, walletAddress, includeTokens } = data;

  if (
    includeTokens &&
    !includeTokens.some((item) => {
      const tokenIdMatched = tokenData.tokenId && item.tokenIds ? item.tokenIds.includes(tokenData.tokenId) : true;

      return item.contractAddress.toLowerCase() === tokenData.tokenAddress.toLowerCase() && tokenIdMatched;
    })
  ) {
    return;
  }

  const cachedToken = cachedTokens.data?.tokens.find((item) => {
    const tokenIdMatched = tokenData.tokenId ? item.tokenId === tokenData.tokenId : true;
    return item.tokenAddress.toLowerCase() === tokenData.tokenAddress.toLowerCase() && tokenIdMatched;
  });

  if (cachedToken) {
    return cachedToken;
  }

  let parsedTokenData: NFTData | undefined;
  let parsedTokenAddress: string | undefined;

  try {
    if (isCarrierEVMChain(chainId)) {
      parsedTokenAddress = ethers.utils.getAddress(tokenData.tokenAddress);
    } else if (chainId === CHAIN_ID_SOLANA) {
      parsedTokenAddress = new PublicKey(tokenData.tokenAddress).toBase58();
    }
  } catch (e) {
    console.error(e);
  }

  if (parsedTokenAddress) {
    if (isCarrierEVMChain(chainId)) {
      // check if a token is existed
      const provider = getEvmProviderWithWormholeChainId(chainId);
      const code = await provider.getCode(parsedTokenAddress);

      // if tokenAddress is not a contract, then it will return 0x
      // https://docs.ethers.org/v5/single-page/#/v5/api/providers/provider/-%23-Provider-getCode
      if (code === '0x') {
        throw tokenNotExisted;
      }

      if (tokenData.tokenId) {
        const token = getEthereumNFTWithChainId(parsedTokenAddress, chainId);
        parsedTokenData = await ethNFTToNFTParsedTokenAccount(chainId, token, tokenData.tokenId, walletAddress);
      } else {
        const token = getEthereumTokenWithChainId(parsedTokenAddress, chainId);

        parsedTokenData = await ethTokenToParsedTokenAccount(token, walletAddress);
      }
    } else if (chainId === CHAIN_ID_SOLANA) {
      parsedTokenData = tokenData.tokenId
        ? await getNFTDataByTokenMint({ tokenMint: tokenData.tokenAddress })
        : await getTokenDataByTokenMint({ tokenMint: tokenData.tokenAddress, walletAddress });

      if (!parsedTokenData) {
        throw tokenNotExisted;
      }
    }

    if (parsedTokenData) {
      saveTokenContractAddressToLocal({
        address: parsedTokenAddress,
        chainId,
        walletAddress,
        tokenIds: tokenData.tokenId ? [tokenData.tokenId] : undefined,
        isNFT: !!tokenData.tokenId,
      });
    }
  }

  return parsedTokenData;
}

export type TokensDataResult = DataResult<
  | {
      tokens: NFTData[];
      errors: {
        tokenAddress: string;
        tokenId?: string;
        error: Error;
      }[];
    }
  | undefined
>;

interface Token {
  tokenAddress: string;
  tokenId?: string;
}

export interface TokensData {
  cachedTokens: TokensDataResult;
  remoteTokens: TokensDataResult;
  searchTokenData: Token | undefined;
  searchToken: (tokenAddress: string, tokenId?: string) => void;
  searchTokenResult: DataResult<NFTData | undefined>;
}

export function useTokens(options: {
  chainId?: CarrierChainId;
  walletAddress?: string;
  isNFT: boolean;
  includeTokens?: TokenCacheData[];
}) {
  const [searchTokenData, setSearchTokenData] = useState<Token>();
  const { chainId, walletAddress, isNFT, includeTokens } = options;

  const cachedTokens = useData(async () => {
    // console.log('useTokens cachedTokens', { chainId, walletAddress });

    const data = await loadCachedTokens({ chainId, walletAddress, isNFT, includeTokens });

    // console.log('useTokens cachedTokens result', data);

    return data;
  }, [chainId, walletAddress, includeTokens]);

  const remoteTokens = useData(async () => {
    console.log('useTokens remoteTokens', { chainId, walletAddress });

    const data = await loadRemoteTokens({ chainId, walletAddress, isNFT, includeTokens });

    // console.log('useTokens remoteTokens result', data);

    return data;
  }, [chainId, walletAddress, includeTokens]);

  useEffect(() => {
    if (
      !cachedTokens.loading &&
      !cachedTokens.error &&
      cachedTokens.data &&
      !remoteTokens.loading &&
      !remoteTokens.error &&
      remoteTokens.data
    ) {
      const newRemoteTokens = remoteTokens.data.tokens.filter(
        (remoteToken) =>
          cachedTokens.data?.tokens.findIndex((cachedToken) => {
            const tokenIdMatched =
              'tokenId' in remoteToken && remoteToken.tokenId && 'tokenId' in cachedToken && cachedToken.tokenId
                ? remoteToken.tokenId === cachedToken.tokenId
                : true;
            return cachedToken.tokenAddress.toLowerCase() === remoteToken.tokenAddress.toLowerCase() && tokenIdMatched;
          }) === -1,
      );

      if (newRemoteTokens.length) {
        cachedTokens.setData({
          tokens: cachedTokens.data.tokens.concat(newRemoteTokens),
          errors: cachedTokens.data.errors,
        });
      }
    }
  }, [cachedTokens, remoteTokens]);

  const searchTokenResult = useData(async () => {
    // console.log('useTokens searchTokenResult', {
    //   chainId,
    //   cachedTokens,
    //   tokenAddress: searchTokenAddrss,
    //   walletAddress,
    // });

    if (chainId && searchTokenData && walletAddress) {
      const data = await loadToken({ chainId, cachedTokens, tokenData: searchTokenData, walletAddress, includeTokens });

      // console.log('useTokens searchTokenResult result', data);

      return data;
    }
  }, [searchTokenData, cachedTokens, chainId, walletAddress, includeTokens]);

  useEffect(() => {
    if (
      !cachedTokens.loading &&
      !cachedTokens.error &&
      cachedTokens.data &&
      !searchTokenResult.loading &&
      !searchTokenResult.error &&
      searchTokenResult.data
    ) {
      const searchTokenExisted = cachedTokens.data?.tokens.find((cachedToken) => {
        const tokenIdMatched =
          searchTokenResult.data &&
          'tokenId' in searchTokenResult.data &&
          searchTokenResult.data.tokenId &&
          'tokenId' in cachedToken &&
          cachedToken.tokenId
            ? searchTokenResult.data.tokenId === cachedToken.tokenId
            : true;

        return (
          searchTokenResult.data &&
          cachedToken.tokenAddress.toLowerCase() === searchTokenResult.data.tokenAddress.toLowerCase() &&
          tokenIdMatched
        );
      });

      if (!searchTokenExisted) {
        cachedTokens.setData({
          tokens: cachedTokens.data.tokens.concat([searchTokenResult.data]),
          errors: cachedTokens.data.errors,
        });
      }
    }
  }, [cachedTokens, searchTokenResult]);

  const searchToken = useCallback(
    (tokenAddress: string, tokenId?: string) => {
      setSearchTokenData(tokenAddress ? { tokenAddress, tokenId } : undefined);
    },
    [setSearchTokenData],
  );

  useEffect(() => {
    setSearchTokenData(undefined);
  }, [chainId, walletAddress, setSearchTokenData]);

  useEffect(() => {
    if (
      !cachedTokens.loading &&
      !cachedTokens.error &&
      cachedTokens.data &&
      !searchTokenResult.loading &&
      !searchTokenResult.error &&
      searchTokenResult.data
    ) {
      const tokenNotExisted =
        cachedTokens.data.tokens.findIndex((cachedToken) => {
          const tokenIdMatched =
            searchTokenResult.data && searchTokenResult.data.tokenId
              ? 'tokenId' in cachedToken
                ? cachedToken.tokenId === searchTokenResult.data.tokenId
                : false
              : true;
          return cachedToken.tokenAddress === searchTokenResult.data?.tokenAddress && tokenIdMatched;
        }) === -1;

      if (tokenNotExisted && searchTokenResult.data) {
        cachedTokens.setData({
          tokens: cachedTokens.data.tokens.concat([searchTokenResult.data]),
          errors: cachedTokens.data.errors,
        });
      }
    }
  }, [cachedTokens, searchTokenResult]);

  return useMemo((): TokensData => {
    const obj = {
      cachedTokens,
      remoteTokens,
      searchToken,
      searchTokenData,
      searchTokenResult,
    };

    // console.log('useTokens', obj);

    return obj;
  }, [cachedTokens, remoteTokens, searchToken, searchTokenResult, searchTokenData]);
}
