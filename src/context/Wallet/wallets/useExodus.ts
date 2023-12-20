import { useCallback, useEffect, useMemo, useState } from 'react';

import { CHAIN_ID_SOLANA } from '@certusone/wormhole-sdk';
import { WalletReadyState } from '@solana/wallet-adapter-base';
import { useWallet } from '@solana/wallet-adapter-react';
import { ExodusWalletName } from '@solana/wallet-adapter-wallets';
import { Transaction } from '@solana/web3.js';

import SVGExodusLogo from '../../../assets/svgs/wallet-logos/exodus.svg';
import { getSolanaConnection } from '../../../utils/solana';
import {
  approveSolToken,
  attestSol,
  getDelegateAmount,
  getSolNFTApproved,
  redeemSolNFT,
  redeemSolNative,
  redeemSolTbtc,
  redeemSolToken,
  registerSol,
  sendSolTransaction,
  signSolTransaction,
  transferSolNFT,
  transferSolNative,
  transferSolTbtc,
  transferSolToken,
  transferSolTokenByMRL,
} from '../helpers/solana/solana';
import {
  ApproveNFTData,
  ApproveTokenData,
  AttestData,
  GetAllowanceData,
  GetNFTApprovedData,
  RedeemData,
  RedeemTBTCData,
  RedeemUSDCData,
  RegisterData,
  TransferNFTData,
  TransferNativeByMRLData,
  TransferNativeData,
  TransferTBTCData,
  TransferTokenByMRLData,
  TransferTokenData,
  TransferUSDCData,
  WalletInterface,
  WalletState,
} from '../types';
import { ethers } from 'ethers';

