import { css, cx } from '@linaria/core';
import React, { useState } from 'react';
import { TokensData } from '../../hooks/useTokens';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { TokenData } from '../../utils/tokenData/helper';
import { Wallet, errorIncorrectChain, errorIncorrectWallet } from '../../hooks/useWallet';
import { WalletState } from '../../context/Wallet/types';
import { CurrencyIcon } from '../common/CurrencyIcon';
import { SVGIcon } from '../common/SVGIcon';
import SVGUnselectedTokenPlaceholder from '../../assets/svgs/unselected-token-placeholder.svg';
import { TokenSelectorModal } from './TokenSelectorModal';
import { styleDisabled } from '../../utils/styles';
import { CarrierChainId } from '../../utils/consts';

interface Props {
  disabled?: boolean;
  enableWalletErrorTips: boolean;
  sourceChainId?: CarrierChainId;
  sourceWallet: Wallet;
  sourceTokens: TokensData;
  sourceToken?: TokenData;
  onSearchToken: (options: { tokenAddress: string }) => void;
  onSelectToken: (options: { tokenAddress: string }) => void;
  onConnectToNetwork: () => void;
}

export const TokenSelectorButton: React.SFC<Props> = ({
  disabled: outerDisable,
  enableWalletErrorTips,
  sourceChainId,
  sourceWallet,
  sourceTokens,
  sourceToken,
  onSearchToken,
  onSelectToken,
  onConnectToNetwork,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const needToConnectNetwork =
    sourceWallet.state === WalletState.CONNECTED &&
    sourceWallet.wallet &&
    sourceWallet.error &&
    (sourceWallet.error === errorIncorrectChain || sourceWallet.error === errorIncorrectWallet) &&
    enableWalletErrorTips;
  const innerDisabled =
    sourceWallet.state !== WalletState.CONNECTED ||
    !sourceWallet.wallet ||
    (sourceWallet.error && sourceWallet.error !== errorIncorrectChain && sourceWallet.error !== errorIncorrectWallet);
  const disabled = innerDisabled || outerDisable;

  return (
    <>
      <div
        className={cx(styleTokenSelectorButton, innerDisabled ? styleDisabled : undefined)}
        onClick={() => {
          if (needToConnectNetwork) {
            onConnectToNetwork();
          } else if (!disabled) {
            setModalVisible(true);
          }
        }}>
        {needToConnectNetwork ? (
          'Switch Network'
        ) : !sourceToken ? (
          <div className={unselectedToken}>
            <img src={SVGUnselectedTokenPlaceholder} />
            Select token
            <SVGIcon className={styleChevronDownIcon} iconName="chevron-down" />
          </div>
        ) : sourceToken ? (
          <>
            <CurrencyIcon className={TokenLogoStyle} src={sourceToken.logo} symbol={sourceToken.symbol} />
            <div className={styleTokenSymbol}>{sourceToken.symbol || 'UNKNOWN'}</div>
            <SVGIcon className={cx(styleChevronDownIcon, iconGap)} iconName="chevron-down" />
          </>
        ) : null}
      </div>
      <TokenSelectorModal
        visible={modalVisible}
        sourceChainId={sourceChainId}
        sourceTokens={sourceTokens}
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
  min-width: ${pxToPcVw(113)};
  padding: ${pxToPcVw(8)} ${pxToPcVw(10)} ${pxToPcVw(8)} ${pxToPcVw(8)};
  height: ${pxToPcVw(40)};
  border-radius: ${pxToPcVw(48)};
  gap: ${pxToPcVw(8)};

  &:hover {
    cursor: pointer;
  }

  @media (max-width: 1024px) {
    min-width: ${pxToMobileVw(113)};
    padding: ${pxToMobileVw(8)} ${pxToMobileVw(10)} ${pxToMobileVw(8)} ${pxToMobileVw(8)};
    height: ${pxToMobileVw(40)};
    border-radius: ${pxToMobileVw(20)};
    gap: ${pxToMobileVw(8)};
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
