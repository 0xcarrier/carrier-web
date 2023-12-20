import React, { useCallback, useContext, useMemo, useState } from 'react';

import { SolanaWalletProvider } from './SolanaWalletProvider';
import { AbstractWallet, ConnectedWallet, WalletAdapterInterface, WalletState } from './types';
import { useExodus } from './wallets/useExodus';
import { useMetamask } from './wallets/useMetamask';
import { usePhantom } from './wallets/usePhantom';
import { useSolflare } from './wallets/useSolflare';
import { useWalletConnectV2 } from './wallets/useWalletConnectV2';
import { useOneKey } from './wallets/useOneKey';
import { CarrierChainId } from '../../utils/consts';
import { usePolkadotJS } from './wallets/usePolkadotJS';
import { useSubWallet } from './wallets/useSubWallet';
import { useTalisman } from './wallets/useTalisman';

const WalletAdapterContext = React.createContext<WalletAdapterInterface>({
  connect: (options) => {
    throw new Error('WalletAdapterContext is not inited');
  },
  disconnect: () => {
    throw new Error('WalletAdapterContext is not inited');
  },
  getAccountList: () => {
    throw new Error('WalletAdapterContext is not inited');
  },
  state: WalletState.DISCONNECTED,
  error: undefined,
  connectedWallet: undefined,
  wallets: [],
});

const WalletAdapterProviderImpl: React.SFC = ({ children }) => {
  const [connectedWalletName, setConnectedWalletName] = useState<string>();

  const metamask = useMetamask();
  const onekey = useOneKey();
  const walletConnect = useWalletConnectV2();
  const phantom = usePhantom();
  const exodus = useExodus();
  const solflare = useSolflare();
  const polkadotJs = usePolkadotJS();
  const subWallet = useSubWallet();
  const talisman = useTalisman();
  const allWallets = useMemo(() => {
    return [metamask, onekey, walletConnect, phantom, exodus, solflare, polkadotJs, subWallet, talisman];
  }, [metamask, onekey, walletConnect, phantom, exodus, solflare, polkadotJs, subWallet, talisman]);

  const connect = useCallback(
    (options: { chainId: CarrierChainId; walletName: string; silence?: boolean; selectedAccount?: string }) => {
      const { chainId, walletName, silence, selectedAccount } = options;

      const wallet = allWallets.find((item) => item.walletName === walletName);

      if (wallet) {
        wallet.connect({ chainId, silence, selectedAccount });

        setConnectedWalletName(walletName);
      }
    },
    [allWallets, setConnectedWalletName],
  );

  const disconnect = useCallback(
    (options: { chainId: CarrierChainId; walletName: string }) => {
      const { chainId, walletName } = options;

      const wallet = allWallets.find((item) => item.walletName === walletName);

      if (wallet) {
        wallet.disconnect({ chainId });

        setConnectedWalletName(undefined);
      }
    },
    [allWallets, setConnectedWalletName],
  );

  const getAccountList = useCallback(
    (options: { chainId: CarrierChainId; walletName: string }) => {
      const { chainId, walletName } = options;

      const wallet = allWallets.find((item) => item.walletName === walletName);

      return wallet && wallet.getAccountList ? wallet.getAccountList({ chainId }) : Promise.resolve(undefined);
    },
    [allWallets],
  );

  const currentWallet = useMemo(() => {
    const wallet = allWallets.find((item) => item.walletName === connectedWalletName);

    return wallet;
  }, [allWallets, connectedWalletName]);

  const connectedWallet = useMemo(() => {
    if (currentWallet) {
      if (currentWallet.chainId && currentWallet.walletAddress) {
        const { isInstalled, install, state, error, connect, disconnect, walletAddress, chainId, ...rest } =
          currentWallet;

        const connectedWallet: ConnectedWallet = { walletAddress, chainId, ...rest };

        return connectedWallet;
      }
    }
  }, [currentWallet]);

  const wallets = useMemo((): AbstractWallet[] => {
    return allWallets.map((item) => {
      const { walletName, isInstalled, install, icon, availableChainIds } = item;

      return {
        walletName,
        isInstalled,
        install,
        icon,
        availableChainIds,
      };
    });
  }, [allWallets]);

  const contextValue = useMemo(
    () => ({
      connect,
      disconnect,
      getAccountList,
      state: currentWallet ? currentWallet.state : WalletState.DISCONNECTED,
      error: currentWallet ? currentWallet.error : undefined,
      connectedWallet,
      wallets,
    }),
    [connect, disconnect, getAccountList, wallets, currentWallet, connectedWallet],
  );

  return <WalletAdapterContext.Provider value={contextValue}>{children}</WalletAdapterContext.Provider>;
};

export const WalletAdapterProvider: React.SFC = ({ children }) => {
  return (
    <SolanaWalletProvider>
      <WalletAdapterProviderImpl>{children}</WalletAdapterProviderImpl>
    </SolanaWalletProvider>
  );
};

export const useWalletAdapter = () => {
  return useContext(WalletAdapterContext);
};
