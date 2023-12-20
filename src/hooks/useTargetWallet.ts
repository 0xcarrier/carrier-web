import { useCallback, useMemo, useState } from 'react';
import { CarrierChainId } from '../utils/consts';

export interface TargetWalletData {
  chainId: CarrierChainId;
  walletAddress: string;
  walletName?: string;
  extraData?: any;
}

export interface TargetWallet {
  wallet: TargetWalletData | undefined;
  connect: (wallet: TargetWalletData) => void;
  disconnect: () => void;
  setExtraData: (extraData: any) => void;
}

export function useTargetWallet() {
  const [currentWallet, setCurrentWallet] = useState<TargetWalletData>();
  const [currentWalletExtraData, setCurrentWalletExtraData] = useState<any>();
  const connect = useCallback(
    (wallet: TargetWalletData) => {
      setCurrentWallet(wallet);
    },
    [setCurrentWallet],
  );

  const disconnect = useCallback(() => {
    setCurrentWallet(undefined);
  }, [setCurrentWallet]);

  return useMemo(() => {
    return {
      wallet: currentWallet ? { ...currentWallet, extraData: currentWalletExtraData } : undefined,
      connect,
      disconnect,
      setExtraData: setCurrentWalletExtraData,
    };
  }, [currentWallet, currentWalletExtraData, connect, disconnect, setCurrentWalletExtraData]);
}
