import { css } from '@linaria/core';
import React, { useMemo, useState } from 'react';
import { AbstractWallet } from '../../../context/Wallet/types';
import { useData } from '../../../hooks/useData';
import { pxToMobileVw, pxToPcVw } from '../../../utils/style-evaluation';
import { Loading } from '../Loading';
import { SelectionModal } from '../SelectionModal';
import { WalletIcon } from '../WalletIcon';
import { CarrierChainId } from '../../../utils/consts';
import { Spinner } from '../Spinner';

interface Props {
  modalTitle?: string;
  isVisible: boolean;
  chainId?: CarrierChainId;
  wallets: AbstractWallet[];
  onSelectWallet(options: { walletName: string }): void;
  onVisibleChanged(visible: boolean): void;
}

export const WalletSelectorModal: React.SFC<Props> = ({
  modalTitle = 'Select wallet',
  isVisible,
  chainId,
  wallets,
  onSelectWallet,
  onVisibleChanged,
}) => {
  const [walletNameFilter, setWalletNameFilter] = useState<string>();

  const filteredWallets = useMemo(() => {
    return wallets
      .filter((item) => {
        return chainId ? item.availableChainIds.includes(chainId) : true;
      })
      .filter((item) => {
        return walletNameFilter ? item.walletName.toLowerCase().includes(walletNameFilter.toLowerCase()) : true;
      });
  }, [wallets, walletNameFilter, chainId]);

  const options = useData(async () => {
    const installed = await Promise.all(filteredWallets.map((item) => item.isInstalled()));

    return installed;
  }, [filteredWallets]);

  return (
    <SelectionModal
      visible={isVisible}
      title={modalTitle}
      searchPlaceHolder="Search wallet name"
      onVisibleChanged={onVisibleChanged}
      onSearch={setWalletNameFilter}>
      <div className={styleList}>
        <Loading
          options={options}
          renderLoading={() => (
            <div className={styleLoadingContainer}>
              <Spinner className={styleSpiner} /> Loading wallets
            </div>
          )}
          render={(installed) => {
            return filteredWallets.map((item, index) => {
              if (installed && installed[index]) {
                return (
                  <div
                    key={item.walletName}
                    className={ListItemWrapper}
                    onClick={() => {
                      onSelectWallet({ walletName: item.walletName });
                      onVisibleChanged(false);
                    }}>
                    <WalletIcon className={ListItemLogo} icon={item.icon} />
                    <div>{item.walletName}</div>
                  </div>
                );
              } else {
                return (
                  <a
                    key={item.walletName}
                    className={ListItemWrapper}
                    onClick={() => {
                      item.install();
                    }}>
                    <WalletIcon className={ListItemLogo} icon={item.icon} />
                    Install {item.walletName}
                  </a>
                );
              }
            });
          }}
        />
      </div>
    </SelectionModal>
  );
};

const styleList = css`
  display: flex;
  flex-direction: column;
`;

const ListItemWrapper = css`
  display: flex;
  align-items: center;
  font-weight: 500;
  color: #fff;
  padding: ${pxToPcVw(13)} ${pxToPcVw(16)};
  gap: ${pxToPcVw(21)};
  font-size: ${pxToPcVw(20)};

  &:hover {
    cursor: pointer;
    background: var(--ant-primary-color);
    color: #fff;
  }

  @media (max-width: 1024px) {
    padding: ${pxToMobileVw(13)} ${pxToMobileVw(16)};
    gap: ${pxToMobileVw(21)};
    font-size: ${pxToMobileVw(20)};
  }
`;

const ListItemLogo = css`
  height: ${pxToPcVw(48)};
  width: ${pxToPcVw(48)};

  @media (max-width: 1024px) {
    height: ${pxToMobileVw(48)};
    width: ${pxToMobileVw(48)};
  }
`;

const styleLoadingContainer = css`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    margin-bottom: ${pxToMobileVw(16)};
  }
`;

const styleSpiner = css`
  margin-right: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    margin-right: ${pxToMobileVw(8)};
  }
`;
