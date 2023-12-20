import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { CHAIN_ID_ETH, CHAIN_ID_SOLANA, WSOL_ADDRESS } from '@certusone/wormhole-sdk';
import { css, cx } from '@linaria/core';
import { PublicKey } from '@metaplex-foundation/js';
import { Button, Pagination, Table } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import axios from 'axios';
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';
import uniq from 'lodash/uniq';
import useSWR from 'swr';

import {
  CHAINS_BY_ID,
  CarrierChainId,
  TXN_INDEXER,
  TXN_STATUS,
  TXN_TYPE,
  evmChainNativeDecimals,
  getDefaultNativeCurrencyAddress,
  getDefaultNativeCurrencySymbol,
  wormholeChainToEvmChain,
} from '../../utils/consts';
import { routes } from '../../utils/routes';
import { getSolanaConnection } from '../../utils/solana';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { CarrierTxnObject, TokenInfo } from '../../utils/transaction-indexer';
import {
  DEFAULT_TX_TOKEN_SYMBOL,
  addressShortener,
  computeHumanReadableCurrency,
  getTokenInfoKey,
  isCarrierEVMChain,
  nftNameShortener,
  tryConvertChecksumAddress,
} from '../../utils/web3Utils';
import { ChainLogo } from '../common/ChainLogo';
import { SVGIcon } from '../common/SVGIcon';
import { Spinner } from '../common/Spinner';
import Tooltip from '../common/Tooltip';

// k is a contatentation of (chainId, tokenAddress)
type TokenInfoMap = { [k in string]: TokenInfo };

interface TransactionResult {
  results: CarrierTxnObject[];
  redeemTransactions: CarrierTxnObject[];
  tokenInfoMap: TokenInfoMap;
  counts: number;
  pages: number;
  current: number;
  previous: any;
  next: any;
}

async function getSolanaAccountsInfo(solanaRecipients: string[]) {
  const connection = getSolanaConnection();
  const accountInfos = await connection.getMultipleParsedAccounts(solanaRecipients.map((item) => new PublicKey(item)));
  return accountInfos;
}

interface Props {
  chainId?: CarrierChainId;
  walletAddress?: string; // 0xbase16
  walletAddresses?: string[]; // 0xbase16
  searchStr?: string; // filter transaction lists by sender, recipient, token address, transaction id, etc
}

/**
 * shows a list of transaction info that the user has invoked
 * if no wallet address is provided, show empty table?
 *
 * for token bridge, the SOURCE transaction's destTokenAddress gives us the bridged token address
 * we can also get the same information from REDEEM transaction destTokenAddress
 * But if there are 3rd party relayers, we only know of the source transaction, so it is always safer to rely the source transaction dest token address for token bridge that is
 *
 * Note: if we need all the transactions in the db: query ${TXN_INDEXER}/api/v1/transactions?page=${pageIndex}
 * if you need txns from different wallets: ${TXN_INDEXER}/api/v1/transactions?page=${pageIndex}&sender=walletAddress1,walletAddress2&recipient=walletAddress1,walletAddress2
 */
