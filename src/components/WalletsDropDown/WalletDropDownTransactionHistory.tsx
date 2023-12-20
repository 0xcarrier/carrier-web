import React from 'react';
import { Link } from 'react-router-dom';
import { useLocation, useNavigate } from 'react-router-dom';

import { CHAIN_ID_SOLANA, WSOL_ADDRESS } from '@certusone/wormhole-sdk';
import { css, cx } from '@linaria/core';
import { Tooltip, Typography } from 'antd';
import axios from 'axios';
import uniqWith from 'lodash/uniqWith';
import useSWR from 'swr';

import { CarrierChainId, TXN_INDEXER, TXN_STATUS, TXN_TYPE, getDefaultNativeCurrencySymbol } from '../../utils/consts';
import { routes } from '../../utils/routes';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { computeHumanReadableCurrency, getChainInfo, getTokenInfoKey } from '../../utils/web3Utils';
import { Spinner } from '../common/Spinner';
import { ChainLogo } from '../common/ChainLogo';
import { useRexContext } from '@jimengio/rex';
import { IStore } from '../../store';
import { CarrierTxnObject, TokenInfo } from '../../utils/transaction-indexer';
import { SVGIcon } from '../common/SVGIcon';

interface IProps {
  onDropdownClose: () => void;
}

