import { css, cx } from '@linaria/core';
import React from 'react';
import { AbstractWallet } from '../../../context/Wallet/types';
import { pxToMobileVw, pxToPcVw } from '../../../utils/style-evaluation';
import { SVGIcon } from '../SVGIcon';
import { WalletSelectorModal } from './WalletSelectorModal';
import { Button } from '../Button';
import Tooltip from '../Tooltip';
import { CarrierChainId } from '../../../utils/consts';
import { AccountSelectorModal } from './AccountSelectorModal';

interface Props {
  className?: string;
  modalTitle?: string;
  disabled?: boolean;
  walletSelectorModalVisible: boolean;
  walletAccountSelectorModalVisible?: boolean;
  chainId?: CarrierChainId;
  wallets: AbstractWallet[];
  accountList?: { walletName: string; accounts: string[] } | undefined;
  type: 'primary' | 'secondary';
  withoutTips?: boolean;
  block?: boolean;
  loading?: boolean;
  onSelectWallet: (options: { walletName: string }) => void;
  onSelectAccount?: (options: { walletName: string; account: string }) => void;
  onWalletSelectorModalVisibleChange: (visible: boolean) => void;
  onWalletAccountSelectorModalVisibleChange?: (visible: boolean) => void;
  onClick?: () => void;
}

export const WalletSelectorButton: React.SFC<Props> = ({
  className,
  modalTitle,
  disabled,
  walletSelectorModalVisible,
  walletAccountSelectorModalVisible,
  chainId,
  wallets,
  type,
  accountList,
  withoutTips,
  block,
  loading,
  children,
  onSelectWallet,
  onSelectAccount,
  onWalletSelectorModalVisibleChange,
  onWalletAccountSelectorModalVisibleChange,
  onClick,
}) => {
  const button = (
    <Button
      disabled={disabled}
      type={type}
      block={block}
      loading={loading}
      className={cx(styleWalletButton, !children ? styleWalletButtonDefault : undefined, className)}
      onClick={() => {
        if (onClick) {
          onClick();
        } else {
          onWalletSelectorModalVisibleChange(true);
        }
      }}>
      {children ? children : <SVGIcon className={styleWalletIcon} iconName="wallet" />}
    </Button>
  );

  return (
    <>
      {!withoutTips ? (
        <Tooltip trigger={['hover']} disableIcon tooltipText="Connect wallet" content={button} />
      ) : (
        button
      )}
      <WalletSelectorModal
        modalTitle={modalTitle}
        isVisible={walletSelectorModalVisible}
        chainId={chainId}
        wallets={wallets}
        onSelectWallet={onSelectWallet}
        onVisibleChanged={onWalletSelectorModalVisibleChange}
      />
      {onWalletAccountSelectorModalVisibleChange && onSelectAccount ? (
        <AccountSelectorModal
          modalTitle={modalTitle}
          isVisible={walletAccountSelectorModalVisible}
          accounts={accountList?.accounts || []}
          walletName={accountList?.walletName || ''}
          walletIcon={wallets.find((item) => item.walletName === accountList?.walletName)?.icon || ''}
          onSelectAccount={onSelectAccount}
          onVisibleChanged={onWalletAccountSelectorModalVisibleChange}
        />
      ) : null}
    </>
  );
};

const styleWalletButton = css`
  flex-shrink: 0;
`;

const styleWalletButtonDefault = css`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0;
  width: ${pxToPcVw(56)};
  height: ${pxToPcVw(56)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(56)};
    height: ${pxToMobileVw(56)};
  }
`;

const styleWalletIcon = css`
  width: ${pxToPcVw(32)};
  height: ${pxToPcVw(32)};

  & * {
    fill: var(--color-text);
  }

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(32)};
    height: ${pxToMobileVw(32)};
  }
`;
