import { CHAIN_ID_SOLANA } from '@certusone/wormhole-sdk';
import { css, cx } from '@linaria/core';
import React, { useMemo, useState } from 'react';
import { AbstractWallet } from '../../../context/Wallet/types';
import { TargetWallet } from '../../../hooks/useTargetWallet';
import { Wallet } from '../../../hooks/useWallet';
import { CarrierChainId, ChainInfo } from '../../../utils/consts';
import { pxToMobileVw, pxToPcVw } from '../../../utils/style-evaluation';
import { ChainSelector } from '../ChainSelector/ChainSelector';
import { TargetWalletSelectorDropdown } from './TargetWalletDropdown';
import { TargetWalletSelectorButton } from './TargetWalletSelectorButton';
import uniqWith from 'lodash/uniqWith';
import { CacheWallet } from '../../../store/walletCache';
import { isCarrierEVMChain, isCarrierPolkaChain } from '../../../utils/web3Utils';

interface Props {
  className?: string;
  disabled?: boolean;
  targetWalletSelectorModalVisible?: boolean;
  targetChainId: CarrierChainId;
  chains: ChainInfo[];
  targetWallet: TargetWallet;
  walletCache: CacheWallet[];
  abstractWallets: AbstractWallet[];
  sourceWallet: Wallet;
  onSelectChain: (options: { chainId: CarrierChainId }) => void;
  onSelectWallet(options: { chainId: CarrierChainId; walletName?: string; walletAddress: string }): void;
  onDisconnect(): void;
  onTargetWalletSelectorModalVisibleChanged?: (visible: boolean) => void;
}

export const TargetWalletSelector: React.SFC<Props> = ({
  className,
  disabled,
  targetWalletSelectorModalVisible,
  targetChainId,
  chains,
  targetWallet,
  walletCache,
  abstractWallets,
  sourceWallet,
  onSelectChain,
  onSelectWallet,
  onDisconnect,
  onTargetWalletSelectorModalVisibleChanged,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const wallets = useMemo(() => {
    const cachedWallets = walletCache.filter((item) =>
      isCarrierEVMChain(targetChainId)
        ? isCarrierEVMChain(item.chainId)
        : isCarrierPolkaChain(targetChainId) || targetChainId === CHAIN_ID_SOLANA
        ? item.chainId === targetChainId
        : false,
    );

    return uniqWith(cachedWallets, (a, b) => a.address === b.address);
  }, [targetChainId, walletCache]);

  return (
    <div className={cx(styleChainSelectorContainer, className)}>
      <div className={styleChainSelectorHeaderRow}>
        <div className={styleChainSelectorHeaderTitle}>Destination</div>
        {targetWallet.wallet ? (
          <TargetWalletSelectorDropdown
            disabled={disabled}
            abstractWallets={abstractWallets}
            targetWallet={targetWallet}
            onDisconnect={onDisconnect}
            onChangeWallet={() => {
              if (onTargetWalletSelectorModalVisibleChanged) {
                onTargetWalletSelectorModalVisibleChanged(true);
              } else {
                setIsVisible(true);
              }
            }}
          />
        ) : null}
      </div>
      <div className={ChainSelectRow}>
        <ChainSelector disabled={disabled} chains={chains} chainId={targetChainId} onSelectChain={onSelectChain} />

        <div className={cx(styleWalletSelectionButton, targetWallet.wallet ? styleHidden : undefined)}>
          <TargetWalletSelectorButton
            disabled={disabled}
            walletSelectorModalVisible={targetWalletSelectorModalVisible || isVisible}
            targetChainId={targetChainId}
            wallets={wallets}
            sourceWallet={sourceWallet}
            abstractWallets={abstractWallets}
            onSelectWallet={onSelectWallet}
            onWalletSelectorModalVisibleChange={onTargetWalletSelectorModalVisibleChanged || setIsVisible}
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