export const TransactionHistory: React.SFC<Props> = ({ chainId, walletAddress, walletAddresses, searchStr }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [pageIndex, setPageIndex] = useState(0);
  const [transactionCache, setTransactionCache] = useState<CarrierTxnObject[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!cancelled) {
      setPageIndex(0);
      setTransactionCache([]);
    }
    return () => {
      cancelled = true;
    };
  }, [chainId]);

  async function getTransactions(key: string, url: string): Promise<TransactionResult> {
    const results: CarrierTxnObject[] = [];
    const redeemTransactions: CarrierTxnObject[] = [];
    const tokenInfoMap: TokenInfoMap = {};
    let counts = 0; // total no. of items
    let pages = 0; // number of pages
    let current = 0; // current page
    let previous = null; // track if there is a previous page
    let next = null; // track if there is a next page

    try {
      console.log('querying txn indexer txn history.....', url);
      const res = await axios.get(url);

      if (!res.data) {
        throw new Error('not found');
      }

      const transactions: CarrierTxnObject[] = res.data.results.transactions;

      redeemTransactions.push(...res.data.results.redeemTransactions);

      for (const token of res.data.results.tokens) {
        let key = getTokenInfoKey(token.tokenAddress, token.chainId as CarrierChainId);
        tokenInfoMap[key] = token;
      }

      const solanaRecipients = transactions
        .filter((item) => item.destChainId === CHAIN_ID_SOLANA)
        .map((item) => {
          return {
            txn: item.txn,
            recipient: item.recipient,
          };
        });

      const solanaAccountInfos = solanaRecipients.length
        ? await getSolanaAccountsInfo(solanaRecipients.map((item) => item.recipient))
        : undefined;

      for (const transaction of transactions) {
        const { destChainId } = transaction;

        // solana recipient is the associated token account
        // fetch the "real" user wallet
        if (destChainId === CHAIN_ID_SOLANA && solanaAccountInfos) {
          const solanaRecipientIndex = solanaRecipients.findIndex((item) => item.txn === transaction.txn);

          if (solanaRecipientIndex != -1) {
            const accountData = solanaAccountInfos.value[solanaRecipientIndex];
            const owner =
              accountData && accountData.data && 'parsed' in accountData.data && accountData.data.parsed.info.owner;

            if (owner) {
              transaction.recipient = owner;
            }
          }
        }

        results.push(transaction);
      }

      counts = res.data.results.counts;
      pages = res.data.results.pages;
      current = res.data.results.current;
      previous = res.data.results.previous;
      next = res.data.results.next;
    } catch (e) {
      console.error(e);
    }

    // cache transactions for the mobilelist
    setTransactionCache((prev) => prev.concat(results));

    return {
      results,
      redeemTransactions,
      tokenInfoMap,
      counts,
      pages,
      current,
      previous,
      next,
    };
  }

  const url = useMemo(() => {
    if (chainId && walletAddress) {
      if (searchStr && searchStr.length > 0) {
        return `${TXN_INDEXER}/api/v1/transactions/${chainId}/${walletAddress}?page=${pageIndex}&txn=${searchStr}&sender=${searchStr}&recipient=${searchStr}`;
      } else {
        return `${TXN_INDEXER}/api/v1/transactions/${chainId}/${walletAddress}?page=${pageIndex}`;
      }
    } else if (walletAddresses && walletAddresses.length) {
      const uniqueAddresses = uniq(walletAddresses);
      const uniqueAddressList = uniqueAddresses.join(',');

      if (searchStr) {
        // AllTransactions component already filter by wallet addresses
        return `${TXN_INDEXER}/api/v1/transactions?sender=${searchStr}&recipient=${searchStr}&txn=${searchStr}&type=nft,token&page=${pageIndex}`;
      } else {
        return `${TXN_INDEXER}/api/v1/transactions?sender=${uniqueAddressList}&recipient=${uniqueAddressList}&type=nft,token&page=${pageIndex}`;
      }
    } else {
      console.error('No wallet address');
    }
  }, [pageIndex, searchStr, chainId, walletAddress, walletAddresses]);

  const {
    data: initialTransactions,
    isValidating,
    error,
  } = useSWR(['fetch_txn_history', url], getTransactions, {
    revalidateOnFocus: false,
  });
  const isLoading = isValidating || (!initialTransactions && !error);
  const mobileListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function scrollHandler() {
      const isScrollable = document.body.scrollHeight > document.body.clientHeight;
      const isScrolledToBottom = document.body.scrollHeight - document.body.clientHeight - document.body.scrollTop < 10;

      // use mobileListRef.current.offsetParent to detect if the mobileList is visible
      if (
        isScrollable &&
        isScrolledToBottom &&
        !isLoading &&
        mobileListRef.current &&
        mobileListRef.current.offsetParent &&
        initialTransactions?.next
      ) {
        setPageIndex((prev) => prev + 1);
      }
    }

    window.addEventListener('scroll', scrollHandler, { passive: true });

    return () => {
      window.removeEventListener('scroll', scrollHandler);
    };
  }, [initialTransactions?.next, isLoading]);

  useEffect(() => {
    // resets the page index if the user search or delete search input
    // as the url data would be refetched

    if (searchStr && searchStr.length > 0) {
      setPageIndex(0);
    }
  }, [searchStr]);

  const getTokenSymbol = useCallback(
    (tokenAddress: string, chainId: CarrierChainId): string => {
      let symbol = '';
      let key = getTokenInfoKey(tokenAddress, chainId);
      if (initialTransactions && initialTransactions?.tokenInfoMap.hasOwnProperty(key)) {
        // take symbol from indexer
        symbol =
          initialTransactions.tokenInfoMap[key].symbol ||
          initialTransactions.tokenInfoMap[key].name ||
          DEFAULT_TX_TOKEN_SYMBOL;
      } else {
        symbol = getDefaultNativeCurrencySymbol(chainId);
      }
      return symbol;
    },
    [initialTransactions],
  );

  const getDestTokenSymbol = useCallback(
    (tokenAddress: string, chainId: CarrierChainId): string => {
      if (!tokenAddress) {
        return DEFAULT_TX_TOKEN_SYMBOL;
      }

      let nativeTokenAddress = getDefaultNativeCurrencyAddress(chainId);
      if (nativeTokenAddress.toLowerCase() === tokenAddress.toLowerCase()) {
        // source is a wrapped native token
        // dest symbol is the native dest currency
        return getDefaultNativeCurrencySymbol(chainId);
      }
      return getTokenSymbol(tokenAddress, chainId);
    },
    [getTokenSymbol],
  );

  const getNFTSymbol = useCallback(
    (tokenAddress: string, chainId: CarrierChainId): string => {
      let symbol = 'NFT';
      let key = getTokenInfoKey(tokenAddress, chainId);
      if (initialTransactions && initialTransactions?.tokenInfoMap.hasOwnProperty(key)) {
        // take symbol from indexer
        symbol = initialTransactions.tokenInfoMap[key].symbol || 'NFT';
      }
      return symbol;
    },
    [initialTransactions],
  );

  /**
   * convert the denorm amount to human readable format
   * the denorm amount max is 10^8
   * to get the "human format", we need to calculate denorm * 10^-8
   * if the currency has lesser than 8 decimals, then denorm * 10^-decimals
   * for solana bridged tokens it has only 9 decimals
   * @param tokenAddress  token address
   * @param denormAmt     denormalized token amount
   * @param sourceChainId source chain id that the token is bridged from, for solana
   */
  const humanReadableCurrency = useCallback(
    (
      tokenAddress: string,
      denormAmt: string,
      chainId: CarrierChainId,
      isNFT: boolean,
      isSourceSolanaNativeBridge: boolean,
    ) => {
      const isNativeToken = !!(!isNFT && tokenAddress === ethers.constants.AddressZero);

      const key = getTokenInfoKey(tokenAddress, chainId);
      let tokenInfo: TokenInfo;

      if (initialTransactions && initialTransactions?.tokenInfoMap[key]) {
        tokenInfo = initialTransactions.tokenInfoMap[key];
      } else {
        tokenInfo = {
          chainId,
          decimals: isNFT
            ? '0'
            : isNativeToken
            ? chainId === CHAIN_ID_SOLANA
              ? '9'
              : isCarrierEVMChain(chainId)
              ? evmChainNativeDecimals[wormholeChainToEvmChain[chainId]].toString()
              : '18'
            : '18',
          name: isNFT ? 'NFT' : isNativeToken ? CHAINS_BY_ID[chainId].name : 'Unknown',
          symbol: isNFT ? 'NFT' : isNativeToken ? getDefaultNativeCurrencySymbol(chainId) : 'UNKNOWN',
          tokenAddress,
        };
      }

      return computeHumanReadableCurrency(tokenInfo, denormAmt, isSourceSolanaNativeBridge);
    },
    [initialTransactions],
  );

  const simplifiedReadableAmount = useCallback(
    (
      tokenAddress: string,
      denormAmt: string,
      chainId: CarrierChainId,
      isNFT: boolean,
      isSourceSolanaNativeBridge: boolean,
    ) => {
      const readableAmount = humanReadableCurrency(tokenAddress, denormAmt, chainId, isNFT, isSourceSolanaNativeBridge);
      const hasDecimalPoint = readableAmount.indexOf('.');
      if (!hasDecimalPoint) {
        return readableAmount;
      }

      const [wholeNumber, fraction] = readableAmount.split('.');
      let simplifiedAmount = wholeNumber;
      if (simplifiedAmount.length < 10 && fraction) {
        const shortenFraction = fraction.substring(0, 10 - simplifiedAmount.length);
        if (!BigNumber(`0.${shortenFraction}`).isZero()) {
          simplifiedAmount += `.${shortenFraction}`;
        }
      }

      return simplifiedAmount;
    },
    [humanReadableCurrency],
  );

  const formatDate = (date: Date) => {
    const formattedDate = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }).format(date);
    return formattedDate;
  };

  const renderNFTName = useCallback(
    (tokenAddress: string, tokenId: string, chainId: CarrierChainId) => {
      const nftSymbol = getNFTSymbol(tokenAddress, chainId);
      const nftTokenId = tokenId ? nftNameShortener(tokenId) : '';
      if (nftTokenId) {
        return `1 ${nftSymbol} #${nftTokenId}`;
      }
      return `1 ${nftSymbol}`;
    },
    [getNFTSymbol],
  );

  function renderType(row: CarrierTxnObject) {
    let icon = <></>;
    let typeText = '';
    let textColor = '';

    if (row.txnType === TXN_TYPE.TOKEN_BRIDGE || row.txnType === TXN_TYPE.NFT_BRIDGE) {
      typeText = 'Bridging';
      icon = <Spinner className={styleTypeIcon} />;
      textColor = BlueTypeTextColor;

      if (row.status === TXN_STATUS.FAILED) {
        typeText = 'Bridge failed';
        icon = <SVGIcon className={cx(styleTypeIcon, redTypeIconColor)} iconName="bridge-failed" />;
        textColor = RedTypeTextColor;
      } else if (
        row.status === TXN_STATUS.CONFIRMED &&
        (row.signedVAABytes || row.cctpHashedSourceAndNonce) &&
        !row.redeemTxn
      ) {
        typeText = 'Awaiting for redeem';
        icon = <SVGIcon className={cx(styleTypeIcon, blueTypeIconColor)} iconName="arrow-up-tray" />;
      } else if (row.status === TXN_STATUS.REDEEMED) {
        typeText = 'Bridged';
        icon = <SVGIcon className={cx(styleTypeIcon, regularTypeIconColor)} iconName="bridge" />;
        textColor = RegularTypeTextColor;
      }
    } else if (row.txnType === TXN_TYPE.SWAP) {
      typeText = 'Swapping';
      icon = <Spinner />;
      textColor = BlueTypeTextColor;

      if (row.status === TXN_STATUS.FAILED) {
        typeText = 'Swap failed';
        icon = <SVGIcon className={cx(styleTypeIcon, redTypeIconColor)} iconName="swap-failed" />;
        textColor = RedTypeTextColor;
      } else if (
        row.status === TXN_STATUS.CONFIRMED &&
        (row.signedVAABytes || row.cctpHashedSourceAndNonce) &&
        !row.redeemTxn
      ) {
        typeText = 'Awaiting for redeem';
        icon = <SVGIcon className={cx(styleTypeIcon, blueTypeIconColor)} iconName="arrow-up-tray" />;
      } else if (row.status === TXN_STATUS.REDEEMED) {
        typeText = 'Swapped';
        icon = <SVGIcon className={styleTypeIcon} iconName="swap-round" />;
        textColor = RegularTypeTextColor;
      }
    }

    return (
      <div className={TypeWrapper}>
        <div>{icon}</div>
        <div className={textColor}>{typeText}</div>
      </div>
    );
  }

  // function renderStatus(row: CarrierTxnObject) {
  //   return <TxStatusPill status={row.status} />;
  // }

  const renderAction = useCallback(
    (row: CarrierTxnObject, isMobile: boolean) => {
      const isNFT = row.txnType === 'nft_bridge' ? true : row.txnType === 'token_bridge' ? false : undefined;

      //parse vaa to get userelayer(use arbiterfee?), targetchain, targetAddress,originchain,originaddress,amount

      return [
        isNFT !== undefined &&
        row.status === TXN_STATUS.CONFIRMED &&
        (row.signedVAABytes || row.cctpHashedSourceAndNonce) &&
        !row.redeemTxn ? (
          <Link
            className={ActionButton}
            key={`action_redeem_${row.txn}`}
            to={routes.progress.getPath(
              {
                chainId: row.sourceChainId as CarrierChainId,
                txHash: row.txn,
              },
              { enableManualRedemption: true },
            )}
            onClick={(e) => {
              e.stopPropagation();
            }}>
            Redeem
            <SVGIcon className={styleRedeemButtonIcon} iconName="external-link" />
          </Link>
        ) : null,
        isMobile ? (
          <div
            className={ActionButton}
            key={`action_viewDetails_${row.txn}`}
            onClick={(e) => {
              e.stopPropagation();

              navigate(`/tx/${row.txn}`, {
                state: {
                  prevUrl: location.pathname,
                },
              });
            }}>
            <SVGIcon className={styleDetailButtonIcon} iconName="eye" />
            View Details
          </div>
        ) : null,
      ].filter((item) => item != null);
    },
    [location.pathname, navigate],
  );

  const renderTime = useCallback((row: CarrierTxnObject) => {
    const date = new Date(row.updated);

    return (
      <div className={styleDateContainer}>
        <Tooltip
          disableIcon={true}
          tooltipText={<div className={DateToolTip}>Time: {date.toLocaleTimeString()}</div>}
          content={<div className={styleDate}>{formatDate(date)}</div>}
        />
      </div>
    );
  }, []);

  const renderDest = useCallback(
    (row: CarrierTxnObject) => {
      // type convert
      const chainId = row.destChainId as CarrierChainId;
      const isNFT = row.txnType === 'nft_bridge';
      const isSourceSolanaNativeBridge = !!(
        row.sourceChainId === CHAIN_ID_SOLANA && row.sourceTokenAddress === WSOL_ADDRESS
      );
      // if bridged or swapped, take different values
      const sourceAmt = row.tokenAmt || row.swapInAmt;
      const destAmt = row.tokenAmt || row.swapOutAmt;
      const redeemTxn =
        (row.txnType === TXN_TYPE.TOKEN_BRIDGE || row.txnType === TXN_TYPE.NFT_BRIDGE) &&
        row.redeemTxn &&
        initialTransactions
          ? initialTransactions.redeemTransactions.find((item) => item.txn === row.redeemTxn)
          : undefined;

      const tokenAddress =
        row.txnType === TXN_TYPE.TOKEN_BRIDGE || row.txnType === TXN_TYPE.NFT_BRIDGE
          ? row.destTokenAddress
          : redeemTxn
          ? redeemTxn.destTokenAddress
          : ethers.constants.AddressZero;

      // for destination rendering, we use the source token address as the decimals value of the dest token sometimes might be off
      // if the destination token is a native currency
      return (
        <div className={SourceRow}>
          {row.recipient && row.destChainId ? (
            <>
              <ChainLogo className={styleChainLogo} chainId={chainId} />
              <div className={TokenRow}>
                <div className={TokenAmt}>
                  {row.txnType === TXN_TYPE.NFT_BRIDGE ? (
                    <>
                      {renderNFTName(
                        row.sourceTokenAddress,
                        row.tokenId ? row.tokenId.toString() : '',
                        row.sourceChainId as CarrierChainId,
                      )}
                    </>
                  ) : destAmt ? (
                    <>
                      {' '}
                      {simplifiedReadableAmount(
                        row.destTokenAddress,
                        destAmt,
                        chainId,
                        isNFT,
                        isSourceSolanaNativeBridge,
                      )}
                      {` `}
                      {row.destTokenAddress || redeemTxn
                        ? getDestTokenSymbol(tokenAddress, row.destChainId as CarrierChainId)
                        : DEFAULT_TX_TOKEN_SYMBOL}
                    </>
                  ) : (
                    <>N/A</>
                  )}
                </div>
                <div className={Address}>{addressShortener(tryConvertChecksumAddress(row.recipient, chainId))}</div>
              </div>
            </>
          ) : null}
        </div>
      );
    },
    [getDestTokenSymbol, initialTransactions, renderNFTName, simplifiedReadableAmount],
  );

  const renderSource = useCallback(
    (row: CarrierTxnObject) => {
      // type convert
      const wormholeChainId = row.sourceChainId as CarrierChainId;
      const isNFT = row.txnType === 'nft_bridge';
      const isSourceSolanaNativeBridge = !!(
        row.sourceChainId === CHAIN_ID_SOLANA && row.sourceTokenAddress === WSOL_ADDRESS
      );
      const logo = CHAINS_BY_ID[wormholeChainId]?.logo || CHAINS_BY_ID[CHAIN_ID_ETH].logo;
      // if bridged or swapped, take different values
      const sourceAmt = row.tokenAmt || row.swapInAmt;
      const txnType = row.txnType;

      return (
        // <div className={cx(SourceRow, css`
        //   word-wrap: break-word;
        //   word-break: break-word;
        //   max-width: 208px;
        // `)}>
        <div className={SourceRow}>
          {row.sourceChainId && row.sender && (
            <>
              <ChainLogo className={styleChainLogo} chainId={wormholeChainId} />
              <div className={TokenRow}>
                <div className={TokenAmt}>
                  {txnType === TXN_TYPE.NFT_BRIDGE ? (
                    <>
                      {renderNFTName(
                        row.sourceTokenAddress,
                        row.tokenId ? row.tokenId.toString() : '',
                        row.sourceChainId as CarrierChainId,
                      )}
                    </>
                  ) : sourceAmt ? (
                    <>
                      {' '}
                      {simplifiedReadableAmount(
                        row.sourceTokenAddress,
                        sourceAmt,
                        wormholeChainId,
                        isNFT,
                        isSourceSolanaNativeBridge,
                      )}
                      {` `}
                      {getTokenSymbol(row.sourceTokenAddress, wormholeChainId)}
                    </>
                  ) : (
                    <>N/A</>
                  )}
                </div>
                <div className={Address}>
                  {addressShortener(tryConvertChecksumAddress(row.sender, wormholeChainId))}
                </div>
              </div>
              {/* <SVGIcon className={styleIconRight} iconName="arrow-right" /> */}
            </>
          )}
        </div>
      );
    },
    [getTokenSymbol, renderNFTName, simplifiedReadableAmount],
  );

  const renderEmptyComponent = useCallback(() => {
    return (
      <div className={cx(styleTips, pigeonStyleTips)}>
        <SVGIcon className={stylePigeonIcon} iconName="pigeon" />
        No transactions yet
        <Button className={goToBridgeButton} type="primary" onClick={() => navigate(routes.tokenBridge.getPath())}>
          <SVGIcon className={cx(styleTypeIcon, goToBridgeIcon)} iconName="bridge" />
          Bridge
        </Button>
      </div>
    );
  }, [navigate]);

  function renderMobileTransactionList(transactions: TransactionResult | undefined) {
    if (!transactionCache.length) {
      if (isLoading) {
        return (
          <div className={styleLoading}>
            <Spinner />
          </div>
        );
      }
      if (error) {
        return (
          <div className={styleTips}>
            <SVGIcon className={styleErrorIcon} iconName="exclaimation-triangle" />
            Something went wrong
          </div>
        );
      }
    }

    return transactionCache.length ? (
      <>
        {transactionCache.map((item) => {
          const actions = renderAction(item, true);

          return (
            <div key={item.txn} className={styleMobileTransactionListItem}>
              <div className={styleMobileTransactionTimeRow}>{renderTime(item)}</div>
              <div className={styleMobileTransactionSourceDestRow}>
                <div className={styleMobileTransactionSourceCol}>{renderSource(item)}</div>
                <SVGIcon className={styleIconRight} iconName="arrow-right" />
                <div className={styleMobileTransactionDestCol}>{renderDest(item)}</div>
              </div>
              <div className={styleMobileTransactionStatusRow}>
                {renderType(item)}
                {actions.length && actions.length > 1 ? (
                  <div className={styleMobileTransactionActionRedeem}>{actions[0]}</div>
                ) : null}
              </div>
              {actions.length && actions.length > 1 ? (
                <div className={styleMobileTransactionActionDetails}>{actions[1]}</div>
              ) : (
                <div className={styleMobileTransactionActionDetails}>{actions[0]}</div>
              )}
            </div>
          );
        })}
        {isLoading || transactions?.next ? (
          <div className={styleFooterLoading}>
            <Spinner />
          </div>
        ) : null}
      </>
    ) : (
      renderEmptyComponent()
    );
  }

  const renderSmallTransactionList = useCallback(
    (transactions: TransactionResult | undefined) => {
      if (isLoading && !transactions?.results.length) {
        return (
          <div className={styleLoadingTips}>
            <div>This may take a while...</div>
            <Spinner />
          </div>
        );
      }
      if (error) {
        return (
          <div className={styleTips}>
            <SVGIcon className={styleErrorIcon} iconName="exclaimation-triangle" />
            Something went wrong
          </div>
        );
      }
      if (!transactions?.results.length) {
        return renderEmptyComponent();
      }

      return (
        <div className={styleSmallTransactionList}>
          {transactions.results
            .sort(
              (a: CarrierTxnObject, b: CarrierTxnObject) =>
                new Date(b.updated).getTime() - new Date(a.updated).getTime(),
            )
            .map((item) => {
              const actions = renderAction(item, false);
              return (
                <div key={item.txn} className={styleSmallTransactionListItem}>
                  <div className={styleSmallTransactionTimeRow}>{renderTime(item)}</div>
                  <div className={styleSmallTransactionSourceDestRow}>
                    <div className={styleSmallTransactionSourceCol}>{renderSource(item)}</div>
                    <SVGIcon className={styleIconRight} iconName="arrow-right" />
                    <div className={styleSmallTransactionDestCol}>{renderDest(item)}</div>
                  </div>
                  <div className={styleSmallTransactionStatusRow}>
                    <div className={styleSmallTransactionStatusLeftCol}>
                      {renderType(item)}
                      {actions.length ? (
                        <>
                          <div className={styleSmallTransactionDot}>•</div>
                          <div className={styleMobileTransactionActionRedeem}>{actions}</div>
                        </>
                      ) : null}
                    </div>
                    <Link to={`/tx/${item.txn}`} className={styleSmallTransactionStatusViewDetails}>
                      <SVGIcon className={styleDetailButtonIcon} iconName="eye" />
                      View Details
                    </Link>
                  </div>
                </div>
              );
            })}
        </div>
      );
    },
    [error, isLoading, renderAction, renderDest, renderEmptyComponent, renderSource, renderTime],
  );

  const columns: ColumnsType<CarrierTxnObject> = [
    {
      key: 'source',
      dataIndex: ['sourceChainId', 'sender', 'sourceTokenAddress', 'tokenAmt', 'tokenId', 'swapInAmt'],
      title: 'Source',
      render: (text, row) => {
        return renderSource(row);
      },
    },
    {
      width: pxToPcVw(20),
      render: () => <SVGIcon className={styleIconRight} iconName="arrow-right" />,
    },
    {
      key: 'dest',
      dataIndex: ['txnType', 'destChainId', 'recipient', 'destTokenAddress', 'tokenAmt', 'tokenId', 'swapOutAmt'],
      title: 'Destination',
      render: (text, row) => {
        return renderDest(row);
      },
    },
    {
      key: 'type',
      dataIndex: ['txnType', 'status', 'signedVAABytes', 'redeemTxn'],
      title: 'Type',
      width: pxToPcVw(145),
      render: (_, row) => {
        return renderType(row);
      },
    },
    {
      key: 'date',
      dataIndex: 'updated',
      title: 'Date',
      width: pxToPcVw(90),
      defaultSortOrder: 'descend',
      sorter: {
        compare: (a: CarrierTxnObject, b: CarrierTxnObject) =>
          new Date(a.updated).getTime() - new Date(b.updated).getTime(),
      },
      render: (updated, row) => {
        return renderTime(row);
      },
    },
    {
      key: 'action',
      dataIndex: ['arbiterFee', 'status', 'signedVAABytes', 'txn'],
      title: 'Action',
      width: pxToPcVw(142),
      render: (text, row) => {
        const actions = renderAction(row, false);

        return actions.length ? actions : '-';
      },
    },
  ];

  const onPageChange = (page: number, pageSize: number) => {
    // antd page number starts from 1
    // indexer page number starts from 0
    const newPage = page - 1;
    setPageIndex(newPage);
  };

  const countAccumulateItems = () => {
    if (initialTransactions?.previous === null && initialTransactions?.next === null) {
      return initialTransactions?.results.length;
    } else if (initialTransactions?.previous !== null && initialTransactions?.next === null) {
      // reached end of page
      // sum = previous page * limit + current page items
      return (initialTransactions?.previous + 1) * 10 + initialTransactions?.results.length;
    }
    return (pageIndex + 1) * (initialTransactions?.results.length || 0);
  };

  return (
    <>
      <div className={styleTransactionTable}>
        {isLoading || (!isLoading && initialTransactions?.results.length) ? (
          <>
            <Table
              className={TableWrapper}
              columns={columns}
              dataSource={initialTransactions?.results}
              rowKey={(obj: CarrierTxnObject) => obj.txn}
              loading={isLoading}
              pagination={false}
              tableLayout="fixed"
              locale={{
                emptyText: (
                  <div className={styleLoadingTips}>
                    <div>This may take a while...</div>
                    <Spinner />
                  </div>
                ),
              }}
              // scroll={{ x: 782 }}
              onRow={(record) => ({
                onClick: () => {
                  navigate(`/tx/${record.txn}`, {
                    state: {
                      prevUrl: location.pathname,
                    },
                  });
                },
              })}
            />

            <div className={styleSmallTransactionListWrapper}>{renderSmallTransactionList(initialTransactions)}</div>

            {initialTransactions && initialTransactions.results.length > 0 && (
              <div className={PaginationWrapper}>
                <Pagination
                  defaultCurrent={1}
                  current={pageIndex + 1}
                  showLessItems={true}
                  showQuickJumper={false}
                  showSizeChanger={false}
                  hideOnSinglePage={true}
                  onChange={onPageChange}
                  total={initialTransactions.counts}
                />
                <div className={itemsCounter}>
                  {countAccumulateItems()} of {initialTransactions.counts} Transactions
                </div>
              </div>
            )}
          </>
        ) : (
          renderEmptyComponent()
        )}
      </div>
      <div ref={mobileListRef} className={styleMobileTransactionList}>
        {renderMobileTransactionList(initialTransactions)}
      </div>
    </>
  );
};

