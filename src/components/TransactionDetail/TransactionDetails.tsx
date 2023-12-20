import React, { useMemo } from 'react';
import { Link, matchPath, useLocation, useParams } from 'react-router-dom';

import { CHAIN_ID_SOLANA } from '@certusone/wormhole-sdk';
import { css, cx } from '@linaria/core';
import { PublicKey } from '@metaplex-foundation/js';
import { format } from 'date-fns';
import isEmpty from 'lodash/isEmpty';

import { CarrierChainId, TXN_INDEXER, TXN_STATUS } from '../../utils/consts';
import { routes } from '../../utils/routes';
import { getSolanaConnection } from '../../utils/solana';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { addressShortener, getTokenInfoKey, isMobileBrowser } from '../../utils/web3Utils';
import { SVGIcon } from '../common/SVGIcon';
import { TxStatusPill } from '../common/TxStatusPill';
import { CarrierTxnObject, TokenInfo } from '../../utils/transaction-indexer';
import { DerivedNFTInfo, DerivedTokenInfo, useDerivedTxTokenInfo } from './hooks/useDerivedTransferredToken';
import { Loading } from '../common/Loading';
import { useData } from '../../hooks/useData';
import { NFTCover } from '../common/NFTCover';
import { CurrencyIcon } from '../common/CurrencyIcon';
import { copyContent } from '../../utils/copyToClipboard';
import { Spinner } from '../common/Spinner';
import { BridgeBreakdown } from './BridgeBreakdown';

interface Props {}

export const TransactionDetails: React.FunctionComponent<Props> = (props) => {
  const { txHash } = useParams();

  const options = useData(
    async () => {
      const url = `${TXN_INDEXER}/api/v1/transactions/?txn=${txHash}`;

      const data = await fetchTxDataByTxHash(url);

      return data;
    },
    [txHash],
    { refreshInterval: 30 * 1000 },
  );

  return (
    <Loading
      onlyDisplayLoadingOnEmptyData
      renderLoading={() => (
        <div className={loadingContainer}>
          <Spinner />
        </div>
      )}
      options={options}
      render={(data) => {
        return data ? <TransactionDetailsImpl {...data} /> : null;
      }}
    />
  );
};

interface TransactionDetailsImplProps {
  transaction?: CarrierTxnObject;
  redeemTransaction?: CarrierTxnObject;
  tokens: TokenInfo[];
  tokenInfoMap: Record<string, TokenInfo>;
}