export function useExodus(): WalletInterface {
  const {
    select,
    connect: _connect,
    disconnect: _disconnect,
    wallets,
    publicKey,
    signTransaction,
    signAllTransactions,
  } = useWallet();

  const [needToConnect, setNeedToConnect] = useState(false);

  const [state, setState] = useState<WalletState>(WalletState.DISCONNECTED);
  const [error, setError] = useState<Error>();

  const connection = useMemo(() => {
    return getSolanaConnection();
  }, []);

  const wallet = useMemo(() => {
    return wallets.find((item) => item.adapter.name === ExodusWalletName);
  }, [wallets]);

  useEffect(() => {
    let cancelled = false;

    async function invokeConnect(cancelled: boolean) {
      if (
        needToConnect &&
        wallet &&
        (wallet.readyState === WalletReadyState.Installed || wallet.readyState === WalletReadyState.Loadable)
      ) {
        if (!wallet.adapter.connected) {
          try {
            await _connect();

            if (!cancelled) {
              setState(WalletState.CONNECTED);
              setError(undefined);
            }
          } catch (e: any) {
            if (!cancelled) {
              setState(WalletState.DISCONNECTED);
              setError(e instanceof Error ? e : new Error(e));
            }
          } finally {
            !cancelled && setNeedToConnect(false);
          }
        } else {
          if (!cancelled) {
            setState(WalletState.CONNECTED);
            setNeedToConnect(false);
            setError(undefined);
          }
        }
      }
    }

    invokeConnect(cancelled);

    return () => {
      cancelled = true;
    };
  }, [_connect, needToConnect, wallet]);

  const isInstalled = useCallback(
    async () => wallet?.readyState === WalletReadyState.Loadable || wallet?.readyState === WalletReadyState.Installed,
    [wallet?.readyState],
  );

  const install = useCallback(async () => {
    window.open(wallet?.adapter.url, '_blank');

    return Promise.resolve();
  }, [wallet?.adapter.url]);

  const connect = useCallback(async () => {
    setState(WalletState.CONNECTING);
    select(ExodusWalletName);
    setNeedToConnect(true);
  }, [select]);

  const disconnect = useCallback(async () => {
    setState(WalletState.DISCONNECTING);

    await _disconnect();

    setError(undefined);
    setState(WalletState.DISCONNECTED);
  }, [setState, _disconnect, setError]);

  const sendTransaction = useCallback(
    async (transaction: Transaction) => {
      return sendSolTransaction({
        connection,
        publicKey,
        transaction,
        signTransaction,
      });
    },
    [connection, publicKey, signTransaction],
  );

  const _signTransaction = useCallback(
    async (transaction: Transaction) => {
      return signSolTransaction({
        connection,
        publicKey,
        transaction,
        signTransaction,
      });
    },
    [connection, publicKey, signTransaction],
  );

  const transferNative = useCallback(
    async (params: TransferNativeData) => {
      return transferSolNative({
        ...params,
        publicKey,
        signTransaction,
      });
    },
    [publicKey, signTransaction],
  );

  const transferToken = useCallback(
    async (params: TransferTokenData) => {
      return transferSolToken({
        ...params,
        publicKey,
        signTransaction,
      });
    },
    [publicKey, signTransaction],
  );

  const transferNFT = useCallback(
    async (params: TransferNFTData) => {
      return transferSolNFT({
        ...params,
        publicKey,
        signTransaction,
      });
    },
    [publicKey, signTransaction],
  );

  const transferUSDC = useCallback(
    async (params: TransferUSDCData) => {
      throw new Error('CCTP is not supported on solana');
    },
    [publicKey, signTransaction],
  );

  const transferTBTC = useCallback(
    async (params: TransferTBTCData) => {
      return transferSolTbtc({ ...params, publicKey, signTransaction });
    },
    [publicKey, signTransaction],
  );

  const transferNativeByMRL = useCallback(
    async (params: TransferNativeByMRLData) => {
      throw new Error('transfer native by MRL is not supported on solana');
    },
    [publicKey, signTransaction],
  );

  const transferTokenByMRL = useCallback(
    async (params: TransferTokenByMRLData) => {
      return transferSolTokenByMRL({ ...params, publicKey, signTransaction });
    },
    [publicKey, signTransaction],
  );

  const redeemNative = useCallback(
    async (params: RedeemData) => {
      return redeemSolNative({
        ...params,
        publicKey,
        signTransaction,
      });
    },
    [publicKey, signTransaction],
  );

  const redeemToken = useCallback(
    async (params: RedeemData) => {
      return redeemSolToken({
        ...params,
        publicKey,
        signTransaction,
      });
    },
    [publicKey, signTransaction],
  );

  const redeemNFT = useCallback(
    async (params: RedeemData) => {
      return redeemSolNFT({
        ...params,
        publicKey,
        signTransaction,
      });
    },
    [publicKey, signTransaction],
  );

  const redeemUSDC = useCallback(
    async (params: RedeemUSDCData) => {
      throw new Error('CCTP is not supported on solana');
    },
    [publicKey, signTransaction],
  );

  const redeemTBTC = useCallback(
    async (params: RedeemTBTCData) => {
      return redeemSolTbtc({ ...params, publicKey, signTransaction });
    },
    [publicKey, signTransaction],
  );

  const redeemTokenByMRL = useCallback(
    async (params: RedeemData) => {
      throw new Error('redeem token by MRL is not supported on solana');
    },
    [publicKey, signTransaction],
  );

  const attestToken = useCallback(
    async (params: AttestData) => {
      return attestSol({
        ...params,
        publicKey,
        signTransaction,
      });
    },
    [publicKey, signTransaction],
  );

  const registerToken = useCallback(
    async (params: RegisterData) => {
      return registerSol({
        ...params,
        publicKey,
        signTransaction,
      });
    },
    [publicKey, signTransaction],
  );

  const approveToken = useCallback(
    async (params: ApproveTokenData) => {
      return approveSolToken({
        ...params,
        signTransaction,
        publicKey,
      });
    },
    [signTransaction, publicKey],
  );

  const getTokenAllowance = useCallback(
    async (params: GetAllowanceData) => {
      return getDelegateAmount({
        ...params,
        publicKey,
      });
    },
    [publicKey],
  );

  const approveNFT = useCallback(
    async (params: ApproveNFTData) => {
      return approveSolToken({
        ...params,
        amount: ethers.BigNumber.from(1),
        signTransaction,
        publicKey,
      });
    },
    [signTransaction, publicKey],
  );

  const getNFTApproved = useCallback(
    async (params: GetNFTApprovedData) => {
      return getSolNFTApproved({ ...params, publicKey });
    },
    [publicKey],
  );

  return useMemo(
    () => ({
      walletName: ExodusWalletName,
      state,
      error,
      isInstalled,
      install,
      icon: SVGExodusLogo,
      availableChainIds: [CHAIN_ID_SOLANA],
      chainId: CHAIN_ID_SOLANA,
      walletAddress: wallet?.adapter.publicKey?.toBase58(),
      connect,
      disconnect,
      sendTransaction,
      signTransaction: _signTransaction,
      transferNative,
      transferToken,
      transferNFT,
      transferUSDC,
      transferTBTC,
      transferNativeByMRL,
      transferTokenByMRL,
      redeemNative,
      redeemToken,
      redeemNFT,
      redeemUSDC,
      redeemTBTC,
      redeemTokenByMRL,
      attestToken,
      registerToken,
      approveToken,
      getTokenAllowance,
      approveNFT,
      getNFTApproved,
    }),
    [
      wallet,
      state,
      error,
      _signTransaction,
      approveNFT,
      approveToken,
      attestToken,
      connect,
      disconnect,
      getNFTApproved,
      getTokenAllowance,
      install,
      isInstalled,
      redeemNFT,
      redeemNative,
      redeemToken,
      redeemUSDC,
      redeemTBTC,
      redeemTokenByMRL,
      registerToken,
      sendTransaction,
      transferNFT,
      transferNative,
      transferToken,
      transferUSDC,
      transferTBTC,
      transferNativeByMRL,
      transferTokenByMRL,
    ],
  );
}
