import React, { ReactNode, useMemo } from 'react';
import { CarrierTxnObject } from '../../utils/transaction-indexer';
import { DerivedNFTInfo, DerivedTokenInfo } from './hooks/useDerivedTransferredToken';
import { css, cx } from '@linaria/core';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { WalletIcon } from '../common/WalletIcon';
import {
  CarrierChainId,
  TXN_STATUS,
  getDefaultNativeCurrencyAddress,
  getExplorerName,
  getExplorerTokenContractURL,
  getExplorerTxAddress,
} from '../../utils/consts';
import { CHAIN_ID_SOLANA, WSOL_ADDRESS } from '@certusone/wormhole-sdk';
import {
  addressShortener,
  computeHumanReadableCurrency,
  getChainInfo,
  tryConvertChecksumAddress,
} from '../../utils/web3Utils';
import { getAbstractWalletByChainIdAndName } from '../../context/Wallet/helpers/ethereum';
import { useWalletAdapter } from '../../context/Wallet/WalletProvider';
import { useRexContext } from '@jimengio/rex';
import { IStore } from '../../store';
import BigNumber from 'bignumber.js';
import { getDefaultNativeCurrencySymbol } from '../../utils/consts';
import { getDefaultNativeCurrencyLogo } from '../../utils/consts';
import { Logo } from '../common/Logo';
import wormholeLogoIcon from '../../assets/icons/wormhole_icon_gradient.svg';
import { SVGIcon } from '../common/SVGIcon';
import { useNavigate } from 'react-router-dom';
import { routes } from '../../utils/routes';
import { copyContent } from '../../utils/copyToClipboard';
import { ChainLogo } from '../common/ChainLogo';
import { NFTCover } from '../common/NFTCover';
import { CurrencyIcon } from '../common/CurrencyIcon';
import { ethers } from 'ethers';
import { Button } from '../common/Button';
import { Spinner } from '../common/Spinner';
import { PolkachainTokens } from '../../utils/tokenData/mrl';
import { formatAmount } from '../../utils/format-amount';
import { needToPayMRLFee, needTransferByXCM } from '../../utils/polkadot';

interface Props {
  isNFT: boolean;
  transaction: CarrierTxnObject;
  redeemTransaction?: CarrierTxnObject;
  sourceTokenInfo: DerivedNFTInfo | DerivedTokenInfo | null;
  destinationTokenInfo: DerivedNFTInfo | DerivedTokenInfo | null;
}

