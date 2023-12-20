import { css, cx } from '@linaria/core';
import React, { useState } from 'react';
import { AbstractWallet, WalletState } from '../../../context/Wallet/types';
import { Wallet } from '../../../hooks/useWallet';
import { CarrierChainId, ChainInfo } from '../../../utils/consts';
import { pxToMobileVw, pxToPcVw } from '../../../utils/style-evaluation';
import { ChainSelector } from '../ChainSelector/ChainSelector';
import { SourceWalletSelectorDropdown } from './SourceWalletDropdown';
import { SourceWalletSelectorButton } from './SourceWalletSelectorButton';

interface Props {
  className?: string;
  disabled?: boolean;
  sourceWalletSelectorModalVisible?: boolean;
  sourceWalletAccountSelectorModalVisible?: boolean;
  sourceChainId: CarrierChainId;
  chains: ChainInfo[];
  sourceWallet: Wallet;
  wallets: AbstractWallet[];
  accountList?: { walletName: string; accounts: string[] };
  onSelectChain: (options: { chainId: CarrierChainId }) => void;
  onSelectWallet: (options: { walletName: string }) => void;
  onSelectAccount?: (options: { walletName: string; account: string }) => void;
  onDisconnect(options: { walletName: string }): void;
  onSourceWalletSelectorModalVisibleChanged?: (visible: boolean) => void;
  onSourceWalletAccountSelectorModalVisibleChanged?: (visible: boolean) => void;
}

export const SourceWalletSelector: React.SFC<Props> = ({
  className,
  disabled,
  sourceWalletSelectorModalVisible,
  sourceWalletAccountSelectorModalVisible,
  sourceChainId,
  chains,
  sourceWallet,
  wallets,
  accountList,
  onSelectChain,
  onSelectWallet,
  onSelectAccount,
  onDisconnect,
  onSourceWalletSelectorModalVisibleChanged,
  onSourceWalletAccountSelectorModalVisibleChanged,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className={cx(styleChainSelectorContainer, className)}>
      <div className={styleChainSelectorHeaderRow}>
        <div className={styleChainSelectorHeaderTitle}>Source</div>
        {sourceWallet.state !== WalletState.DISCONNECTED && sourceWallet.wallet ? (
          <SourceWalletSelectorDropdown
            disabled={disabled}
            sourceWallet={sourceWallet}
            onDisconnect={onDisconnect}
            onChangeWallet={() => {
              if (onSourceWalletSelectorModalVisibleChanged) {
                onSourceWalletSelectorModalVisibleChanged(true);
              } else {
                setIsVisible(true);
              }
            }}
          />
        ) : null}
      </div>
      <div className={ChainSelectRow}>
        <ChainSelector disabled={disabled} chainId={sourceChainId} chains={chains} onSelectChain={onSelectChain} />

        <div
          className={cx(
            styleWalletSelectionButton,
            sourceWallet.state !== WalletState.DISCONNECTED && sourceWallet.wallet ? styleHidden : undefined,
          )}>
          <SourceWalletSelectorButton
            disabled={disabled}
            walletSelectorModalVisible={sourceWalletSelectorModalVisible || isVisible}
            walletAccountSelectorModalVisible={sourceWalletAccountSelectorModalVisible}
            sourceChainId={sourceChainId}
            wallets={wallets}
            accountList={accountList}
            onSelectWallet={onSelectWallet}
            onSelectAccount={onSelectAccount}
            onWalletSelectorModalVisibleChanged={onSourceWalletSelectorModalVisibleChanged || setIsVisible}
            onWalletAccountSelectorModalVisibleChanged={onSourceWalletAccountSelectorModalVisibleChanged}
          />
        </div>
      </div>
    </div>
  );
};

const ChainSelectRow = css`
  display: flex;
  gap: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(8)};
  }
`;

const styleWalletSelectionButton = css`
  flex-shrink: 0;
`;

const styleChainSelectorHeaderRow = css`
  display: flex;
  justify-content: space-between;
`;

const styleChainSelectorHeaderTitle = css`
  font-size: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(16)};
  }
`;

const styleChainSelectorContainer = css`
  display: flex;
  flex-direction: column;
  width: 100%;
  // height: ${pxToPcVw(126)};
  gap: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(16)};
  }
`;

const styleHidden = css`
  display: none;
`;
