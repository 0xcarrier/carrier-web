import produce from 'immer';
import { CarrierChainId } from '../utils/consts';

export interface CacheWallet {
  name: string;
  address: string;
  chainId: CarrierChainId;
  nickname: string;
}

const LOCAL_STORAGE_WALLET_KEY = 'CarrierWallets';

export function setWalletsCacheToLocal(wallets: CacheWallet[]) {
  localStorage.setItem(LOCAL_STORAGE_WALLET_KEY, JSON.stringify(wallets));
}

export function getWalletsCacheFromLocal(): CacheWallet[] {
  const storedWalletInfo = localStorage.getItem(LOCAL_STORAGE_WALLET_KEY);

  return storedWalletInfo ? JSON.parse(storedWalletInfo) : [];
}

export function produceNewWalletsCache(walletsCache: CacheWallet[], wallet: CacheWallet) {
  const { address, nickname, name, chainId } = wallet;
  const existedWalletWithSameAddress = walletsCache.find((item) => {
    return item.address.toLowerCase() === address.toLowerCase();
  });
  const newWallet: CacheWallet = {
    address,
    name,
    chainId,
    nickname: existedWalletWithSameAddress?.nickname || nickname,
  };
  const existedRecordIndex = walletsCache.findIndex((item) => {
    return item.chainId === chainId && item.address.toLowerCase() === address.toLowerCase();
  });
  const existedRecord = existedRecordIndex !== -1 ? walletsCache[existedRecordIndex] : undefined;

  return produce(walletsCache, (draft) => {
    if (!existedRecord) {
      draft.unshift(newWallet);
    } else if (existedRecord) {
      // if previous record is exised but use different wallet extension to connect
      // then remove the previous record and insert the new one
      if (existedRecord.name !== newWallet.name) {
        draft.splice(existedRecordIndex, 1);
        draft.unshift(newWallet);
      }
    }
  });
}
