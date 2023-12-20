import { globalStore } from '.';
import { CacheWallet, produceNewWalletsCache, setWalletsCacheToLocal } from './walletCache';

export function setAppTouchedByUser() {
  globalStore.update((store) => {
    store.appTouchedByUser = true;
  });
}

export function setWalletCache(wallet: CacheWallet) {
  const { name, address, chainId } = wallet;

  globalStore.update((store) => {
    if (name && address && chainId) {
      const newWallets = produceNewWalletsCache(store.walletCache || [], wallet);

      store.walletCache = newWallets;

      setWalletsCacheToLocal(newWallets);
    }
  });
}

export function removeWalletCache(wallet: CacheWallet) {
  const { address } = wallet;

  globalStore.update((store) => {
    const remainingWallets = store.walletCache.filter((item) => item.address !== address);

    store.walletCache = remainingWallets;

    setWalletsCacheToLocal(remainingWallets);
  });
}

export function editWalletCacheNickName(wallet: CacheWallet) {
  const { nickname, address } = wallet;

  globalStore.update((store) => {
    store.walletCache.forEach((wallet) => {
      if (wallet.address.toLowerCase() === address.toLowerCase()) {
        wallet.nickname = nickname;
      }
    });

    store.walletCache.sort((a, b) => {
      return a.address.toLowerCase() === address && b.address.toLowerCase() !== address
        ? -1
        : a.address.toLowerCase() !== address && b.address.toLowerCase() === address
        ? 1
        : 0;
    });

    setWalletsCacheToLocal(store.walletCache);
  });
}
