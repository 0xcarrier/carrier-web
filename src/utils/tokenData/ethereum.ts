import { providers } from '@0xsequence/multicall';
import { ethers_contracts } from '@certusone/wormhole-sdk';
import { ethers } from 'ethers';
import { CarrierChainId, wormholeChainToEvmChain } from '../consts';
import { getEvmProviderWithWormholeChainId } from '../web3Utils';
import {
  createNFTData,
  createTokenData,
  getNFTMetaData,
  NFTData,
  NFTMetaData,
  TokenCacheData,
  TokenData,
} from './helper';

export function getEthereumTokenWithChainId(tokenAddress: string, chainId: CarrierChainId) {
  const provider = getEvmProviderWithWormholeChainId(chainId);

  const multicallProvider = new providers.MulticallProvider(provider);
  const token = ethers_contracts.TokenImplementation__factory.connect(tokenAddress, multicallProvider);

  return token;
}

export async function ethTokenToParsedTokenAccount(token: ethers_contracts.TokenImplementation, signerAddress: string) {
  const [decimals, balance, symbol, name] = await Promise.all([
    token.decimals(),
    token.balanceOf(signerAddress),
    token.symbol(),
    token.name(),
  ]);

  return createTokenData(
    signerAddress,
    token.address,
    balance.toString(),
    decimals,
    Number(ethers.utils.formatUnits(balance, decimals)),
    ethers.utils.formatUnits(balance, decimals),
    symbol,
    name,
    '',
    false,
    false,
  );
}

export async function ethTokensToParsedTokenAccounts(
  tokens: ethers_contracts.TokenImplementation[],
  signerAddress: string,
  chainId?: number,
) {
  const errors: { tokenAddress: string; error: Error }[] = [];
  const tokenPromises = tokens.map((token) => {
    return [
      token
        .decimals()
        .then((decimals) => {
          return { address: token.address, decimals };
        })
        .catch((err) => {
          // we use catch here because we don't want other tokens fail, so we record error and return undefined.
          errors.push({ tokenAddress: token.address, error: err });

          return null;
        }),
      token
        .balanceOf(signerAddress)
        .then((balance) => {
          return { address: token.address, balance };
        })
        .catch((err) => {
          errors.push({ tokenAddress: token.address, error: err });

          return null;
        }),
      token
        .symbol()
        .then((symbol) => {
          return { address: token.address, symbol };
        })
        .catch((err) => {
          errors.push({ tokenAddress: token.address, error: err });

          return null;
        }),
      token
        .name()
        .then((name) => {
          return { address: token.address, name };
        })
        .catch((err) => {
          errors.push({ tokenAddress: token.address, error: err });

          return null;
        }),
    ];
  });
  const results = await Promise.all(tokenPromises.flat());

  const parsedTokenAccounts = tokens
    .filter((item) => item != null)
    .map((token) => {
      const decimalsResult = results.find(
        (result) => result && 'decimals' in result && result.address === token.address,
      ) as
        | {
            address: string;
            decimals: number;
          }
        | undefined;
      const balanceResult = results.find(
        (result) => result && 'balance' in result && result.address === token.address,
      ) as
        | {
            address: string;
            balance: ethers.BigNumber;
          }
        | undefined;
      const symbolResult = results.find(
        (result) => result && 'symbol' in result && result.address === token.address,
      ) as
        | {
            address: string;
            symbol: string;
          }
        | undefined;
      const nameResult = results.find((result) => result && 'name' in result && result.address === token.address) as
        | {
            address: string;
            name: string;
          }
        | undefined;

      if (decimalsResult && balanceResult && symbolResult && nameResult) {
        const { decimals } = decimalsResult;
        const { balance } = balanceResult;
        const { symbol } = symbolResult;
        const { name } = nameResult;

        return createTokenData(
          signerAddress,
          token.address,
          balance.toString(),
          decimals,
          Number(ethers.utils.formatUnits(balance, decimals)),
          ethers.utils.formatUnits(balance, decimals),
          symbol,
          name,
          chainId ? `https://logos.covalenthq.com/tokens/${chainId}/${token.address}.png` : '',
          false,
          false,
        );
      }
    })
    .filter((item) => item != null) as TokenData[];

  console.log('parsedTokenAccounts', parsedTokenAccounts);

  return { parsedTokenAccounts, errors };
}