export const BridgeBreakdown: React.FunctionComponent<Props> = ({
  isNFT,
  transaction,
  redeemTransaction,
  sourceTokenInfo,
  destinationTokenInfo,
}) => {
  const navigate = useNavigate();
  const { wallets } = useWalletAdapter();
  const { walletCache } = useRexContext((store: IStore) => store);
  const senderAddress = tryConvertChecksumAddress(
    (transaction.sourceChainId === CHAIN_ID_SOLANA ? transaction.solanaWalletAccount : undefined) || transaction.sender,
    transaction.sourceChainId as CarrierChainId,
  );
  const recipientAddress = tryConvertChecksumAddress(
    (transaction.destChainId === CHAIN_ID_SOLANA ? transaction.solanaWalletAccount : undefined) ||
      transaction.recipient,
    transaction.destChainId as CarrierChainId,
  );

  const sourceWallet = useMemo(() => {
    const wallet = walletCache.find(({ address, chainId }) => {
      return (
        ((transaction.solanaWalletAccount && address.toLowerCase() === transaction.solanaWalletAccount.toLowerCase()) ||
          address.toLowerCase() === transaction.sender.toLowerCase()) &&
        chainId === transaction.sourceChainId
      );
    });

    return wallet;
  }, [walletCache, transaction.sender, transaction.solanaWalletAccount, transaction.sourceChainId]);

  const destWallet = useMemo(() => {
    const wallet = walletCache.find(({ address, chainId }) =>
      !redeemTransaction
        ? ((transaction.solanaWalletAccount &&
            address.toLowerCase() === transaction.solanaWalletAccount.toLowerCase()) ||
            address.toLowerCase() === transaction.recipient.toLowerCase()) &&
          chainId === transaction.destChainId
        : ((redeemTransaction.solanaWalletAccount &&
            address.toLowerCase() === redeemTransaction.solanaWalletAccount.toLowerCase()) ||
            address.toLowerCase() === redeemTransaction.recipient.toLowerCase()) &&
          chainId === redeemTransaction.destChainId,
    );

    return wallet;
  }, [walletCache, redeemTransaction, transaction.destChainId, transaction.recipient, transaction.solanaWalletAccount]);

  const isWrappedNativeReturnsToOriginChain = useMemo(() => {
    if (isNFT) {
      return false;
    }

    return !!(
      transaction.destChainId === transaction.unwrappedSourceChainId &&
      getDefaultNativeCurrencyAddress(transaction.destChainId as CarrierChainId).toLowerCase() ===
        transaction.unwrappedSourceTokenAddress?.toLowerCase()
    );
  }, [isNFT, transaction.destChainId, transaction.unwrappedSourceChainId, transaction.unwrappedSourceTokenAddress]);

  // --- Logos ---
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

  const destTokenLogo = useMemo(() => {
    return isNFT
      ? {
          src: (destinationTokenInfo as DerivedNFTInfo)?.image,
        }
      : {
          src: isWrappedNativeReturnsToOriginChain
            ? getDefaultNativeCurrencyLogo(transaction.destChainId as CarrierChainId)
            : (destinationTokenInfo as DerivedTokenInfo)?.logo,
          symbol: isWrappedNativeReturnsToOriginChain
            ? getDefaultNativeCurrencySymbol(transaction.destChainId as CarrierChainId)
            : (destinationTokenInfo as DerivedTokenInfo)?.symbol,
        };
  }, [destinationTokenInfo, isNFT, isWrappedNativeReturnsToOriginChain, transaction.destChainId]);

  // tokenLogo is the final logo that we will use across table row. Logos are not always available
  // for both source and destination, therefore we need to pick the valid one and display it as a
  // final token logo.
  const tokenLogo = useMemo(() => {
    if (isNFT) {
      return sourceTokenLogo || destTokenLogo;
    }

    // For token bridge the destination logo has higher priority than the source
    return destTokenLogo.symbol === getDefaultNativeCurrencySymbol(destinationTokenInfo?.chainId as CarrierChainId)
      ? destTokenLogo
      : sourceTokenLogo;
  }, [destTokenLogo, destinationTokenInfo?.chainId, isNFT, sourceTokenLogo]);

  const arbiterFee = useMemo(() => {
    if (sourceTokenInfo && 'decimals' in sourceTokenInfo) {
      const isSourceSolanaNativeBridge =
        transaction.sourceChainId === CHAIN_ID_SOLANA &&
        sourceTokenInfo.tokenAddress.toLowerCase() === WSOL_ADDRESS.toLowerCase();

      return computeHumanReadableCurrency(sourceTokenInfo, transaction.arbiterFee || '0', isSourceSolanaNativeBridge);
    }

    return '0';
  }, [transaction.sourceChainId, transaction.arbiterFee, sourceTokenInfo]);

  const isUsingRelayer = useMemo(() => arbiterFee !== '0', [arbiterFee]);
  const MRLFee = useMemo(() => {
    if (needToPayMRLFee(transaction.sourceChainId, transaction.destChainId)) {
      const polkachainToken = PolkachainTokens[transaction.destChainId].find(
        (item) => item.assetId === transaction.destTokenAddress,
      );

      return polkachainToken
        ? formatAmount(
            BigNumber(ethers.utils.formatUnits(polkachainToken.MRLFees, polkachainToken.decimals).toString()),
          )
        : '0';
    }

    return '0';
  }, [transaction.destChainId, transaction.destTokenAddress]);

  const isXCMBridge = useMemo(() => {
    return needTransferByXCM(transaction.sourceChainId, transaction.destChainId);
  }, [transaction.sourceChainId, transaction.destChainId]);

  function renderReadableTokenAsset(amount: string, symbol: string) {
    return `${amount} ${symbol.trim()}`;
  }

  function renderReadableNFTAsset(symbol: string, tokenId: string) {
    return `1 ${symbol.trim()}${tokenId ? ` #${tokenId}` : ''}`;
  }

  function renderAssetWithExplorerLink(chainId: CarrierChainId, tokenAddress: string, content: ReactNode) {
    return (
      <a
        className={tokenContractLink}
        href={getExplorerTokenContractURL(chainId, tokenAddress)}
        target="_blank"
        rel="noreferrer">
        {content}
      </a>
    );
  }

  function renderReadableChain(chainId: CarrierChainId) {
    return (
      <>
        <ChainLogo className={tokenAndChainLogoImage} chainId={chainId} />
        {getChainInfo(chainId).name}
      </>
    );
  }

  function renderBreakdownRow(options: {
    step: string;
    icon: ReactNode;
    leftColumnLabel: string;
    leftColumnContent: ReactNode;
    onLeftColumnContentCopy?: () => void;
    midColumnLabel: string;
    midColumnContent?: (
      | {
          key: string;
          disableLink?: boolean;
          isNFT: boolean;
          isRelayer?: boolean;
          isMRLFee?: boolean;
          tokenAddress: string;
          tokenAmount: string;
          tokenSymbol: string;
          tokenId?: string;
          tokenLogo: { src?: string; symbol?: string };
          chainId: CarrierChainId;
          fromChainId?: CarrierChainId;
          toChainId?: CarrierChainId;
        }
      | undefined
    )[];
    exploreLink?: { chainId: CarrierChainId; txHash: string };
    gas?: string;
    tips?: string;
    onRedeemButtonClick?: () => void;
  }) {
    const {
      step,
      icon,
      leftColumnContent,
      leftColumnLabel,
      onLeftColumnContentCopy,
      midColumnLabel,
      midColumnContent,
      exploreLink,
      gas,
      tips,
      onRedeemButtonClick,
    } = options;

    return (
      <div className={styleBreakdownBlock}>
        <div className={styleBreakdownIconPc}>{icon}</div>
        <div className={styleBreakdownContent}>
          <div className={styleBreakdownLeftColumn}>
            <div className={styleBreakdownIconMobile}>{icon}</div>
            <div className={styleBreakdownLeftColumnWrapper}>
              <div className={styleBreakdownLeftColumnLabel}>{leftColumnLabel}</div>
              <div className={styleBreakdownLeftColumnContent}>
                {leftColumnContent}
                {onLeftColumnContentCopy ? (
                  <div className={styleBreakdownLeftColumnCopyWrapper}>
                    <div className={styleBreakdownLeftColumnCopy} onClick={onLeftColumnContentCopy}>
                      <SVGIcon className={styleBreakdownLeftColumnCopyIcon} iconName="clipboard" />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            <div className={styleBreakdownLeftColumnStep}>{step}</div>
          </div>
          <div className={styleBreakdownMidColumnMobile}>
            <div className={styleBreakdownMidColumnContent}>
              {midColumnContent ? (
                midColumnContent.map((item) => {
                  if (!item) return null;

                  const {
                    disableLink,
                    isNFT,
                    isRelayer,
                    isMRLFee,
                    tokenAddress,
                    tokenAmount,
                    tokenSymbol,
                    tokenId,
                    tokenLogo,
                    chainId,
                    fromChainId,
                    toChainId,
                  } = item;

                  const symbolAndAmount = (
                    <>
                      {isNFT ? (
                        <NFTCover className={nftLogoImage} image={tokenLogo.src} />
                      ) : (
                        <CurrencyIcon
                          className={tokenAndChainLogoImage}
                          /* src={tokenLogo.src} */ symbol={tokenLogo.symbol}
                        />
                      )}

                      {tokenAddress !== ethers.constants.AddressZero &&
                      getDefaultNativeCurrencyAddress(chainId).toLowerCase() !== tokenAddress.toLowerCase() &&
                      !disableLink
                        ? renderAssetWithExplorerLink(
                            chainId,
                            tokenAddress,
                            isNFT
                              ? renderReadableNFTAsset(tokenSymbol, tokenId as string)
                              : renderReadableTokenAsset(tokenAmount, tokenSymbol),
                          )
                        : isNFT
                        ? renderReadableNFTAsset(tokenSymbol, tokenId as string)
                        : renderReadableTokenAsset(tokenAmount, tokenSymbol)}
                    </>
                  );

                  return (
                    <React.Fragment key={item.key}>
                      {isMRLFee ? (
                        <div className={styleBreakdownMidColumnContentRow}>
                          <div className={styleBreakdownMidColumnContentRowLabel}>XCM fee</div>
                          <div className={styleBreakdownMidColumnContentRowContent}>{symbolAndAmount}</div>
                        </div>
                      ) : isRelayer ? (
                        <div className={styleBreakdownMidColumnContentRow}>
                          <div className={styleBreakdownMidColumnContentRowLabel}>Relayer fee</div>
                          <div className={styleBreakdownMidColumnContentRowContent}>{symbolAndAmount}</div>
                        </div>
                      ) : (
                        <>
                          <div className={styleBreakdownMidColumnContentRow}>
                            <div className={styleBreakdownMidColumnContentRowLabel}>{midColumnLabel}</div>
                            <div className={styleBreakdownMidColumnContentRowContent}>{symbolAndAmount}</div>
                          </div>
                          {fromChainId && toChainId ? (
                            <>
                              <div className={styleBreakdownMidColumnContentRow}>
                                <div className={styleBreakdownMidColumnContentRowLabel}>From</div>
                                <div className={styleBreakdownMidColumnContentRowContent}>
                                  {renderReadableChain(fromChainId)}
                                </div>
                              </div>
                              <div className={styleBreakdownMidColumnContentRow}>
                                <div className={styleBreakdownMidColumnContentRowLabel}>To</div>
                                <div className={styleBreakdownMidColumnContentRowContent}>
                                  {renderReadableChain(toChainId)}
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className={styleBreakdownMidColumnContentRow}>
                              <div className={styleBreakdownMidColumnContentRowLabel}>On</div>
                              <div className={styleBreakdownMidColumnContentRowContent}>
                                {renderReadableChain(chainId)}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <Spinner />
              )}
              {gas && !onRedeemButtonClick ? (
                <div className={styleBreakdownMidColumnContentRow}>
                  <div className={styleBreakdownMidColumnContentRowLabel}>Gas</div>
                  <div className={styleBreakdownMidColumnContentRowContent}>{gas}</div>
                </div>
              ) : null}
              {tips ? <div className={styleBreakdownMidColumnTips}>{tips}</div> : null}
            </div>
          </div>
          <div className={styleBreakdownMidColumnPc}>
            <div className={styleBreakdownMidColumnLabel}>{midColumnLabel}</div>
            <div className={styleBreakdownMidColumnContent}>
              {midColumnContent ? (
                midColumnContent.map((item) => {
                  if (!item) return null;

                  const {
                    disableLink,
                    isNFT,
                    isRelayer,
                    isMRLFee,
                    tokenAddress,
                    tokenAmount,
                    tokenSymbol,
                    tokenId,
                    tokenLogo,
                    chainId,
                    fromChainId,
                    toChainId,
                  } = item;

                  return (
                    <div className={styleBreakdownMidColumnContentRow} key={item.key}>
                      {isNFT ? (
                        <NFTCover className={nftLogoImage} image={tokenLogo.src} />
                      ) : (
                        <CurrencyIcon
                          className={tokenAndChainLogoImage}
                          /* src={tokenLogo.src} */ symbol={tokenLogo.symbol}
                        />
                      )}

                      {tokenAddress !== ethers.constants.AddressZero &&
                      getDefaultNativeCurrencyAddress(chainId).toLowerCase() !== tokenAddress.toLowerCase() &&
                      !disableLink
                        ? renderAssetWithExplorerLink(
                            chainId,
                            tokenAddress,
                            isNFT
                              ? renderReadableNFTAsset(tokenSymbol, tokenId as string)
                              : renderReadableTokenAsset(tokenAmount, tokenSymbol),
                          )
                        : isNFT
                        ? renderReadableNFTAsset(tokenSymbol, tokenId as string)
                        : renderReadableTokenAsset(tokenAmount, tokenSymbol)}

                      {fromChainId && toChainId ? (
                        <>
                          <small className={wordSeparator}>from</small>
                          {renderReadableChain(fromChainId)}
                          <small className={wordSeparator}>to</small>
                          {renderReadableChain(toChainId)}
                        </>
                      ) : isRelayer ? (
                        <>
                          <small className={wordSeparator}>to</small>relayer
                        </>
                      ) : isMRLFee ? (
                        <>
                          <small className={wordSeparator}>as</small> XCM Fee
                        </>
                      ) : (
                        <>
                          <small className={wordSeparator}>on</small>
                          {renderReadableChain(chainId)}
                        </>
                      )}
                    </div>
                  );
                })
              ) : (
                <Spinner />
              )}
            </div>
            {tips ? <div className={styleBreakdownMidColumnTips}>{tips}</div> : null}
          </div>
          <div className={styleBreakdownRightColumn}>
            <div className={cx(styleBreakdownRightColumnItem, styleBreakdownRightGasPc)}>
              <SVGIcon className={styleEstimatedGasIcon} iconName="estimated-gas" /> -
            </div>
            {onRedeemButtonClick ? (
              <Button className={styleRedeemButton} type="primary" onClick={onRedeemButtonClick}>
                Redeem
                <SVGIcon className={redeemButtonIcon} iconName="external-link" />
              </Button>
            ) : exploreLink ? (
              <a
                className={styleExplorerLink}
                href={getExplorerTxAddress(exploreLink.chainId, exploreLink.txHash)}
                target="_blank"
                rel="noreferrer">
                {getExplorerName(exploreLink.chainId)}
                <SVGIcon className={arrowUpRightIcon} iconName="arrow-up-right" />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={breakdownWrapper} key={transaction.txn}>
      <h2 className={breakdownTitle}>{transaction?.txnType === 'swap' ? 'Swap' : 'Bridge'} breakdown</h2>
      <div>
        {renderBreakdownRow({
          step: 'Step1',
          icon: (
            <WalletIcon
              className={walletAndServiceLogoImage}
              icon={getAbstractWalletByChainIdAndName(wallets, sourceWallet?.chainId, sourceWallet?.name)?.icon}
            />
          ),
          leftColumnLabel: 'Source wallet',
          leftColumnContent: addressShortener(senderAddress),
          onLeftColumnContentCopy: () => {
            copyContent(transaction.sender);
          },
          midColumnLabel: 'Sends',
          midColumnContent: sourceTokenInfo
            ? [
                {
                  key: 'token-info',
                  isNFT,
                  tokenAddress: sourceTokenInfo.tokenAddress,
                  tokenAmount: sourceTokenInfo.amount,
                  tokenSymbol: sourceTokenInfo.symbol || sourceTokenInfo.name,
                  tokenId: isNFT ? (sourceTokenInfo as DerivedNFTInfo).tokenId : undefined,
                  tokenLogo: tokenLogo,
                  chainId: sourceTokenInfo.chainId,
                },
              ]
            : undefined,
          exploreLink: { chainId: transaction.sourceChainId as CarrierChainId, txHash: transaction.txn },
          gas: '-',
        })}
        {renderBreakdownRow({
          step: 'Step2',
          icon: <Logo className={walletAndServiceLogoImage} src={wormholeLogoIcon} />,
          leftColumnLabel: 'Bridge service',
          leftColumnContent: 'Wormhole',
          midColumnLabel: 'Bridges',
          midColumnContent: sourceTokenInfo
            ? [
                {
                  key: 'token-info',
                  isNFT,
                  tokenAddress: sourceTokenInfo.tokenAddress,
                  tokenAmount: sourceTokenInfo.amount,
                  tokenSymbol: sourceTokenInfo.symbol || sourceTokenInfo.name,
                  tokenId: (sourceTokenInfo as DerivedNFTInfo).tokenId,
                  tokenLogo: tokenLogo,
                  chainId: transaction.sourceChainId as CarrierChainId,
                  fromChainId: transaction.sourceChainId as CarrierChainId,
                  toChainId: transaction.destChainId as CarrierChainId,
                },
              ]
            : undefined,
        })}
        {isXCMBridge ||
        ((transaction.signedVAAHash || transaction.cctpHashedSourceAndNonce) &&
          (transaction.status === TXN_STATUS.CONFIRMED || transaction.status === TXN_STATUS.REDEEMED))
          ? renderBreakdownRow({
              step: 'Step3',
              icon: (
                <WalletIcon
                  className={walletAndServiceLogoImage}
                  icon={getAbstractWalletByChainIdAndName(wallets, destWallet?.chainId, destWallet?.name)?.icon}
                />
              ),
              leftColumnLabel: 'Destination wallet',
              leftColumnContent: addressShortener(recipientAddress),
              onLeftColumnContentCopy: () => {
                copyContent(transaction.recipient);
              },
              midColumnLabel: 'Receives',
              midColumnContent: destinationTokenInfo
                ? [
                    {
                      key: 'token-info',
                      isNFT,
                      tokenAddress: destinationTokenInfo.tokenAddress,
                      tokenAmount: formatAmount(
                        BigNumber(destinationTokenInfo.amount).minus(BigNumber(arbiterFee)).minus(BigNumber(MRLFee)),
                      ),
                      tokenSymbol: destinationTokenInfo.symbol || destinationTokenInfo.name,
                      tokenId: (destinationTokenInfo as DerivedNFTInfo).tokenId,
                      tokenLogo: tokenLogo,
                      chainId: transaction.destChainId as CarrierChainId,
                    },
                    isUsingRelayer
                      ? {
                          key: 'relayer-info',
                          isRelayer: true,
                          isNFT,
                          tokenAddress: destinationTokenInfo.tokenAddress,
                          tokenAmount: arbiterFee,
                          tokenSymbol: destinationTokenInfo.symbol || destinationTokenInfo.name,
                          tokenId: (destinationTokenInfo as DerivedNFTInfo).tokenId,
                          tokenLogo: tokenLogo,
                          chainId: transaction.destChainId as CarrierChainId,
                        }
                      : undefined,
                    MRLFee !== '0'
                      ? {
                          key: 'xcm-fee-info',
                          isMRLFee: true,
                          isNFT: false,
                          tokenAddress: destinationTokenInfo.tokenAddress,
                          tokenAmount: MRLFee,
                          tokenSymbol: destinationTokenInfo.symbol || destinationTokenInfo.name,
                          tokenLogo: tokenLogo,
                          chainId: transaction.destChainId as CarrierChainId,
                        }
                      : undefined,
                  ]
                : undefined,
              exploreLink: redeemTransaction
                ? { chainId: redeemTransaction.destChainId as CarrierChainId, txHash: redeemTransaction.txn }
                : transaction.redeemTxn
                ? { chainId: transaction.destChainId as CarrierChainId, txHash: transaction.redeemTxn }
                : undefined,
              gas: '-',
              tips:
                isUsingRelayer && transaction.status !== TXN_STATUS.REDEEMED
                  ? 'Note: Assets will be redeemed by relayers automatically.'
                  : undefined,
              onRedeemButtonClick:
                transaction.status !== TXN_STATUS.REDEEMED
                  ? () => {
                      if (transaction.txnType === 'token_bridge' || transaction.txnType === 'nft_bridge') {
                        navigate(
                          routes.progress.getPath(
                            {
                              chainId: transaction.sourceChainId as CarrierChainId,
                              txHash: transaction.txn,
                            },
                            { enableManualRedemption: true },
                          ),
                        );
                      }
                    }
                  : undefined,
            })
          : null}
      </div>
    </div>
  );
};

const breakdownWrapper = css``;

const breakdownTitle = css`
  font-size: ${pxToPcVw(24)};
  font-weight: 600;
  line-height: ${29 / 24}em;
  color: var(--color-text);
  margin: 0 0 ${pxToPcVw(32)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(20)};
    line-height: ${24 / 20}em;
    margin: ${pxToMobileVw(12)} 0 ${pxToMobileVw(24)};
  }
`;

const walletAndServiceLogoImage = css`
  width: ${pxToPcVw(40)};
  height: ${pxToPcVw(40)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(40)};
    height: ${pxToMobileVw(40)};
  }
`;

const arrowUpRightIcon = css`
  width: ${pxToPcVw(10)};
  height: ${pxToPcVw(10)};

  & > * {
    fill: var(--ant-primary-5);
  }

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(10)};
    height: ${pxToMobileVw(10)};
  }
`;

const styleBreakdownBlock = css`
  position: relative;
  display: flex;
  align-items: center;
  padding: ${pxToPcVw(12)} 0;

  &::before {
    content: '';
    position: absolute;
    left: ${pxToPcVw(28)};
    top: 0;
    height: 100%;
    width: ${pxToPcVw(2)};
    background-color: var(--color-border);
  }

  &:first-child {
    margin-top: ${pxToPcVw(-12)};

    &::before {
      top: 50%;
      height: 50%;
    }
  }

  &:last-child {
    margin-bottom: ${pxToPcVw(-12)};

    &::before {
      height: 50%;
    }
  }

  @media (max-width: 1024px) {
    padding: 0;

    &:first-child {
      margin-top: 0;
    }

    &:last-child {
      margin-bottom: ${pxToPcVw(-12)};
    }

    &::before {
      display: none;
    }
  }
`;

const tokenAndChainLogoImage = css`
  width: ${pxToPcVw(32)};
  height: ${pxToPcVw(32)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(32)};
    height: ${pxToMobileVw(32)};
  }
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

const tokenContractLink = css`
  color: var(--ant-primary-5);

  &:hover,
  &:focus-visible,
  &:active {
    color: var(--ant-primary-4);
  }
`;

const wordSeparator = css`
  color: var(--color-text-3);
  font-size: ${pxToPcVw(14)};
  font-weight: 400;

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(14)};
  }
`;

const redeemButtonIcon = css`
  fill: var(--color-text);
  width: ${pxToPcVw(16)};
  height: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(16)};
    height: ${pxToMobileVw(16)};
  }
`;

const styleBreakdownIconPc = css`
  position: relative;
  width: ${pxToPcVw(56)};
  height: ${pxToPcVw(56)};
  border-radius: 50%;
  border: solid ${pxToPcVw(2)} var(--ant-primary-color);
  background-color: var(--ant-background-3);
  padding: ${pxToPcVw(6)};
  margin-right: ${pxToPcVw(24)};

  @media (max-width: 1024px) {
    display: none;
  }
`;

const styleBreakdownContent = css`
  flex-grow: 1;
  display: flex;
  border: solid ${pxToPcVw(2)} var(--color-border);
  border-radius: ${pxToPcVw(8)};
  padding: ${pxToPcVw(24)};
  gap: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    flex-direction: column;
    border-radius: 0;
    border-top: none;
    border-left: none;
    border-right: none;
    padding-top: 0;
    padding-left: 0;
    padding-right: 0;
    padding-bottom: ${pxToMobileVw(12)};
    margin-bottom: ${pxToMobileVw(12)};
    gap: 0;
  }
`;

const styleBreakdownLeftColumn = css`
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  width: 20%;

  @media (max-width: 1024px) {
    align-items: center;
    width: 100%;
    margin-bottom: ${pxToMobileVw(16)};
  }
`;

const styleBreakdownIconMobile = css`
  display: none;

  @media (max-width: 1024px) {
    display: block;
    margin-right: ${pxToMobileVw(8)};
  }
`;

const styleBreakdownLeftColumnWrapper = css`
  display: flex;
  flex-direction: column;
  gap: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(8)};
  }
`;

const styleBreakdownLeftColumnLabel = css`
  line-height: 1.1em;
  color: var(--color-text-3);
  font-weight: 400;
  font-size: ${pxToPcVw(14)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(14)};
  }
`;

const styleBreakdownLeftColumnContent = css`
  display: flex;
  align-items: center;
  color: #fff;
  font-weight: 500;
  line-height: 1.1em;
  font-size: ${pxToPcVw(16)};
  gap: ${pxToPcVw(12)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(16)};
    gap: ${pxToMobileVw(12)};
  }
`;

const styleBreakdownLeftColumnCopyWrapper = css`
  overflow: visible;
  width: ${pxToPcVw(17)};
  height: ${pxToPcVw(20)};

  @media (max-width: 1024px) {
    width: ${pxToPcVw(17)};
    height: ${pxToPcVw(20)};
  }
`;

const styleBreakdownLeftColumnCopy = css`
  cursor: pointer;
  overflow: visible;
  padding: ${pxToPcVw(5)};
  width: ${pxToPcVw(27)};
  height: ${pxToPcVw(30)};
  margin-left: ${pxToPcVw(-5)};
  margin-top: ${pxToPcVw(-5)};

  @media (max-width: 1024px) {
    padding: ${pxToMobileVw(5)};
    width: ${pxToMobileVw(27)};
    height: ${pxToMobileVw(30)};
    margin-left: ${pxToMobileVw(-5)};
    margin-top: ${pxToMobileVw(-5)};
  }
`;

const styleBreakdownLeftColumnCopyIcon = css`
  width: ${pxToPcVw(17)};
  height: ${pxToPcVw(20)};

  & > * {
    fill: var(--ant-primary-5);
  }

  @media (max-width: 1024px) {
    width: ${pxToPcVw(17)};
    height: ${pxToPcVw(20)};
  }
`;

const styleBreakdownLeftColumnStep = css`
  display: none;
  font-weight: 400;
  color: var(--color-text-3);
  font-size: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    display: block;
    flex-shrink: 0;
    margin-left: auto;
    font-size: ${pxToMobileVw(16)};
  }
`;

const styleBreakdownMidColumnMobile = css`
  display: none;

  @media (max-width: 1024px) {
    display: block;
  }
`;

const styleBreakdownMidColumnContent = css`
  display: flex;
  flex-direction: column;
  gap: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    gap: ${pxToPcVw(16)};
  }
`;

const styleBreakdownMidColumnContentRow = css`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  color: #fff;
  word-break: break-all;
  font-weight: 500;
  gap: ${pxToPcVw(8)};
  font-size: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    justify-content: space-between;
    flex-wrap: nowrap;
    gap: ${pxToMobileVw(8)};
  }