const PaginationWrapper = css`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;

  margin-top: ${pxToPcVw(10)};
  padding: ${pxToPcVw(6)};

  .ant-pagination-item {
    color: var(--color-text-3);
    font-weight: 600;
    font-size: ${pxToPcVw(16)};
    background: transparent;
    border: ${pxToPcVw(2)} solid transparent;
    border-radius: ${pxToPcVw(8)};
  }

  .ant-pagination-jump-prev .ant-pagination-item-container .ant-pagination-item-ellipsis,
  .ant-pagination-jump-next .ant-pagination-item-container .ant-pagination-item-ellipsis {
    color: var(--color-text-3);
  }

  span.anticon.anticon-double-left.ant-pagination-item-link-icon,
  span.anticon.anticon-double-right.ant-pagination-item-link-icon {
    margin-top: ${pxToPcVw(10)};
    color: var(--ant-primary-4);
  }

  .ant-pagination-item:hover {
    border: ${pxToPcVw(2)} solid var(--ant-primary-color);
  }

  .ant-pagination > .ant-pagination-item-active {
    background: var(--ant-primary-color);
    border-radius: ${pxToPcVw(4)};
  }

  .ant-pagination-item-active a {
    color: #fff;
  }

  .ant-pagination-prev > .ant-pagination-item-link {
    color: #fff;
    background: var(--ant-primary-4);
    border-radius: ${pxToPcVw(4)};
  }

  .ant-pagination-next > .ant-pagination-item-link {
    color: #fff;
    background: var(--ant-primary-4);
    border-radius: ${pxToPcVw(4)};
  }
`;