export function getEthereumNFTWithChainId(tokenAddress: string, chainId: CarrierChainId) {
  const provider = getEvmProviderWithWormholeChainId(chainId);
  const multicallProvider = new providers.MulticallProvider(provider!);
  const token = ethers_contracts.NFTImplementation__factory.connect(tokenAddress, multicallProvider);
  return token;
}

export async function ethNFTToNFTParsedTokenAccount(
  chainId: number,
  token: ethers_contracts.NFTImplementation,
  tokenId: string,
  signerAddress: string,
) {
  const decimals = 0;
  const [owner, symbol, name, uri] = await Promise.all([
    token.ownerOf(tokenId),
    token.symbol(),
    token.name(),
    token.tokenURI(tokenId),
  ]);
  const balance = owner === signerAddress ? 1 : 0;

  const metaData = await getNFTMetaData(uri);

  return createNFTData({
    ownerAddress: signerAddress,
    nftAddress: token.address,
    amount: balance.toString(),
    decimals,
    uiAmount: Number(ethers.utils.formatUnits(balance, decimals)),
    uiAmountString: ethers.utils.formatUnits(balance, decimals),
    symbol,
    name,
    logo: `https://logos.covalenthq.com/tokens/${chainId}/${token.address}.png`,
    tokenId,
    uri,
    animation_url: metaData.animation_url,
    external_url: metaData.external_url,
    image: metaData.image,
    image_256: metaData.image_256,
    nftName: metaData.name,
    description: metaData.description,
  });
}

