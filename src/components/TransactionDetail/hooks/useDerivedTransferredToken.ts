import { useEffect, useMemo, useState } from 'react';

import { CHAIN_ID_SOLANA, WSOL_ADDRESS } from '@certusone/wormhole-sdk';
import { AddressZero } from '@ethersproject/constants';

import { CarrierChainId, getDefaultNativeCurrencyAddress, getDefaultNativeCurrencySymbol } from '../../../utils/consts';
import { getSolanaConnection } from '../../../utils/solana';
import {
  computeHumanReadableCurrency,
  getTokenInfoKey,
  isCarrierEVMChain,
  tryConvertChecksumAddress,
} from '../../../utils/web3Utils';
import { CarrierTxnObject, TokenInfo } from '../../../utils/transaction-indexer';
import { NFTData } from '../../../utils/tokenData/helper';
import { getEthNFTParsedTokenAccounts } from '../../../utils/tokenData/ethereum';
import { getSolTokens } from '../../../utils/tokenData/tokenData';

export type DerivedTokenInfo = {
  amount: string;
  decimals: string;
  name: string;
  symbol: string;
  logo?: string;
  tokenAddress: string;
  chainId: CarrierChainId;
};

export type DerivedNFTInfo = {
  amount: '1';
  name: string;
  symbol: string;
  image?: string;
  tokenAddress: string;
  tokenId: string;
  chainId: CarrierChainId;
};

type UseDerivedTxTokenInfoHook = (
  transaction: CarrierTxnObject | undefined,
  tokenInfoMap: Record<string, TokenInfo | undefined>,
  isNFT: boolean,
  isDestTxn?: boolean,
) => {
  error?: string;
  tokenInfo: null | DerivedTokenInfo | DerivedNFTInfo;
};

