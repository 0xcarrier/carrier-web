import React, { useState } from 'react';
import { Wallet } from '../../hooks/useWallet';
import { Button } from '../common/Button';
import { WalletSelectorModal } from '../common/WalletSelector/WalletSelectorModal';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { css } from '@linaria/core';
import { useWalletAdapter } from '../../context/Wallet/WalletProvider';
import { CarrierChainId } from '../../utils/consts';

interface ConnectWalletProps {
  className?: string;
  sourceWallet: Wallet;
  defaultChainId: CarrierChainId;
  onConnectWallet: (options: { chainId: CarrierChainId; walletName: string }) => void;
  onDisconnectWallet: (options: { chainId: CarrierChainId; walletName: string }) => void;
}

export const ConnectWallet: React.SFC<ConnectWalletProps> = ({
  className,
  sourceWallet,
  defaultChainId,
  onConnectWallet,
  onDisconnectWallet,
}) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const { wallets, connect, connectedWallet } = useWalletAdapter();
  const isSourceWalletConnected = sourceWallet && sourceWallet.wallet;

  const onConnectButtonClick = () => {
    if (connectedWallet) {
      onConnectWallet({ chainId: defaultChainId, walletName: connectedWallet.walletName });
    } else {
      // no connected wallet
      // pop up add wallet
      setIsModalOpen(true);
    }
  };

  const onDisconnectButtonClick = () => {
    if (sourceWallet.expectedChainId && sourceWallet.expectedWalletName) {
      onDisconnectWallet({ chainId: sourceWallet.expectedChainId, walletName: sourceWallet.expectedWalletName });
    }
  };

  const handleConnectToWallet = (options: { walletName: string }) => {
    const { walletName } = options;
    const wallet = wallets.find((item) => item.walletName === walletName);

    if (!wallet) {
      return;
    }

    const connectedWalletChainId = connectedWallet?.chainId;
    const chainId =
      connectedWalletChainId && wallet.availableChainIds.includes(connectedWalletChainId)
        ? connectedWalletChainId
        : defaultChainId;

    connect({ chainId, walletName });
  };

  return (
    <>
      {isSourceWalletConnected ? (
        <Button className={connectWalletButton} type="primary" onClick={onDisconnectButtonClick}>
          Disconnect
        </Button>
      ) : (
        <Button className={connectWalletButton} type="primary" onClick={onConnectButtonClick}>
          Connect
        </Button>
      )}
      <WalletSelectorModal
        modalTitle="Add wallet"
        isVisible={isModalOpen}
        chainId={defaultChainId}
        wallets={wallets}
        onSelectWallet={handleConnectToWallet}
        onVisibleChanged={(visible) => {
          setIsModalOpen(visible);
        }}
      />
    </>
  );
};

const connectWalletButton = css`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  color: #fff;
  background-color: var(--ant-primary-1);
  font-weight: 600;
  border: 0;
  padding: 0 ${pxToPcVw(26)} !important;
  height: ${pxToPcVw(40)};
  border-radius: ${pxToPcVw(20)};
  line-height: ${pxToPcVw(17)};
  font-size: ${pxToPcVw(12)};
  gap: ${pxToPcVw(8)};

  &.ant-btn::before {
    // remove antd loading status background overlay
    background: var(--ant-primary-1);
  }

  &:disabled {
    color: var(--ant-background) !important;
    background: var(--ant-primary-color);

    cursor: not-allowed;

    &:hover {
      background: var(--ant-primary-color);
    }
  }

  @media (max-width: 1024px) {
    width: 100%;
    padding: 0 ${pxToMobileVw(26)} !important;
    border: 0;
    height: ${pxToMobileVw(40)};
    border-radius: ${pxToMobileVw(20)};
    line-height: ${pxToMobileVw(17)};
    font-size: ${pxToMobileVw(12)};
    gap: ${pxToMobileVw(8)};
  }
`;