const TableWrapper = css`
  @media (max-width: 1140px) {
    display: none;
  }

  .ant-table {
    border-radius: ${pxToPcVw(8)};
    border: ${pxToPcVw(2)} solid var(--ant-primary-color);
    background: var(--ant-background-2);
  }

  .ant-table-thead .ant-table-cell {
    background: var(--ant-background-2);
    font-weight: 400;
    font-size: ${pxToPcVw(16)};
    line-height: ${pxToPcVw(20)};
    color: #fff;

    border-bottom: ${pxToPcVw(2)} solid var(--ant-primary-color);
  }

  .ant-table-tbody .ant-table-row:hover {
    cursor: pointer;
  }

  .ant-table-tbody .ant-table-cell {
    border-bottom: ${pxToPcVw(2)} solid var(--ant-primary-color);
  }
  .ant-table-tbody .ant-table-row:last-child .ant-table-cell {
    border-bottom: 0;
  }

  .ant-spin.ant-spin-spinning {
    display: none;
  }

  .ant-spin-container.ant-spin-blur {
    opacity: 1;

    &::after {
      display: none;
    }
  }

  .ant-table-empty .ant-table-tbody > tr.ant-table-placeholder {
    color: #fff;
  }

  .ant-table-thead > tr > th,
  .ant-table-tbody > tr > td,
  .ant-table tfoot > tr > th,
  .ant-table tfoot > tr > td {
    padding-left: ${pxToPcVw(16)};
    padding-right: ${pxToPcVw(16)};
  }

  .ant-table-thead > tr > th:nth-child(2),
  .ant-table-tbody > tr > td:nth-child(2) {
    padding: 0;
  }

  .ant-table-tbody > tr > td {
    font-weight: 400;
    font-size: ${pxToPcVw(14)};
  }

  .ant-table-tbody > tr.ant-table-row:hover > td,
  .ant-table-tbody > tr > td.ant-table-cell-row-hover,
  .ant-table-tbody > tr.ant-table-placeholder:hover > td {
    background: var(--ant-primary-1);
  }

  td.ant-table-column-sort {
    background-color: transparent;
  }

  /* Works on Chrome, Safari */
  *::-webkit-scrollbar {
    width: ${pxToPcVw(8)};
    height: ${pxToPcVw(6)};
    background-color: var(--ant-primary-color);
  }
`;

