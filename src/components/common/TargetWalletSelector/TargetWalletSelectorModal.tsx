import { CHAIN_ID_SOLANA } from '@certusone/wormhole-sdk';
import { css } from '@linaria/core';
import React, { useMemo, useState } from 'react';
import { getAbstractWalletByChainIdAndName } from '../../../context/Wallet/helpers/ethereum';
import { AbstractWallet } from '../../../context/Wallet/types';
import { Wallet } from '../../../hooks/useWallet';
import { CacheWallet } from '../../../store/walletCache';
import { pxToMobileVw, pxToPcVw } from '../../../utils/style-evaluation';
import { addressShortener, isCarrierEVMChain } from '../../../utils/web3Utils';
import { SelectionModal, SelectionModalTag } from '../SelectionModal';
import { WalletIcon } from '../WalletIcon';
import { ethers } from 'ethers';
import { PublicKey } from '@solana/web3.js';
import { InfoBanner } from '../InfoBanner';
import { SVGIcon } from '../SVGIcon';
import { CarrierChainId } from '../../../utils/consts';

interface Props {
  isVisible: boolean;
  targetChainId: CarrierChainId;
  wallets: CacheWallet[];
  sourceWallet: Wallet;
  abstractWallets: AbstractWallet[];
  onSelectWallet(options: { chainId: CarrierChainId; walletName?: string; walletAddress: string }): void;
  onWalletSelectorModalVisibleChange: (visible: boolean) => void;
}

export const TargetWalletSelectorModal: React.SFC<Props> = ({
  isVisible,
  targetChainId,
  sourceWallet,
  wallets,
  abstractWallets,
  onSelectWallet,
  onWalletSelectorModalVisibleChange,
}) => {
  const [walletNameFilter, setWalletNameFilter] = useState<string>();

  const filteredWallets = useMemo(() => {
    return wallets.filter((item) => {
      return walletNameFilter
        ? item.nickname.toLowerCase().includes(walletNameFilter.toLowerCase()) ||
            item.address.toLowerCase().includes(walletNameFilter.toLowerCase())
        : true;
    });
  }, [wallets, walletNameFilter]);

  return (
    <SelectionModal
      visible={isVisible}
      title="Destination wallet"
      searchPlaceHolder="Search wallet name"
      tips={
        <InfoBanner
          type="info"
          message={
            <div className={styleTipsContainer}>
              Destination wallet must support bridged tokens or assets may be unrecoverable.
              <a
                className={styleTipsLink}
                href={process.env.DESITINATION_WALLET_TIPS_LINK}
                target="_blank"
                referrerPolicy="no-referrer">
                Learn more
                <SVGIcon className={styleTipsLinkIcon} iconName="arrow-up-right" />
              </a>
            </div>
          }
        />
      }
      disableSearch={targetChainId === CHAIN_ID_SOLANA}
      onVisibleChanged={onWalletSelectorModalVisibleChange}
      onSearch={(searchString) => {
        const walletIndex = wallets.findIndex((item) => {
          return (
            item.nickname.toLowerCase().includes(searchString.toLowerCase()) ||
            item.address.toLowerCase().includes(searchString.toLowerCase())
          );
        });

        if (walletIndex !== -1 || searchString === '') {
          setWalletNameFilter(searchString);
        } else {
          let addressIsValid = true;

          if (isCarrierEVMChain(targetChainId)) {
            addressIsValid = ethers.utils.isAddress(searchString);
          }

          if (addressIsValid) {
            onSelectWallet({ chainId: targetChainId, walletAddress: searchString });
            onWalletSelectorModalVisibleChange(false);
          }
        }
      }}>
      <div className={styleList}>
        {filteredWallets
          .sort((a, b) => {
            const aSameAddressAsSourceWallet =
              sourceWallet.expectedWalletName === a.name &&
              sourceWallet.wallet?.walletAddress.toLowerCase() === a.address.toLowerCase();
            const bSameAddressAsSourceWallet =
              sourceWallet.expectedWalletName === b.name &&
              sourceWallet.wallet?.walletAddress.toLowerCase() === b.address.toLowerCase();

            return aSameAddressAsSourceWallet && !bSameAddressAsSourceWallet
              ? -1
              : !aSameAddressAsSourceWallet && bSameAddressAsSourceWallet
              ? 1
              : 0;
          })
          .map((item, index) => {
            const targetAbstractWallet = getAbstractWalletByChainIdAndName(abstractWallets, item.chainId, item.name);
            const sameAddressAsSourceWallet =
              sourceWallet.expectedWalletName === item.name &&
              sourceWallet.wallet?.walletAddress.toLowerCase() === item.address.toLowerCase();

            return (
              <div
                key={`${item.name}${item.chainId}${item.address}`}
                className={ListItemWrapper}
                onClick={() => {
                  onSelectWallet({ chainId: targetChainId, walletName: item.name, walletAddress: item.address });
                  onWalletSelectorModalVisibleChange(false);
                }}>
                <WalletIcon className={ListItemLogo} icon={targetAbstractWallet?.icon} />
                <div>{item.nickname ? item.nickname : item.address ? addressShortener(item.address) : ''}</div>
                {sameAddressAsSourceWallet ? <SelectionModalTag>Source</SelectionModalTag> : null}
              </div>
            );
          })}
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

const styleTipsContainer = css`
  display: flex;
  align-items: center;
  gap: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(8)};
  }
`;

const styleTipsLink = css`
  flex-shrink: 0;
  display: flex;
  font-weight: 500;
  margin-left: auto;
  align-items: center;
  font-size: ${pxToPcVw(14)};
  gap: ${pxToPcVw(8)};

  & svg > * {
    fill: var(--ant-primary-5);
    transition: fill 0.5s;
  }

  &:hover svg > * {
    fill: var(--ant-primary-4);
  }

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(14)};
    gap: ${pxToMobileVw(8)};
  }
`;

const styleTipsLinkIcon = css`
  width: ${pxToPcVw(10)};
  height: ${pxToPcVw(10)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(10)};
    height: ${pxToMobileVw(10)};
  }
`;
