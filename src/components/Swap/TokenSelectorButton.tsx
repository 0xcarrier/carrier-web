import { css, cx } from '@linaria/core';
import React, { useState } from 'react';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { TokenData } from '../../utils/tokenData/helper';
import { Wallet, errorIncorrectChain, errorIncorrectWallet } from '../../hooks/useWallet';
import { WalletState } from '../../context/Wallet/types';
import { CurrencyIcon } from '../common/CurrencyIcon';
import { SVGIcon } from '../common/SVGIcon';
import SVGUnselectedTokenPlaceholder from '../../assets/svgs/unselected-token-placeholder.svg';
import { styleDisabled } from '../../utils/styles';
import { TokenSelectorModal } from './TokenSelectorModal';
import { TokensData } from '../../hooks/useTokens';

interface Props {
  disabled?: boolean;
  enableWalletErrorTips?: boolean;
  sourceWallet?: Wallet;
  tokens: TokensData;
  token?: TokenData;
  onSearchToken: (options: { tokenAddress: string }) => void;
  onSelectToken: (options: { tokenAddress: string }) => void;
  onConnectToNetwork?: () => void;
}

export const TokenSelectorButton: React.SFC<Props> = ({
  disabled: outerDisable,
  enableWalletErrorTips,
  sourceWallet,
  tokens,
  token,
  onSearchToken,
  onSelectToken,
  onConnectToNetwork,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const needToConnectNetwork = sourceWallet
    ? sourceWallet.state === WalletState.CONNECTED &&
      sourceWallet.wallet &&
      sourceWallet.error &&
      (sourceWallet.error === errorIncorrectChain || sourceWallet.error === errorIncorrectWallet) &&
      enableWalletErrorTips
    : false;
  const innerDisabled = sourceWallet
    ? sourceWallet.state !== WalletState.CONNECTED ||
      !sourceWallet.wallet ||
      (sourceWallet.error && sourceWallet.error !== errorIncorrectChain && sourceWallet.error !== errorIncorrectWallet)
    : false;
  const disabled = innerDisabled || outerDisable;

  return (
    <>
      <div
        className={cx(styleTokenSelectorButton, innerDisabled ? styleDisabled : undefined)}
        onClick={() => {
          if (needToConnectNetwork && onConnectToNetwork) {
            onConnectToNetwork();
          } else if (!disabled) {
            setModalVisible(true);
          }
        }}>
        {needToConnectNetwork ? (
          'Switch Network'
        ) : !token ? (
          <div className={unselectedToken}>
            <img src={SVGUnselectedTokenPlaceholder} />
            Select token
            <SVGIcon className={styleChevronDownIcon} iconName="chevron-down" />
          </div>
        ) : token ? (
          <>
            <CurrencyIcon className={TokenLogoStyle} src={token.logo} symbol={token.symbol} />
            <div className={styleTokenSymbol}>{token.symbol || 'UNKNOWN'}</div>
            <SVGIcon className={cx(styleChevronDownIcon, iconGap)} iconName="chevron-down" />
          </>
        ) : null}
      </div>
      <TokenSelectorModal
        visible={modalVisible}
        sourceTokens={tokens}
        onSearchToken={onSearchToken}
        onSelectToken={onSelectToken}
        onVisibleChanged={(visible) => {
          setModalVisible(visible);
        }}
      />
    </>
  );
};

const styleTokenSelectorButton = css`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  white-space: nowrap;
  background-color: var(--ant-primary-1);
  font-weight: 500;
  padding: ${pxToPcVw(6)} ${pxToPcVw(12)} ${pxToPcVw(6)} ${pxToPcVw(6)};
  height: ${pxToPcVw(32)};
  border-radius: ${pxToPcVw(16)};
  gap: ${pxToPcVw(6)};
  font-size: ${pxToPcVw(12)};

  &:hover {
    cursor: pointer;
  }

  @media (max-width: 1024px) {
    padding: ${pxToMobileVw(6)} ${pxToMobileVw(12)} ${pxToMobileVw(6)} ${pxToMobileVw(6)};
    height: ${pxToMobileVw(32)};
    border-radius: ${pxToMobileVw(16)};
    gap: ${pxToMobileVw(6)};
    font-size: ${pxToMobileVw(12)};
  }
`;

const styleTokenSymbol = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: ${pxToPcVw(100)};

  @media (max-width: 1024px) {
    max-width: ${pxToMobileVw(80)};
  }
`;

const unselectedToken = css`
  display: inline-flex;
  align-items: center;
  gap: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(8)};
  }
`;
const TokenLogoStyle = css`
  width: ${pxToPcVw(20)};
  height: ${pxToPcVw(20)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(20)};
    height: ${pxToMobileVw(20)};
  }
`;

const styleChevronDownIcon = css`
  width: ${pxToPcVw(10)};

  & > * {
    fill: #fff;
  }

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(10)};
  }
`;

const iconGap = css`
  margin-left: auto;
`;
