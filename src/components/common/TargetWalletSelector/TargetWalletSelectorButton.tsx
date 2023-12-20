import { css, cx } from '@linaria/core';
import React from 'react';
import { AbstractWallet } from '../../../context/Wallet/types';
import { Wallet } from '../../../hooks/useWallet';
import { CacheWallet } from '../../../store/walletCache';
import { pxToMobileVw, pxToPcVw } from '../../../utils/style-evaluation';
import { SVGIcon } from '../SVGIcon';
import { TargetWalletSelectorModal } from './TargetWalletSelectorModal';
import { Button } from '../Button';
import Tooltip from '../Tooltip';
import { CarrierChainId } from '../../../utils/consts';

interface Props {
  className?: string;
  disabled?: boolean;
  targetChainId: CarrierChainId;
  wallets: CacheWallet[];
  sourceWallet: Wallet;
  abstractWallets: AbstractWallet[];
  walletSelectorModalVisible: boolean;
  onSelectWallet(options: { chainId: CarrierChainId; walletName?: string; walletAddress: string }): void;
  onWalletSelectorModalVisibleChange: (visible: boolean) => void;
}

export const TargetWalletSelectorButton: React.SFC<Props> = ({
  className,
  disabled,
  targetChainId,
  wallets,
  sourceWallet,
  abstractWallets,
  walletSelectorModalVisible,
  onSelectWallet,
  onWalletSelectorModalVisibleChange,
}) => {
  return (
    <>
      <Tooltip
        trigger={['hover']}
        disableIcon
        tooltipText="Connect wallet"
        content={
          <Button
            disabled={disabled}
            type="primary"
            className={cx(styleWalletButton, className)}
            onClick={() => {
              onWalletSelectorModalVisibleChange(true);
            }}>
            <SVGIcon className={styleWalletIcon} iconName="wallet" />
          </Button>
        }
      />
      <TargetWalletSelectorModal
        isVisible={walletSelectorModalVisible}
        targetChainId={targetChainId}
        sourceWallet={sourceWallet}
        abstractWallets={abstractWallets}
        wallets={wallets}
        onSelectWallet={onSelectWallet}
        onWalletSelectorModalVisibleChange={onWalletSelectorModalVisibleChange}
      />
    </>
  );
};

const styleWalletButton = css`
  flex-shrink: 0;
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