export async function ethNFTsToNFTParsedTokenAccounts(
  tokens: { contract: ethers_contracts.NFTImplementation; tokenIds: string[] }[],
  signerAddress: string,
  chainId?: number,
) {
  const errors: { tokenAddress: string; tokenId?: string; error: Error }[] = [];
  const tokenPromises = tokens.map((token) => {
    return [
      token.contract
        .symbol()
        .then((symbol) => {
          return { address: token.contract.address, symbol };
        })
        .catch((err) => {
          // we use catch here because we don't want other tokens fail, so we record error and return undefined.
          errors.push({ tokenAddress: token.contract.address, error: err });

          return null;
        }),
      token.contract
        .name()
        .then((name) => {
          return { address: token.contract.address, name };
        })
        .catch((err) => {
          // we use catch here because we don't want other tokens fail, so we record error and return undefined.
          errors.push({ tokenAddress: token.contract.address, error: err });

          return null;
        }),
      ...token.tokenIds
        .map((tokenId) => {
          return [
            token.contract
              .ownerOf(tokenId)
              .then((owner) => {
                return { address: token.contract.address, tokenId, owner };
              })
              .catch((err) => {
                // we use catch here because we don't want other tokens fail, so we record error and return undefined.
                errors.push({ tokenAddress: token.contract.address, tokenId, error: err });

                return null;
              }),
            token.contract
              .tokenURI(tokenId)
              .then((tokenURI) => {
                return { address: token.contract.address, tokenId, tokenURI };
              })
              .catch((err) => {
                // we use catch here because we don't want other tokens fail, so we record error and return undefined.
                errors.push({ tokenAddress: token.contract.address, tokenId, error: err });

                return null;
              }),
          ];
        })
        .flat(),
    ];
  });
  const results = await Promise.all(tokenPromises.flat());
  const metadatas = await Promise.all(
    results
      .map((item) => {
        const tokenURI = item && 'tokenURI' in item ? item.tokenURI : undefined;
        const tokenId = item && 'tokenId' in item ? item.tokenId : undefined;

        return item && tokenURI && tokenId
          ? getNFTMetaData(tokenURI).then((data) => {
              return {
                address: item.address,
                tokenId,
                data,
              };
            })
          : undefined;
      })
      .filter((item) => {
        return item != null;
      }) as Promise<{
      address: string;
      tokenId: string;
      data: NFTMetaData;
    }>[],
  );

  const parsedTokenAccounts = tokens
    .map((token) => {
      return token.tokenIds
        .map((tokenId) => {
          const ownerResult = results.find(
            (result) =>
              result && 'owner' in result && result.address === token.contract.address && result.tokenId === tokenId,
          ) as
            | {
                address: string;
                tokenId: string;
                owner: string;
              }
            | undefined;
          const tokenURIResult = results.find(
            (result) =>
              result && 'tokenURI' in result && result.address === token.contract.address && result.tokenId === tokenId,
          ) as
            | {
                address: string;
                tokenId: string;
                tokenURI: string;
              }
            | undefined;
          const symbolResult = results.find(
            (result) => result && 'symbol' in result && result.address === token.contract.address,
          ) as
            | {
                address: string;
                symbol: string;
              }
            | undefined;
          const nameResult = results.find(
            (result) => result && 'name' in result && result.address === token.contract.address,
          ) as
            | {
                address: string;
                name: string;
              }
            | undefined;
          const metaData = metadatas.find(
            (result) => result.address === token.contract.address && result.tokenId === tokenId,
          );

          if (ownerResult && tokenURIResult && symbolResult && nameResult) {
            const { owner } = ownerResult;
            const { tokenURI } = tokenURIResult;
            const { symbol } = symbolResult;
            const { name } = nameResult;

            const balance = owner === signerAddress ? 1 : 0;
            const decimals = 0;

            return createNFTData({
              ownerAddress: signerAddress,
              nftAddress: token.contract.address,
              amount: balance.toString(),
              decimals,
              uiAmount: Number(ethers.utils.formatUnits(balance, decimals)),
              uiAmountString: ethers.utils.formatUnits(balance, decimals),
              symbol,
              name,
              logo: chainId ? `https://logos.covalenthq.com/tokens/${chainId}/${token.contract.address}.png` : '',
              tokenId,
              uri: tokenURI,
              animation_url: metaData?.data.animation_url,
              external_url: metaData?.data.external_url,
              image: metaData?.data.image,
              image_256: metaData?.data.image_256,
              nftName: metaData?.data.name,
              description: metaData?.data.description,
            });
          }
        })
        .filter((item) => item != null) as NFTData[];
    })
    .flat();

  return { parsedTokenAccounts, errors };
}

export async function getEthNFTParsedTokenAccounts(options: {
  tokens: TokenCacheData[];
  chainId: CarrierChainId;
  signerAddress: string;
}) {
  const { tokens, chainId, signerAddress } = options;

  const evmChainId = wormholeChainToEvmChain[chainId];

  return ethNFTsToNFTParsedTokenAccounts(
    tokens.map((tokenContractAddress) => {
      return {
        contract: getEthereumNFTWithChainId(tokenContractAddress.contractAddress, chainId),
        tokenIds: tokenContractAddress.tokenIds || [],
      };
    }),
    signerAddress,
    evmChainId,
  );
}

export async function getEthTokensParsedTokenAccounts(options: {
  tokens: TokenCacheData[];
  chainId: CarrierChainId;
  signerAddress: string;
}) {
  const { tokens, chainId, signerAddress } = options;

  const evmChainId = wormholeChainToEvmChain[chainId];

  return ethTokensToParsedTokenAccounts(
    tokens.map((tokenContractAddress) => {
      return getEthereumTokenWithChainId(tokenContractAddress.contractAddress, chainId);
    }),
    signerAddress,
    evmChainId,
  );
}