const styleLoadingTips = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: auto;
  gap: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(8)};
  }
`;

const styleDateContainer = css`
  font-weight: 400;
  font-size: ${pxToPcVw(14)};
  color: var(--color-text-3);

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(14)};
  }
`;

const DateToolTip = css`
  font-weight: 600;
  font-size: ${pxToPcVw(12)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(12)};
  }
`;

const TypeWrapper = css`
  display: flex;
  flex-direction: row;
  align-items: center;
  font-weight: 400;
  gap: ${pxToPcVw(8)};
  font-size: ${pxToPcVw(14)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(8)};
    font-size: ${pxToMobileVw(14)};
  }
`;

const RegularTypeTextColor = css`
  // set to secondary text color when type is bridged or swapped
  color: var(--color-text-3);
`;

const BlueTypeTextColor = css`
  // set to blue color when type is bridging, swapping, or awaiting redeem
  color: var(--ant-primary-5);
`;

const RedTypeTextColor = css`
  // set to red color when type is failed
  color: var(--color-error);
`;

const SourceRow = css`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: ${pxToPcVw(16)};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 1024px) {
    gap: 0;
  }
`;

const styleChainLogo = css`
  width: ${pxToPcVw(32)};
  height: ${pxToPcVw(32)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(32)};
    height: ${pxToMobileVw(32)};
    margin-right: ${pxToMobileVw(19)};
  }