export const useDerivedTxTokenInfo: UseDerivedTxTokenInfoHook = (transaction, tokenInfoMap, isNFT, isDestTxn) => {
  const {
    sender,
    recipient,
    destTokenAddress,
    sourceTokenAddress,
    tokenAmt,
    tokenId,
    sourceChainId,
    destChainId,
    solanaWalletAccount,
  } = transaction || {};

  const chainId = useMemo(
    () => (isDestTxn ? destChainId : sourceChainId) as CarrierChainId,
    [isDestTxn, sourceChainId, destChainId],
  );

  const walletAddress = useMemo(() => {
    const _address = solanaWalletAccount
      ? solanaWalletAccount
      : !isDestTxn && sender
      ? sender
      : isDestTxn && recipient
      ? recipient
      : '';

    return _address && tryConvertChecksumAddress(_address, chainId);
  }, [chainId, isDestTxn, recipient, sender, solanaWalletAccount]);

  const tokenAddress = useMemo(() => {
    let _address = '';
    if (isDestTxn && destTokenAddress) {
      _address = destTokenAddress;
    } else if (!isDestTxn && sourceTokenAddress) {
      _address = sourceTokenAddress;
    }

    return _address;
  }, [destTokenAddress, isDestTxn, sourceTokenAddress]);

  const [derivedTokenInfo, setDerivedTokenInfo] = useState<DerivedTokenInfo | DerivedNFTInfo | null>(null);

  // Get additional token infos from indexer and save it to state
  useEffect(() => {
    if (!transaction || !tokenAddress || !chainId) {
      return;
    }

    let cancelled = false;

    const tokenInfo = getTokenInfo(tokenInfoMap, tokenAddress, chainId, isNFT);

    if (isNFT) {
      const _tokenId = tokenId?.toString() || '';
      getDerivedNFTInfo(tokenInfo, _tokenId, walletAddress).then((nftInfo) => {
        if (!cancelled && nftInfo) {
          setDerivedTokenInfo(nftInfo);
        }
      });
    }

    if (!isNFT) {
      const isSourceSolanaNativeBridge =
        sourceChainId === CHAIN_ID_SOLANA && sourceTokenAddress?.toLowerCase() === WSOL_ADDRESS.toLowerCase();
      const amount = tokenAmt || '';
      const readableAmount = computeHumanReadableCurrency(
        tokenInfo,
        amount.toString() || '0',
        isSourceSolanaNativeBridge,
      );
      getDerivedTokenInfo(tokenInfo, readableAmount).then((tokenInfo) => {
        if (!cancelled && tokenInfo) {
          setDerivedTokenInfo(tokenInfo);
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [
    chainId,
    isNFT,
    sourceChainId,
    sourceTokenAddress,
    tokenAddress,
    tokenAmt,
    tokenId,
    tokenInfoMap,
    transaction,
    walletAddress,
  ]);

  return useMemo(() => {
    return {
      error: '',
      tokenInfo: derivedTokenInfo,
    };
  }, [derivedTokenInfo]);
};

function getTokenInfo(
  tokenInfoMap: Record<string, TokenInfo | undefined>,
  tokenAddress: string,
  chainId: CarrierChainId,
  isNFT: boolean,
) {
  const _tokenAddress =
    !isNFT && tokenAddress === AddressZero
      ? getDefaultNativeCurrencyAddress(chainId).toLowerCase()
      : tokenAddress.toLowerCase();
  const isNativeToken =
    !isNFT &&
    (tokenAddress === AddressZero ||
      tokenAddress.toLowerCase() === getDefaultNativeCurrencyAddress(chainId).toLowerCase());

  const key = getTokenInfoKey(_tokenAddress, chainId);
  const tokenInfo = tokenInfoMap[key];

  const defaultDecimals = isNFT ? '0' : isNativeToken && chainId === CHAIN_ID_SOLANA ? '9' : '18';
  const defaultName = isNFT ? 'NFT' : 'Unknown';
  const defaultSymbol = isNFT ? 'NFT' : 'UNKNOWN';

  return {
    chainId: tokenInfo?.chainId || chainId,
    decimals: tokenInfo?.decimals || defaultDecimals,
    name: tokenInfo?.name || defaultName,
    symbol: isNativeToken ? getDefaultNativeCurrencySymbol(chainId) : tokenInfo?.symbol || defaultSymbol,
    tokenAddress,
  } as TokenInfo;
}

async function getDerivedNFTInfo(
  tokenInfo: TokenInfo,
  // tokenAccount: NFTParsedTokenAccount | undefined,
  tokenId: string,
  walletAddress: string,
) {
  let tokenAccount: NFTData | undefined;
  if (tokenInfo?.chainId === CHAIN_ID_SOLANA) {
    const connection = getSolanaConnection();

    const results = await getSolTokens({
      connection,
      walletAddress,
      isNFT: true,
    });

    if (results.parsedTokenAccounts.length) {
      tokenAccount = results.parsedTokenAccounts.find(
        (item) => item.tokenAddress.toLowerCase() === tokenInfo.tokenAddress.toLowerCase(),
      );
    }
  } else if (isCarrierEVMChain((tokenInfo?.chainId || 0) as CarrierChainId)) {
    const results = await getEthNFTParsedTokenAccounts({
      tokens: [
        {
          contractAddress: tokenInfo?.tokenAddress.toLowerCase() || '',
          tokenIds: [tokenId],
        },
      ],
      chainId: (tokenInfo?.chainId || 0) as CarrierChainId,
      signerAddress: walletAddress.toLowerCase(),
    });

    if (results.errors.length) {
      // TODO: set error to state
    }

    if (results.parsedTokenAccounts.length) {
      tokenAccount = results.parsedTokenAccounts.find(
        (item) => item.tokenAddress.toLowerCase() === tokenInfo.tokenAddress.toLowerCase(),
      );
    }
  } else {
    // Reserved for other chains in the future
  }

  return {
    ...tokenInfo,
    amount: '1',
    image: tokenAccount?.image_256 || tokenAccount?.image,
    tokenId: tokenAccount?.tokenId || tokenId,
  } as DerivedNFTInfo;
}

async function getDerivedTokenInfo(
  tokenInfo: TokenInfo,
  // tokenAccount: ParsedTokenAccount | undefined,
  amount: string,
) {
  return {
    ...tokenInfo,
    amount: amount || 'N/A',
    /* logo: tokenInfo
      ? `https://logos.covalenthq.com/tokens/${
          tokenInfo.chainId === CHAIN_ID_SOLANA ? 1399811149 : getEvmChainId(tokenInfo.chainId as ChainId)
        }/${tokenInfo.tokenAddress}.png`
      : undefined, */
  } as DerivedTokenInfo;
}
