import { createStore } from '@jimengio/rex';
import { CacheWallet, getWalletsCacheFromLocal } from './walletCache';

export interface IStore {
  appTouchedByUser: boolean;
  walletCache: CacheWallet[];
  walletDropdownSourceAddress?: string;
  walletDropdownTargetAddress?: string;
  addingWallet?: boolean;
}

export const initialStore: IStore = {
  appTouchedByUser: false,
  walletCache: getWalletsCacheFromLocal(),
};

export const globalStore = createStore<IStore>(initialStore);
