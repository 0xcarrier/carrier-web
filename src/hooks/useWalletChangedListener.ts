import { useEffect } from 'react';
import { globalStore } from '../store';
import { setWalletCache } from '../store/dispatcher';
import { TargetWallet } from './useTargetWallet';
import { Wallet } from './useWallet';
import {
  checkIfWalletAddressIsCompatibleWithChain,
  isCarrierEVMChain,
  isCarrierPolkaChain,
  isValidEthereumAddress,
  isValidPolkachainAddress,
  isValidSolanaAddress,
} from '../utils/web3Utils';
import { CHAIN_ID_SOLANA } from '@certusone/wormhole-sdk';

export function useWalletChangedListener(options: { sourceWallet: Wallet; targetWallet: TargetWallet }) {
  const { sourceWallet, targetWallet } = options;

  async function checkSourceWalletAddress() {
    if (sourceWallet.wallet?.walletAddress && sourceWallet.wallet?.walletName && sourceWallet.wallet?.chainId) {
      // check if the wallet address is compatable with the chain id in case the chain id is changed before walletAddress
      const isWalletAddressCompatableWithChain = isCarrierEVMChain(sourceWallet.wallet.chainId)
        ? isValidEthereumAddress(sourceWallet.wallet.walletAddress)
        : isCarrierPolkaChain(sourceWallet.wallet.chainId)
        ? await isValidPolkachainAddress(sourceWallet.wallet.walletAddress, sourceWallet.wallet.chainId)
        : sourceWallet.wallet.chainId === CHAIN_ID_SOLANA
        ? isValidSolanaAddress(sourceWallet.wallet.walletAddress)
        : false;

      if (isWalletAddressCompatableWithChain) {
        setWalletCache({
          name: sourceWallet.wallet.walletName,
          address: sourceWallet.wallet.walletAddress,
          chainId: sourceWallet.wallet.chainId,
          nickname: '',
        });

        globalStore.update((store) => {
          store.walletDropdownSourceAddress = sourceWallet.wallet?.walletAddress;
        });
      }
    }
  }

  useEffect(() => {
    checkSourceWalletAddress();
  }, [sourceWallet.wallet?.walletAddress, sourceWallet.wallet?.walletName, sourceWallet.wallet?.chainId]);

  async function checkTargetWalletAddress() {
    if (targetWallet.wallet?.walletAddress && targetWallet.wallet?.walletName && targetWallet.wallet?.chainId) {
      // check if the wallet address is compatable with the chain id in case the chain id is changed before walletAddress
      const isWalletAddressCompatableWithChain = await checkIfWalletAddressIsCompatibleWithChain(
        targetWallet.wallet.walletAddress,
        targetWallet.wallet.chainId,
      );

      if (isWalletAddressCompatableWithChain) {
        setWalletCache({
          name: targetWallet.wallet.walletName,
          address: targetWallet.wallet.walletAddress,
          chainId: targetWallet.wallet.chainId,
          nickname: '',
        });

        globalStore.update((store) => {
          store.walletDropdownTargetAddress = targetWallet.wallet?.walletAddress;
        });
      }
    }
  }

  useEffect(() => {
    checkTargetWalletAddress();
  }, [targetWallet.wallet?.walletAddress, targetWallet.wallet?.walletName, targetWallet.wallet?.chainId]);
}