`;

const TokenRow = css`
  display: flex;
  flex-direction: column;
  gap: ${pxToPcVw(4)};
  min-width: 0;

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(4)};
    width: 100%;
  }
`;

const TokenAmt = css`
  font-weight: 500;
  color: #ffffff;
  line-height: 1.2em;
  font-size: ${pxToPcVw(16)};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(16)};
  }
`;

const Address = css`
  font-weight: 400;
  color: var(--color-text-3);
  font-size: ${pxToPcVw(14)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(14)};
  }
`;

const styleIconRight = css`
  width: ${pxToPcVw(20)};
  height: ${pxToPcVw(18)};
  flex-shrink: 0;

  & > * {
    fill: var(--ant-primary-4);
  }

  @media (max-width: 1024px) {
    flex-shrink: 0;
    width: ${pxToMobileVw(20)};
    height: ${pxToMobileVw(18)};
    margin-top: ${pxToMobileVw(16)};
  }
`;

const styleDate = css`
  cursor: pointer;
`;

const styleTypeIcon = css`
  width: ${pxToPcVw(16)};
  height: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(16)};
    height: ${pxToMobileVw(16)};
  }
`;

const regularTypeIconColor = css`
  fill: var(--color-text-3);
`;

const blueTypeIconColor = css`
  fill: var(--ant-primary-5);
