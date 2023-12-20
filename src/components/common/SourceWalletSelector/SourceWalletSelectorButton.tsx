import React from 'react';
import { AbstractWallet } from '../../../context/Wallet/types';
import { WalletSelectorButton } from '../WalletSelector/WalletSelectorButton';
import { CarrierChainId } from '../../../utils/consts';

interface Props {
  className?: string;
  disabled?: boolean;
  walletSelectorModalVisible: boolean;
  walletAccountSelectorModalVisible?: boolean;
  sourceChainId: CarrierChainId;
  wallets: AbstractWallet[];
  accountList: { walletName: string; accounts: string[] } | undefined;
  onSelectWallet: (options: { walletName: string }) => void;
  onSelectAccount?: (options: { walletName: string; account: string }) => void;
  onWalletSelectorModalVisibleChanged: (visible: boolean) => void;
  onWalletAccountSelectorModalVisibleChanged?: (visible: boolean) => void;
}

export const SourceWalletSelectorButton: React.SFC<Props> = ({
  className,
  disabled,
  sourceChainId,
  walletSelectorModalVisible,
  walletAccountSelectorModalVisible,
  wallets,
  accountList,
  onSelectWallet,
  onSelectAccount,
  onWalletSelectorModalVisibleChanged,
  onWalletAccountSelectorModalVisibleChanged,
}) => {
  return (
    <WalletSelectorButton
      className={className}
      disabled={disabled}
      walletSelectorModalVisible={walletSelectorModalVisible}
      walletAccountSelectorModalVisible={walletAccountSelectorModalVisible}
      chainId={sourceChainId}
      wallets={wallets}
      accountList={accountList}
      type="primary"
      onSelectWallet={onSelectWallet}
      onSelectAccount={onSelectAccount}
      onWalletSelectorModalVisibleChange={onWalletSelectorModalVisibleChanged}
      onWalletAccountSelectorModalVisibleChange={onWalletAccountSelectorModalVisibleChanged}
    />
  );
};