const TransactionDetailsImpl: React.SFC<TransactionDetailsImplProps> = ({
  transaction,
  redeemTransaction,
  tokens,
  tokenInfoMap,
}) => {
  const location = useLocation();
  const backLinkState = useMemo(() => {
    const { prevUrl } = location.state || {};

    if (prevUrl && matchPath(routes.wallets.getRoute(), prevUrl)) {
      return {
        url: prevUrl,
        label: 'Back to wallet',
      };
    }

    return {
      url: routes.allTransactions.getRoute(),
      label: 'Back to all transactions',
    };
  }, [location.state]);

  const isNFT = transaction?.txnType === 'nft_bridge';

  const { tokenInfo: sourceTokenInfo } = useDerivedTxTokenInfo(transaction, tokenInfoMap || {}, isNFT);
  // console.log({ sourceTokenInfo });

  const { tokenInfo: destinationTokenInfo } = useDerivedTxTokenInfo(
    redeemTransaction || transaction,
    tokenInfoMap || {},
    isNFT,
    true,
  );

  const txTypeTitle = useMemo(() => {
    if (!transaction?.txnType) return '';

    return transaction?.txnType === 'swap'
      ? 'Swapping'
      : transaction?.txnType === 'nft_bridge'
      ? 'NFT Bridging'
      : 'Bridging';
  }, [transaction?.txnType]);

  const txStartDateTime = useMemo(() => {
    if (!transaction?.created) return '';

    const dateInstance = new Date(transaction.created);
    const date = format(dateInstance, 'MMM d, yyyy');
    const time = format(dateInstance, 'H:mm');

    return `${date} at ${time}`;
  }, [transaction?.created]);

  const sourceTokenLogo = useMemo(() => {
    return isNFT
      ? {
          src: (sourceTokenInfo as DerivedNFTInfo)?.image,
        }
      : {
          src: (sourceTokenInfo as DerivedTokenInfo)?.logo,
          symbol: (sourceTokenInfo as DerivedTokenInfo)?.symbol,
        };
  }, [isNFT, sourceTokenInfo]);

  function renderGeneralInfo(options: { title: string; value: string }) {
    return (
      <div className={cx(cardWrapper, generalInfoCardWrapper)}>
        <small className={cardTitle}>{options.title}</small>
        <div className={cardValue}>{options.value}</div>
      </div>
    );
  }

  if (!transaction) {
    return <div className={styleTips}>This transaction is not existed</div>;
  }

  return (
    <main className={pageWrapper}>
      <Link className={linkToPrevPage.wrapper} to={backLinkState.url}>
        <SVGIcon className={linkToPrevPage.arrowLeftIcon} iconName="arrow-left" />
        {backLinkState.label}
      </Link>

      <header className={pageHeader.wrapper}>
        <h1 className={pageHeader.title}>
          {txTypeTitle} Details {transaction.wormholeSequence ? `#${transaction.wormholeSequence}` : ''}
        </h1>

        {!isMobileBrowser && <TxStatusPill status={transaction.status} />}
      </header>

      <div className={transactionInfoGrid}>
        {/* TODO: Implement SwapTransactionInfoCard in near future */}
        {transaction?.txnType === 'swap' ? null : (
          <div className={cardWrapper}>
            <div className={tokenAndStatusRow}>
              {sourceTokenInfo?.amount && (sourceTokenInfo.symbol || sourceTokenInfo.name) && (
                <div className={tokenRow.wrapper}>
                  {isNFT ? (
                    <NFTCover className={nftLogoImage} image={sourceTokenLogo.src} />
                  ) : (
                    <CurrencyIcon
                      className={tokenLogoImage}
                      src={sourceTokenLogo.src}
                      symbol={sourceTokenLogo.symbol}
                    />
                  )}
                  {sourceTokenInfo.amount} {sourceTokenInfo.symbol || sourceTokenInfo.name}
                </div>
              )}

              {isMobileBrowser && <TxStatusPill status={transaction.status} />}
            </div>

            <div className={addressesRow}>
              <div className={addressColumn.wrapper}>
                <div className={addressColumn.title}>Source txn</div>
                <div className={FlexRow}>
                  <small className={addressColumn.value}>{addressShortener(transaction.txn)}</small>
                  <button className={copyButton.wrapper} onClick={() => copyContent(transaction.txn)}>
                    <SVGIcon className={copyButton.icon} iconName="clipboard" />
                  </button>
                </div>
              </div>

              <SVGIcon className={arrowRightIcon} iconName="arrow-right" />

              <div className={addressColumn.wrapper}>
                <div className={addressColumn.title}>Redeem txn</div>
                <div className={FlexRow}>
                  {redeemTransaction ? (
                    <>
                      <small className={addressColumn.value}>{addressShortener(redeemTransaction.txn)}</small>
                      <button className={copyButton.wrapper} onClick={() => copyContent(redeemTransaction.txn)}>
                        <SVGIcon className={copyButton.icon} iconName="clipboard" />
                      </button>
                    </>
                  ) : transaction.status === TXN_STATUS.REDEEMED ? (
                    /* no redeem txn but source transfer status is redeemed; redeem by 3rd party relayer */
                    <small className={addressColumn.value}>Redeemed by other relayers</small>
                  ) : (
                    <small className={addressColumn.value}>Not available yet</small>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {renderGeneralInfo({ title: 'Start date & time', value: txStartDateTime })}
        {renderGeneralInfo({ title: 'Total gas paid', value: '-' })}
      </div>

      <BridgeBreakdown
        isNFT={isNFT}
        transaction={transaction}
        redeemTransaction={redeemTransaction}
        sourceTokenInfo={sourceTokenInfo}
        destinationTokenInfo={destinationTokenInfo}
      />
    </main>
  );
};

type TransactionResult = {
  counts: number;
  current: number;
  limit: number;
  next: any;
  pages: number;
  previous: any;
  redeemTransactions: CarrierTxnObject[];
  transactions: CarrierTxnObject[];
  tokens: TokenInfo[];
};

type FetchTxDataByTxHashJson = {
  msg: string;
  results: TransactionResult;
};

async function fetchTxDataByTxHash(url: string): Promise<{
  transaction?: CarrierTxnObject;
  redeemTransaction?: CarrierTxnObject;
  tokens: TokenInfo[];
  tokenInfoMap: Record<string, TokenInfo>;
}> {
  const txHash = url.split('/?txn=')[1];
  const response = await fetch(url);
  const { msg, results } = (await response.json()) as FetchTxDataByTxHashJson;

  if (
    msg === 'success' &&
    (results.counts === 0 || !results.transactions.length || results.transactions[0].txn !== txHash)
  ) {
    throw new Error(`Transaction is not found. Please check the validity of the transaction ID: ${txHash}.`);
  }

  const transaction: CarrierTxnObject | undefined = results.transactions[0];
  const redeemTransaction: CarrierTxnObject | undefined = results.redeemTransactions[0];
  const tokens = [...results.tokens];

  // Attempt to create token info map
  const tokenInfoMap: Record<string, TokenInfo> = {};
  for (const token of tokens || []) {
    const key = getTokenInfoKey(token.tokenAddress, token.chainId as CarrierChainId).toLowerCase();
    tokenInfoMap[key] = token;
  }

  // Attempt to get actual solana owner's account
  if (
    results.transactions[0].sourceChainId === CHAIN_ID_SOLANA ||
    results.transactions[0].destChainId === CHAIN_ID_SOLANA
  ) {
    let solanaAssociatedAccount = '';
    if (transaction.sourceChainId === CHAIN_ID_SOLANA) {
      solanaAssociatedAccount = transaction.sender;
    } else if (transaction.destChainId === CHAIN_ID_SOLANA) {
      solanaAssociatedAccount = transaction.recipient;
    }

    let solanaWalletAccount = '';
    if (solanaAssociatedAccount) {
      const connection = getSolanaConnection();
      const solanaAccountInfo = await connection.getParsedAccountInfo(new PublicKey(solanaAssociatedAccount));

      if (solanaAccountInfo?.value?.data && 'parsed' in solanaAccountInfo.value.data) {
        solanaWalletAccount = solanaAccountInfo.value.data.parsed.info.owner;
      }
    }

    if (solanaWalletAccount) {
      if (transaction.sourceChainId === CHAIN_ID_SOLANA || transaction.destChainId === CHAIN_ID_SOLANA) {
        transaction['solanaWalletAccount'] = solanaWalletAccount;
      }

      if (transaction.destChainId === CHAIN_ID_SOLANA && !isEmpty(redeemTransaction)) {
        redeemTransaction['solanaWalletAccount'] = solanaWalletAccount;
      }
    }
  }

  return {
    transaction,
    redeemTransaction,
    tokens,
    tokenInfoMap,
  };
}

const styleTips = css`
  display: flex;
  align-items: center;
  margin: auto;
  gap: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(8)};
  }
`;

const pageWrapper = css`
  width: 100%;
  max-width: ${pxToPcVw(1198)};
  display: flex;
  flex-direction: column;
  margin-inline: auto;
  gap: ${pxToPcVw(32)};
  padding-inline: ${pxToPcVw(32)};

  @media (max-width: 1024px) {
    width: 100%;
    gap: ${pxToMobileVw(12)};
    padding-inline: ${pxToMobileVw(12)};
  }
`;

// --- Styles for link to previous page ---
const linkToPrevPage = {
  wrapper: css`
    width: fit-content;
    display: inline-flex;
    align-items: center;
    gap: ${pxToPcVw(8)};
    font-size: ${pxToPcVw(14)};
    font-weight: 600;
    line-height: calc(${pxToPcVw(17).replace('px', '')} / ${pxToPcVw(14).replace('px', '')});
    color: var(--ant-primary-5);

    &:visited {
      color: var(--ant-primary-5);
    }

    &:hover,
    &:active {
      color: var(--ant-primary-4);
    }

    @media (max-width: 1024px) {
      gap: ${pxToMobileVw(8)};
      font-size: ${pxToMobileVw(14)};
      line-height: calc(${pxToMobileVw(17).replace('vw', '')} / ${pxToMobileVw(14).replace('vw', '')});
    }
  `,
  arrowLeftIcon: css`
    width: ${pxToPcVw(20)};
    height: ${pxToPcVw(20)};
    fill: currentcolor;

    @media (max-width: 1024px) {
      width: ${pxToMobileVw(20)};
      height: ${pxToMobileVw(20)};
    }
  `,
};

// --- Styles for page header ---
const pageHeader = {
  wrapper: css`
    display: inline-flex;
    align-items: center;
    gap: ${pxToPcVw(16)};

    @media (max-width: 1024px) {
      gap: 0;
    }
  `,
  title: css`
    font-size: ${pxToPcVw(32)};
    font-weight: 600;
    line-height: calc(${pxToPcVw(40).replace('px', '')} / ${pxToPcVw(32).replace('px', '')});
    margin: 0;
    color: var(--color-text);

    @media (max-width: 1024px) {
      font-size: ${pxToMobileVw(24)};
      line-height: calc(${pxToMobileVw(29).replace('vw', '')} / ${pxToMobileVw(24).replace('vw', '')});
    }
  `,
};

const transactionInfoGrid = css`
  display: flex;
  align-items: flex-start;
  gap: ${pxToPcVw(24)};

  @media (max-width: 1024px) {
    flex-direction: column;
    gap: ${pxToMobileVw(12)};
  }
`;

const cardWrapper = css`
  display: flex;
  flex-direction: row;
  flex-grow: 1;
  align-self: stretch;
  gap: ${pxToPcVw(20)};
  min-width: fit-content;
  border-radius: ${pxToPcVw(8)};
  padding: ${pxToPcVw(16)} ${pxToPcVw(24)} ${pxToPcVw(14)};
  border: ${pxToPcVw(2)} solid var(--ant-primary-color);

  @media (max-width: 1024px) {
    flex-direction: column;
    gap: ${pxToMobileVw(12)};
    padding: ${pxToMobileVw(12)};
    border-width: ${pxToMobileVw(2)};
  }
`;

const generalInfoCardWrapper = css`
  flex-direction: column;
  gap: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(8)};
  }
`;

const tokenAndStatusRow = css`
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 0;
`;

// --- Styles for token column ---
const tokenRow = {
  wrapper: css`
    display: inline-flex;
    align-items: center;
    gap: ${pxToPcVw(8)};
    color: var(--color-text);
    font-size: ${pxToPcVw(16)};
    font-weight: 500;
    line-height: calc(${pxToPcVw(20).replace('px', '')} / ${pxToPcVw(16).replace('px', '')});

    @media (max-width: 1024px) {
      gap: ${pxToMobileVw(8)};
      font-size: ${pxToMobileVw(16)};
      line-height: calc(${pxToMobileVw(20).replace('vw', '')} / ${pxToMobileVw(16).replace('vw', '')});
    }
  `,
  logo: css`
    width: ${pxToMobileVw(32)};
    height: ${pxToMobileVw(32)};
    flex-shrink: 0;
    border-radius: 50%;
    overflow: hidden;
    object-fit: contain;
    border: solid ${pxToMobileVw(3)} var(--ant-primary-1);

    @media (max-width: 1024px) {
      width: ${pxToMobileVw(32)};
      height: ${pxToMobileVw(32)};
      border-width: ${pxToMobileVw(3)};
    }
  `,
};

// --- Styles for addresses row and column ---
const addressesRow = css`
  display: inline-flex;
  align-items: center;
  gap: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(16)};
  }
`;
const arrowRightIcon = css`
  width: ${pxToPcVw(20)};
  height: ${pxToPcVw(18)};
  flex-shrink: 0;
  fill: var(--ant-primary-4);

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(20)};
    height: ${pxToMobileVw(18)};
  }
`;
// Container for sender and recipient detail
const addressColumn = {
  wrapper: css`
    display: flex;
    flex-direction: column;
    gap: ${pxToPcVw(4)};

    @media (max-width: 1024px) {
      gap: ${pxToMobileVw(4)};
    }
  `,
  title: css`
    font-size: ${pxToPcVw(16)};
    font-weight: 500;
    line-height: calc(${pxToPcVw(20).replace('px', '')} / ${pxToPcVw(16).replace('px', '')});
    color: var(--color-text);

    @media (max-width: 1024px) {
      font-size: ${pxToMobileVw(16)};
      line-height: calc(${pxToMobileVw(20).replace('vw', '')} / ${pxToMobileVw(16).replace('vw', '')});
    }
  `,
  value: css`
    font-size: ${pxToPcVw(14)};
    font-weight: 400;
    line-height: calc(${pxToPcVw(17).replace('px', '')} / ${pxToPcVw(14).replace('px', '')});
    color: var(--color-text-3);

    @media (max-width: 1024px) {
      font-size: ${pxToMobileVw(14)};
      line-height: calc(${pxToMobileVw(17).replace('vw', '')} / ${pxToMobileVw(14).replace('vw', '')});
    }
  `,
};

const copyButton = {
  wrapper: css`
    appearance: none;
    border: 0;
    outline: none;
    background: transparent;
    cursor: pointer;
  `,
  icon: css`
    width: ${pxToPcVw(20)};
    height: ${pxToPcVw(20)};
    fill: var(--ant-primary-5);

    @media (max-width: 1024px) {
      width: ${pxToMobileVw(20)};
      height: ${pxToMobileVw(20)};
    }
  `,
};

const FlexRow = css`
  display: flex;
  align-items: center;
`;

const nftLogoImage = css`
  width: ${pxToPcVw(32)};
  height: ${pxToPcVw(32)};
  border: solid ${pxToPcVw(2)} var(--ant-primary-1);
  border-radius: ${pxToPcVw(4)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(32)};
    height: ${pxToMobileVw(32)};
    border: solid ${pxToMobileVw(2)} var(--ant-primary-1);
    border-radius: ${pxToMobileVw(4)};
  }
`;

const tokenLogoImage = css`
  width: ${pxToPcVw(32)};
  height: ${pxToPcVw(32)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(32)};
    height: ${pxToMobileVw(32)};
  }
`;

const cardTitle = css`
  font-size: ${pxToPcVw(14)};
  font-weight: 400;
  line-height: calc(${pxToPcVw(17).replace('px', '')} / ${pxToPcVw(14).replace('px', '')});
  color: var(--color-text-3);

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(14)};
    line-height: calc(${pxToMobileVw(17).replace('vw', '')} / ${pxToMobileVw(14).replace('vw', '')});
  }
`;

const cardValue = css`
  font-size: ${pxToPcVw(16)};
  font-weight: 600;
  line-height: calc(${pxToPcVw(22).replace('px', '')} / ${pxToPcVw(16).replace('px', '')});
  color: var(--color-text);

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(16)};
    line-height: calc(${pxToMobileVw(22).replace('vw', '')} / ${pxToMobileVw(16).replace('vw', '')});
  }
`;

const loadingContainer = css`
  display: flex;
  align-items: center;
  justify-content: center;
`;