`;

const redTypeIconColor = css`
  fill: var(--color-error);
`;

const ActionButton = css`
  display: flex;
  align-items: center;
  color: var(--ant-primary-5);
  font-weight: 600;
  gap: ${pxToPcVw(8)};
  white-space: nowrap;

  &:hover {
    cursor: pointer;
    opacity: 0.5;
  }

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(8)};
    flex-basis: 0;
    flex-grow: 1;
    justify-content: center;
    border-left: solid ${pxToMobileVw(2)} var(--color-border);

    &:first-child {
      border-left: none;
    }
  }
`;

const styleTransactionTable = css`
  @media (max-width: 1024px) {
    display: none;
  }
`;

const styleMobileTransactionList = css`
  display: none;

  @media (max-width: 1024px) {
    display: block;
  }
`;

const styleSmallTransactionListWrapper = css`
  @media (max-width: 1024px), (min-width: 1141px) {
    display: none;
  }
`;

const styleSmallTransactionList = css`
  border-radius: ${pxToPcVw(8)};
  border: solid ${pxToPcVw(2)} var(--color-border);
  overflow: hidden;
`;

const styleSmallTransactionListItem = css`
  padding: ${pxToPcVw(24)} ${pxToPcVw(16)};
  border-bottom: solid ${pxToPcVw(2)} var(--color-border);
  display: flex;
  flex-direction: column;
  gap: ${pxToPcVw(20)};

  &:last-child {
    border-bottom: 0;
  }

  &:hover {
    background: var(--ant-primary-1);
  }
`;

const styleSmallTransactionTimeRow = css`
  display: flex;
  justify-content: flex-start;
`;

const styleSmallTransactionSourceDestRow = css`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const styleSmallTransactionSourceCol = css`
  width: calc(50% - ${pxToPcVw(10)});
  padding-right: ${pxToPcVw(32)};
  display: flex;
`;

const styleSmallTransactionDestCol = css`
  width: calc(50% - ${pxToPcVw(10)});
  padding-left: ${pxToPcVw(32)};
  display: flex;
`;

const styleSmallTransactionStatusRow = css`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const styleSmallTransactionDot = css`
  color: var(--color-border);
