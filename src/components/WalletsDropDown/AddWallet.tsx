import React, { useEffect, useMemo, useState } from 'react';

import { css } from '@linaria/core';

import addIconSvg from '../../assets/icons/add.svg';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { useWalletAdapter } from '../../context/Wallet/WalletProvider';
import { useRexContext } from '@jimengio/rex';
import { globalStore, IStore } from '../../store';
import { WalletSelectorModal } from '../common/WalletSelector/WalletSelectorModal';
import { setWalletCache } from '../../store/dispatcher';
import { CHAINS, CarrierChainId } from '../../utils/consts';
import { ChainSelectorModal } from '../common/ChainSelector/ChainSelectorModal';
import { getChainCache } from '../../utils/chainCache';
import { AccountSelectorModal } from '../common/WalletSelector/AccountSelectorModal';

export const AddWallet = () => {
  const { addingWallet } = useRexContext((store: IStore) => store);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChainSelectorModalOpen, setChainSelectorModalOpen] = useState(false);
  const [isAccountSelectorModalOpen, setAccountSelectorModalOpen] = useState(false);
  const [selectedWalletName, setSelectedWalletName] = useState<string>();
  const [selectedChainId, setSelectedChainId] = useState<CarrierChainId>();
  const [accountList, setAccountList] = useState<{ walletName: string; accounts: string[] } | undefined>();
  const [previousWallet, setPreviousWallet] = useState<{ chainId: CarrierChainId; walletName: string }>();
  const { wallets, connect, getAccountList, connectedWallet } = useWalletAdapter();

  useEffect(() => {
    if (addingWallet && connectedWallet) {
      setWalletCache({
        name: connectedWallet.walletName,
        address: connectedWallet.walletAddress,
        chainId: connectedWallet.chainId,
        nickname: '',
      });

      if (previousWallet) {
        connect({ chainId: previousWallet.chainId, walletName: previousWallet.walletName });
      }

      globalStore.update((store) => {
        store.addingWallet = false;
      });
    }
  }, [addingWallet, connectedWallet, previousWallet]);

  const chains = useMemo(() => {
    const wallet = wallets.find((item) => item.walletName === selectedWalletName);
    const chains = wallet?.availableChainIds || [];
    return CHAINS.filter((item) => chains.includes(item.id));
  }, [wallets, selectedWalletName]);

  function selectChain(options: { walletName: string }) {
    const { walletName } = options;

    setSelectedWalletName(walletName);
    setChainSelectorModalOpen(true);
  }

  async function connectWallet(options: { chainId: CarrierChainId; walletName: string }) {
    const { chainId, walletName } = options;

    if (connectedWallet) {
      setPreviousWallet({ chainId: connectedWallet.chainId, walletName: connectedWallet.walletName });
    }

    const accounts = await getAccountList({ chainId, walletName });

    if (accounts && accounts.length > 1) {
      setSelectedWalletName(walletName);
      setSelectedChainId(chainId);
      setAccountList({ walletName, accounts });
      setAccountSelectorModalOpen(true);
    } else {
      connectWalletWithAcount({ chainId, walletName, account: accounts ? accounts[0] : undefined });
    }
  }

  function connectWalletWithAcount(options: { chainId: CarrierChainId; walletName: string; account?: string }) {
    const { chainId, walletName, account } = options;

    connect({ chainId, walletName, selectedAccount: account });

    globalStore.update((store) => {
      store.addingWallet = true;
    });
  }

  function onAccountSelect(options: { account: string }) {
    const { account } = options;

    if (selectedWalletName && selectedChainId) {
      connectWalletWithAcount({ chainId: selectedChainId, walletName: selectedWalletName, account });
    }
  }

  function onChainSelect(options: { chainId: CarrierChainId }) {
    const { chainId } = options;

    if (selectedWalletName) {
      connectWallet({ chainId, walletName: selectedWalletName });
    }
  }

  function onWalletSelect(options: { walletName: string }) {
    const { walletName } = options;
    const wallet = wallets.find((item) => item.walletName === walletName);

    if (!wallet) {
      return;
    }

    const chainAndWalletCache = getChainCache();
    const walletAvailableChains = CHAINS.filter((item) => wallet.availableChainIds.includes(item.id));
    const chainId: CarrierChainId | undefined =
      connectedWallet?.chainId && wallet.availableChainIds.includes(connectedWallet?.chainId)
        ? connectedWallet?.chainId
        : wallet.availableChainIds.includes(chainAndWalletCache.sourceChainId)
        ? chainAndWalletCache.sourceChainId
        : walletAvailableChains.length === 1
        ? walletAvailableChains[0].id
        : undefined;

    if (chainId) {
      connectWallet({ chainId, walletName });
    } else {
      selectChain({ walletName });
    }
  }

  return (
    <>
      <button
        className={addWalletButton}
        onClick={() => {
          setIsModalOpen(true);
        }}>
        <img className={addIcon} src={addIconSvg} />
        Add Wallet
      </button>

      <WalletSelectorModal
        modalTitle="Add wallet"
        isVisible={isModalOpen}
        wallets={wallets}
        onSelectWallet={onWalletSelect}
        onVisibleChanged={(visible) => {
          setIsModalOpen(visible);
        }}
      />

      <ChainSelectorModal
        isVisible={isChainSelectorModalOpen}
        chains={chains}
        onSelectChain={onChainSelect}
        onVisibleChanged={setChainSelectorModalOpen}
      />

      <AccountSelectorModal
        isVisible={isAccountSelectorModalOpen}
        accounts={accountList?.accounts || []}
        walletName={accountList?.walletName || ''}
        walletIcon={wallets.find((item) => item.walletName === accountList?.walletName)?.icon || ''}
        onSelectAccount={onAccountSelect}
        onVisibleChanged={setAccountSelectorModalOpen}
      />
    </>
  );
};

const addWalletButton = css`
  appearance: none;
  display: flex;
  align-items: center;
  width: 100%;
  background: transparent;
  border: 0;
  font-weight: 600;
  gap: ${pxToPcVw(12)};
  padding: ${pxToPcVw(16)};
  border-bottom: ${pxToPcVw(2)} solid var(--color-border);
  font-size: ${pxToPcVw(16)};

  &:hover {
    cursor: pointer;
    background: var(--ant-primary-color);
  }

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(15)};
    padding: ${pxToMobileVw(16)};
    border-bottom: ${pxToMobileVw(2)} solid var(--color-border);
    font-size: ${pxToMobileVw(16)};
  }
`;

const addIcon = css`
  object-fit: contain;
  border-radius: 50%;
  width: ${pxToPcVw(32)};
  height: ${pxToPcVw(32)};
  border: solid ${pxToPcVw(3)} var(--ant-primary-1);
  /* for the white background under the transparent plus shape */
  background: radial-gradient(
    circle,
    rgba(255, 255, 255, 1) 0%,
    rgba(255, 255, 255, 1) 50%,
    rgba(255, 255, 255, 0) 50%
  );

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(32)};
    height: ${pxToMobileVw(32)};
    border: solid ${pxToMobileVw(3)} var(--ant-primary-1);
  }
`;
