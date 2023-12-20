import { useEffect, useState } from 'react';
import { ChainCache } from '../utils/chainCache';
import { TargetWallet } from './useTargetWallet';
import { Wallet } from './useWallet';
import { WalletState } from '../context/Wallet/types';

export function useAutoConnection(options: {
  sourceWallet: Wallet;
  targetWallet: TargetWallet;
  chainAndWalletCache: ChainCache;
}) {
  const { sourceWallet, targetWallet, chainAndWalletCache } = options;
  const [needAutoConnectSourceWallet, setNeedAutoConnectSourceWallet] = useState(
    chainAndWalletCache.previousConnectedSourceWalletName && chainAndWalletCache.sourceChainId
      ? chainAndWalletCache.previousConnectedSourceWalletName[chainAndWalletCache.sourceChainId] != null
      : false,
  );

  const [needAutoConnectTargetWallet, setNeedAutoConnectTargetWallet] = useState(
    chainAndWalletCache.previousConnectedTargetWallet && chainAndWalletCache.targetChainId
      ? chainAndWalletCache.previousConnectedTargetWallet[chainAndWalletCache.targetChainId] != null
      : false,
  );

  useEffect(() => {
    if (needAutoConnectSourceWallet) {
      if (
        sourceWallet &&
        sourceWallet.state !== WalletState.CONNECTED &&
        sourceWallet.state !== WalletState.CONNECTING &&
        chainAndWalletCache.sourceChainId &&
        chainAndWalletCache.previousConnectedSourceWalletName &&
        chainAndWalletCache.previousConnectedSourceWalletName[chainAndWalletCache.sourceChainId]
      ) {
        sourceWallet.connect({
          chainId: chainAndWalletCache.sourceChainId,
          walletName: chainAndWalletCache.previousConnectedSourceWalletName[chainAndWalletCache.sourceChainId],
          selectedAccount:
            chainAndWalletCache.previousConnectedSourceWalletAddress &&
            chainAndWalletCache.previousConnectedSourceWalletAddress[chainAndWalletCache.sourceChainId],
          silence: true,
        });
      }

      setNeedAutoConnectSourceWallet(false);
    }
  }, [needAutoConnectSourceWallet, sourceWallet]);

  useEffect(() => {
    if (needAutoConnectTargetWallet) {
      if (
        targetWallet &&
        chainAndWalletCache.targetChainId &&
        chainAndWalletCache.previousConnectedTargetWallet &&
        chainAndWalletCache.previousConnectedTargetWallet[chainAndWalletCache.targetChainId]
      ) {
        targetWallet.connect({
          chainId: chainAndWalletCache.targetChainId,
          walletName: chainAndWalletCache.previousConnectedTargetWallet[chainAndWalletCache.targetChainId].walletName,
          walletAddress:
            chainAndWalletCache.previousConnectedTargetWallet[chainAndWalletCache.targetChainId].walletAddress,
        });
      }

      setNeedAutoConnectTargetWallet(false);
    }
  }, [needAutoConnectTargetWallet, targetWallet]);
}