`;

const styleBreakdownMidColumnContentRowLabel = css`
  flex-shrink: 0;
  font-weight: 400;
  color: var(--color-text-3);
  font-size: ${pxToPcVw(14)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(14)};
  }
`;

const styleBreakdownMidColumnContentRowContent = css`
  display: flex;
  word-break: break-all;
  align-items: center;
  gap: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(8)};
  }
`;

const styleBreakdownMidColumnTips = css`
  line-height: 1.1em;
  color: var(--color-text-3);
  font-weight: 400;
  font-size: ${pxToPcVw(14)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(14)};
  }
`;

const styleBreakdownMidColumnPc = css`
  display: flex;
  flex-direction: column;
  gap: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    display: none;
  }
`;

const styleBreakdownMidColumnLabel = css`
  line-height: 1.1em;
  color: var(--color-text-3);
  font-weight: 400;
  font-size: ${pxToPcVw(14)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(14)};
  }
`;

const styleBreakdownRightColumn = css`
  flex-shrink: 0;
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: ${pxToPcVw(30)};

  @media (max-width: 1024px) {
    margin-left: 0;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
  }
`;

const styleBreakdownRightColumnItem = css`
  display: flex;
  align-items: center;
  gap: ${pxToPcVw(12)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(12)};
  }
`;

const styleBreakdownRightGasPc = css`
  @media (max-width: 1024px) {
    display: none;
  }
`;

const styleEstimatedGasIcon = css`
  width: ${pxToPcVw(15)};
  height: ${pxToPcVw(17)};

  & > * {
    fill: var(--ant-primary-4);
  }

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(15)};
    height: ${pxToMobileVw(17)};
  }
`;

const styleExplorerLink = css`
  display: flex;
  align-items: center;
  gap: ${pxToPcVw(13)};

  @media (max-width: 1024px) {
    justify-content: center;
    color: #fff;
    gap: ${pxToMobileVw(13)};
    margin-top: ${pxToMobileVw(16)};
    border: solid ${pxToMobileVw(2)} var(--color-border);
    border-radius: ${pxToMobileVw(8)};
    height: ${pxToMobileVw(56)};
  }
`;

const styleRedeemButton = css`
  @media (max-width: 1024px) {
    margin-top: ${pxToMobileVw(16)};
  }
`;