`;

const styleSmallTransactionStatusLeftCol = css`
  display: inline-flex;
  flex-direction: row;
  gap: ${pxToPcVw(10)};
  align-items: center;
`;

const styleSmallTransactionStatusViewDetails = css`
  display: flex;
  align-items: center;
  gap: ${pxToPcVw(8)};
  cursor: pointer;
`;

const styleTips = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1.2em;
  font-weight: 500;
  gap: ${pxToPcVw(24)};
  font-size: ${pxToPcVw(24)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(24)};
    font-size: ${pxToMobileVw(24)};
  }
`;

const pigeonStyleTips = css`
  margin-top: ${pxToPcVw(84)};
  padding-bottom: ${pxToPcVw(84)};

  @media (max-width: 1024px) {
    margin-top: ${pxToMobileVw(84)};
    padding-bottom: ${pxToMobileVw(84)};
  }
`;

const goToBridgeButton = css`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding-inline: ${pxToPcVw(12)};
  gap: ${pxToPcVw(8)};
  height: ${pxToPcVw(44)};
  background: var(--ant-primary-1);
  border: ${pxToPcVw(2)} solid var(--ant-primary-4);
  border-radius: ${pxToPcVw(8)};
  color: var(--color-text);
  font-weight: 600;
  font-size: ${pxToPcVw(14)};

  @media (max-width: 1024px) {
    padding-inline: ${pxToMobileVw(12)};
    gap: ${pxToMobileVw(8)};
    height: ${pxToMobileVw(44)};
    border-width: ${pxToMobileVw(2)};
    border-radius: ${pxToMobileVw(8)};
    font-size: ${pxToMobileVw(14)};
  }

  &:hover,
  &:focus,
  &:focus-visible {
    background: var(--ant-primary-4);
    border-color: var(--ant-primary-4);
  }
`;

const goToBridgeIcon = css`
  width: ${pxToPcVw(16)};
  height: ${pxToPcVw(16)};
  fill: currentColor;

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(16)};
    height: ${pxToMobileVw(16)};
  }
`;

const stylePigeonIcon = css`
  width: ${pxToPcVw(56)};
  height: ${pxToPcVw(56)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(56)};
    height: ${pxToMobileVw(56)};
  }
`;

const styleErrorIcon = css`
  width: ${pxToPcVw(56)};
  height: ${pxToPcVw(56)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(56)};
    height: ${pxToMobileVw(56)};
  }
`;

const styleLoading = css`
  display: flex;
  justify-content: center;
`;

const styleFooterLoading = css`
  display: flex;
  justify-content: center;
  padding: ${pxToPcVw(12)};

  @media (max-width: 1024px) {
    padding: ${pxToMobileVw(12)};
  }
`;

const styleRedeemButtonIcon = css`
  width: ${pxToPcVw(20)};
  height: ${pxToPcVw(20)};

  & > * {
    fill: var(--ant-primary-5);
  }

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(20)};
    height: ${pxToMobileVw(20)};
  }
`;

const styleDetailButtonIcon = css`
  width: ${pxToPcVw(25)};
  height: ${pxToPcVw(20)};

  & > * {
    stroke: var(--ant-primary-5);
  }

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(25)};
    height: ${pxToMobileVw(20)};
  }
`;

const styleMobileTransactionListItem = css`
  @media (max-width: 1024px) {
    margin-bottom: ${pxToMobileVw(24)};
    padding-bottom: ${pxToMobileVw(12)};
    border-bottom: solid ${pxToMobileVw(2)} var(--color-border);
    display: flex;
    flex-direction: column;
    gap: ${pxToMobileVw(20)};
  }
`;

const styleMobileTransactionTimeRow = css`
  @media (max-width: 1024px) {
    display: flex;
  }
`;

const styleMobileTransactionSourceDestRow = css`
  @media (max-width: 1024px) {
    display: flex;
    align-items: center;
    /* margin-top: ${pxToMobileVw(24)}; */
  }
`;

const styleMobileTransactionSourceCol = css`
  @media (max-width: 1024px) {
    // 50% width + half width of arrow right
    width: calc(50% - ${pxToMobileVw(10)});
    padding-right: ${pxToMobileVw(24)};
    display: flex;
    justify-content: flex-start;

    .${SourceRow} {
      flex-direction: column;
      align-items: flex-start;
      gap: ${pxToMobileVw(12)};

      .${styleChainLogo} {
        margin-right: 0;
      }
    }
  }
`;

const styleMobileTransactionDestCol = css`
  @media (max-width: 1024px) {
    // 50% width + half width of arrow right
    width: calc(50% - ${pxToMobileVw(10)});
    padding-left: ${pxToMobileVw(24)};
    display: flex;
    justify-content: flex-end;

    .${SourceRow} {
      flex-direction: column;
      align-items: flex-end;
      gap: ${pxToMobileVw(12)};

      .${styleChainLogo} {
        margin-right: 0;
      }
      .${TokenRow} {
        align-items: flex-end;
      }
    }
  }
`;

const styleMobileTransactionStatusRow = css`
  @media (max-width: 1024px) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${pxToMobileVw(26)};
    /* margin-top: ${pxToMobileVw(12)}; */
  }
`;

const styleMobileTransactionActionRedeem = css`
  @media (max-width: 1024px) {
    display: flex;
    align-items: center;
  }
`;

const styleMobileTransactionActionDetails = css`
  @media (max-width: 1024px) {
    display: flex;
    align-items: center;
    border-top: solid ${pxToMobileVw(2)} var(--color-border);
    padding-top: ${pxToMobileVw(12)};
  }
`;

const itemsCounter = css`
  font-weight: 500;
  font-size: ${pxToPcVw(16)};
  line-height: 1.25;
  color: var(--color-text-3);
`;

export default TransactionHistory;