export const WalletDropDownTransactionHistory: React.FunctionComponent<IProps> = ({ onDropdownClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { walletCache } = useRexContext((store: IStore) => store);

  const uniqueWallets = uniqWith(walletCache, (a, b) => a.address.toLowerCase() === b.address.toLowerCase()).map(
    (item) => item.address,
  );

  const { data, error } = useSWR(
    [
      'fetchTransactions',
      !!uniqueWallets.length
        ? `${TXN_INDEXER}/api/v1/transactions?limit=10&sender=${uniqueWallets.join(',')}&recipient=${uniqueWallets.join(
            ',',
          )}&type=token,nft`
        : null,
    ],
    getTransactions,
    { refreshInterval: !!uniqueWallets.length ? 5000 : undefined }, // don't poll if unique wallets is empty
  );
  const isLoading = !data && !error;

  const transferTransactions =
    data && data.results
      ? data.results.filter((item) => item.txnType === TXN_TYPE.TOKEN_BRIDGE || item.txnType === TXN_TYPE.NFT_BRIDGE)
      : [];

  const tokenInfoMap = data ? data.tokenInfoMap : {};

  function renderTransactionHistoryItem(transaction: CarrierTxnObject) {
    const wormholeSourceChainId = transaction.sourceChainId as CarrierChainId;
    const wormholeDestChainId = transaction.destChainId as CarrierChainId;
    const sourceChainInfo = getChainInfo(wormholeSourceChainId);
    const destChainInfo = getChainInfo(wormholeDestChainId);
    const sourceTokenAddress = transaction.sourceTokenAddress;
    const isSourceSolanaNativeBridge = !!(
      wormholeSourceChainId === CHAIN_ID_SOLANA && sourceTokenAddress.toLowerCase() === WSOL_ADDRESS.toLowerCase()
    );
    const sourceAmt = transaction.tokenAmt || transaction.swapInAmt;
    const tokenId = transaction.tokenId;

    const tokenInfoKey = getTokenInfoKey(sourceTokenAddress, wormholeSourceChainId);
    const tokenInfo = tokenInfoMap[tokenInfoKey];
    const status = transaction.status;
    const txnType = transaction.txnType;
    const date = transaction.updated;
    const amountString = sourceAmt
      ? `${computeHumanReadableCurrency(tokenInfo, sourceAmt, isSourceSolanaNativeBridge)} ${getTokenSymbol(
          tokenInfo,
          wormholeSourceChainId,
        )}`
      : tokenId
      ? `1 ${getNftSymbol(tokenInfo, wormholeSourceChainId)} #${tokenId}`
      : 'N/A';

    return (
      <div
        key={transaction.txn}
        className={styleTransactionHistroyItem}
        onClick={() => {
          navigate(`/tx/${transaction.txn}`, {
            state: {
              prevUrl: location.pathname,
            },
          });
          onDropdownClose();
        }}>
        <div className={styleTransactionInfoRow}>
          <ChainLogo className={styleTransactionInfoChainLogo} chainId={wormholeSourceChainId} />
          <Tooltip trigger={['click', 'hover']} title={amountString}>
            <Typography.Text className={styleTransactionInfoAmount} ellipsis={true}>
              {amountString}
            </Typography.Text>
          </Tooltip>
          <div className={styleTransactionInfoNetwork}>
            {sourceChainInfo.name}
            <SVGIcon className={styleIconRight} iconName="arrow-right" />
            {destChainInfo.name}
          </div>
        </div>
        <div className={styleTransactionProgressBar}>
          <div
            className={styleTransactionProgressBarInner}
            style={{
              width:
                status === TXN_STATUS.FAILED
                  ? '0%'
                  : status === TXN_STATUS.PENDING || status === TXN_STATUS.CONFIRMED
                  ? '50%'
                  : status === TXN_STATUS.REDEEMED
                  ? '100%'
                  : '0%',
            }}
          />
        </div>
        <div className={styleTransactionInfoRow}>
          <div
            className={cx(
              styleTransactionInfoStatus,
              status === TXN_STATUS.PENDING ? styleTransactionInfoProgressing : undefined,
            )}>
            <div className={styleTransactionInfoIcon}>
              {status === TXN_STATUS.PENDING ? (
                <Spinner />
              ) : txnType === TXN_TYPE.TOKEN_BRIDGE || txnType === TXN_TYPE.NFT_BRIDGE ? (
                <SVGIcon className={styleBridgeIcon} iconName="bridge" />
              ) : (
                <SVGIcon className={styleSwapIcon} iconName="swap-round" />
              )}
            </div>
            {getTxnTypeText(txnType, status)}
          </div>
          <div
            className={cx(
              styleTransactionInfoDate,
              status === TXN_STATUS.PENDING ? styleTransactionInfoProgressing : undefined,
            )}>
            {status === TXN_STATUS.PENDING ? '' : formatDate(new Date(date))}
          </div>
        </div>
      </div>
    );
  }

  function renderTransactionHistories(transactions: CarrierTxnObject[]) {
    return error ? (
      error.message === 'no connected wallets' ? (
        <div className={styleTips}>Please connect your wallet first</div>
      ) : (
        <div className={styleTips}>Something went wrong: {error.toString()}</div>
      )
    ) : (
      <>
        <div className={styleTransactions}>
          {data && data.msg && data.msg !== 'success' ? (
            <div className={styleTips}>Something went wrong: {data.msg || 'Unknown error'}</div>
          ) : !uniqueWallets.length || !transferTransactions.length ? (
            <div className={styleTips}>You don't have any transactions now</div>
          ) : (
            transactions.map((item) => {
              return renderTransactionHistoryItem(item);
            })
          )}
        </div>
        <div className={styleFooter}>
          <div className={styleTransactionCount}>{transactions.length} Transactions</div>
          <Link onClick={onDropdownClose} to={routes.allTransactions.getPath()} className={styleLink}>
            All History
          </Link>
        </div>
      </>
    );
  }

  return (
    <div className={styleTransactionHistroyContrainer}>
      {isLoading ? (
        <div className={styleMainLoading}>
          <Spinner />
        </div>
      ) : (
        renderTransactionHistories(transferTransactions)
      )}
    </div>
  );
};

const getTxnTypeText = (txnType: string, status: string) => {
  if (txnType === TXN_TYPE.TOKEN_BRIDGE || txnType === TXN_TYPE.NFT_BRIDGE) {
    if (status === TXN_STATUS.REDEEMED) {
      return 'Bridged';
    }
    return 'Bridging';
  } else if (txnType === TXN_TYPE.SWAP) {
    if (status === TXN_STATUS.REDEEMED) {
      return 'Swapped';
    }
    return 'Swapping';
  }
};

type TokenInfoMap = { [k in string]: TokenInfo };

async function getTransactions(key: string, url: string | null) {
  if (!url) {
    throw new Error('no connected wallets');
  }

  let results: CarrierTxnObject[] = [];
  const tokenInfoMap: TokenInfoMap = {};
  let counts = 0; // total no. of items
  let pages = 0; // number of pages
  let current = 0; // current page
  let previous = null; // track if there is a previous page
  let next = null; // track if there is a next page
  let msg = '';

  try {
    console.log('querying txn indexer.....', url);
    const res = await axios.get(url);

    if (!res.data) {
      throw new Error('not found');
    }

    results = res.data.results.transactions;

    for (const token of res.data.results.tokens) {
      const key = getTokenInfoKey(token.tokenAddress, token.chainId as CarrierChainId);
      tokenInfoMap[key] = token;
    }

    counts = res.data.results.counts;
    pages = res.data.results.pages;
    current = res.data.results.current;
    previous = res.data.results.previous;
    next = res.data.results.next;
    msg = res.data.msg;
  } catch (e) {
    console.error(e);
  }

  return {
    results,
    tokenInfoMap,
    counts,
    pages,
    current,
    previous,
    next,
    msg,
  };
}

function getTokenSymbol(tokenInfo: TokenInfo, chainId: CarrierChainId): string {
  return tokenInfo?.symbol && tokenInfo.chainId === chainId
    ? tokenInfo?.symbol || tokenInfo?.name
    : getDefaultNativeCurrencySymbol(chainId);
}

function getNftSymbol(tokenInfo: TokenInfo, chainId: CarrierChainId): string {
  return tokenInfo?.symbol && tokenInfo.chainId === chainId ? tokenInfo?.symbol : 'NFT';
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
}

const styleTransactionHistroyContrainer = css`
  @media (max-width: 1024px) {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
`;

const styleTips = css`
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-3);
  padding: ${pxToPcVw(16)};
  font-size: ${pxToPcVw(14)};

  @media (max-width: 1024px) {
    padding: ${pxToMobileVw(16)};
    font-size: ${pxToMobileVw(14)};
  }
`;

const styleTransactionHistroyItem = css`
  padding: ${pxToPcVw(16)};
  border-bottom: ${pxToPcVw(2)} solid var(--color-border);

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    cursor: pointer;
    background: var(--ant-primary-1);
  }

  @media (max-width: 1024px) {
    padding: ${pxToMobileVw(16)};
    border-bottom: ${pxToMobileVw(2)} solid var(--color-border);
  }
`;

const styleTransactionInfoRow = css`
  display: flex;
  align-items: center;
  overflow: hidden;
`;

const styleTransactionInfoProgressing = css`
  color: var(--ant-primary-5);
`;

const styleTransactionInfoChainLogo = css`
  width: ${pxToPcVw(32)};
  height: ${pxToPcVw(32)};
  margin-right: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(32)};
    height: ${pxToMobileVw(32)};
    margin-right: ${pxToMobileVw(8)};
  }
`;

const styleTransactionInfoAmount = css`
  color: #fff;
  font-weight: 700;
  font-size: ${pxToPcVw(14)};
  margin-right: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(14)};
    margin-right: ${pxToMobileVw(8)};
  }
`;

const styleTransactionInfoNetwork = css`
  margin-left: auto;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  white-space: nowrap;
  color: #fff;
  font-weight: 500;
  font-size: ${pxToPcVw(14)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(14)};
  }
`;

const styleIconRight = css`
  width: ${pxToPcVw(20)};
  height: ${pxToPcVw(18)};
  margin: 0 ${pxToPcVw(15)};

  & > * {
    fill: var(--ant-primary-4);
  }

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(20)};
    height: ${pxToMobileVw(18)};
    margin: 0 ${pxToMobileVw(15)};
  }
`;

const styleTransactionInfoStatus = css`
  display: flex;
  align-items: center;
  flex-grow: 1;
  color: var(--color-text-3);
  font-weight: 400;
  font-size: ${pxToPcVw(14)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(14)};
  }
`;

const styleTransactionInfoIcon = css`
  display: flex;
  margin-right: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    margin-right: ${pxToMobileVw(8)};
  }
`;

const styleTransactionInfoDate = css`
  color: var(--color-text-3);
  font-weight: 400;
  font-size: ${pxToPcVw(14)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(14)};
  }
`;

const styleSwapIcon = css`
  width: ${pxToPcVw(12)};
  height: ${pxToPcVw(12)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(12)};
    height: ${pxToMobileVw(12)};
  }
`;

const styleBridgeIcon = css`
  width: ${pxToPcVw(16)};
  height: ${pxToPcVw(16)};

  * {
    fill: var(--color-text-3);
  }

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(16)};
    height: ${pxToMobileVw(16)};
  }
`;

const styleMainLoading = css`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    padding: ${pxToMobileVw(16)};
  }
`;

const styleTransactionProgressBar = css`
  margin: ${pxToPcVw(8)} 0;
  height: ${pxToPcVw(8)};
  border-radius: ${pxToPcVw(10)};
  background-color: var(--ant-primary-color);

  @media (max-width: 1024px) {
    margin: ${pxToMobileVw(8)} 0;
    height: ${pxToMobileVw(8)};
    border-radius: ${pxToMobileVw(10)};
  }
`;

const styleTransactionProgressBarInner = css`
  height: ${pxToPcVw(8)};
  border-radius: ${pxToPcVw(10)};
  background-color: var(--ant-primary-5);

  @media (max-width: 1024px) {
    height: ${pxToMobileVw(8)};
    border-radius: ${pxToMobileVw(10)};
  }
`;

const styleTransactions = css`
  overflow-y: auto;
  max-height: 50vh;

  @media (max-width: 1024px) {
    max-height: none;
  }
`;

const styleFooter = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${pxToPcVw(16)};
  border-top: ${pxToPcVw(2)} solid var(--color-border);

  @media (max-width: 1024px) {
    flex-shrink: 0;
    padding: ${pxToMobileVw(16)};
    border-top: ${pxToMobileVw(2)} solid var(--color-border);
    border-bottom: ${pxToMobileVw(2)} solid var(--color-border);
  }
`;

const styleTransactionCount = css`
  color: var(--color-text-3);
  font-weight: 400;
  font-size: ${pxToPcVw(14)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(14)};
  }
`;

const styleLink = css`
  font-weight: 600;
  color: var(--ant-primary-5);
  font-size: ${pxToPcVw(14)};

  &:hover {
    text-decoration: underline;
  }

  &:hover,
  &:active {
    color: var(--ant-primary-5);
  }

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(14)};
  }
`;
