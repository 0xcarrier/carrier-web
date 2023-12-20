import { notification } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { errorChainNotSupported } from '../context/Wallet/helpers/ethereum';
import {
  AbstractWallet,
  ApproveNFTData,
  ApproveTokenData,
  AttestData,
  ConnectedWallet,
  RedeemData,
  RedeemTBTCData,
  RedeemUSDCData,
  RegisterData,
  SignTransactionResult,
  TransactionResult,
  TransferNativeByMRLData,
  TransferNativeData,
  TransferNFTData,
  TransferTBTCData,
  TransferTokenByMRLData,
  TransferTokenData,
  TransferUSDCData,
  WalletState,
} from '../context/Wallet/types';
import { useWalletAdapter } from '../context/Wallet/WalletProvider';
import { ActionResult, useAction } from './useAction';
import {
  cacheSourceChainIdToLocal,
  cacheSourceWalletNameToLocal,
  cacheTargetChainIdToLocal,
  cacheTargetWalletNameAndAddressToLocal,
  getChainCache,
} from '../utils/chainCache';
import { TargetWallet } from './useTargetWallet';
import { setAppTouchedByUser } from '../store/dispatcher';
import parseError from '../utils/parseError';
import { CarrierChainId } from '../utils/consts';
import { checkIfWalletAddressIsCompatibleWithChain, isCarrierEVMChain, isCarrierPolkaChain } from '../utils/web3Utils';
import { CHAIN_ID_SOLANA } from '@certusone/wormhole-sdk';

export const errorIncorrectChain = new Error('wallet is connected to the incorrect chain');
export const errorIncorrectWallet = new Error('connected is not the expected wallet');

export type CurrentWalletTransactionResult = ActionResult<TransactionResult>;
export type CurrentWalletSignTransactionResult = ActionResult<SignTransactionResult>;

export interface CurrentWallet
  extends Omit<
    ConnectedWallet,
    | 'sendTransaction'
    | 'signTransaction'
    | 'transferNative'
    | 'transferToken'
    | 'transferNFT'
    | 'transferUSDC'
    | 'transferTBTC'
    | 'transferNativeByMRL'
    | 'transferTokenByMRL'
    | 'redeemNative'
    | 'redeemToken'
    | 'redeemNFT'
    | 'redeemUSDC'
    | 'redeemTBTC'
    | 'redeemTokenByMRL'
    | 'attestToken'
    | 'registerToken'
    | 'approveToken'
    | 'approveNFT'
  > {
  sendTransaction: (...args: any[]) => void;
  signTransaction: (...args: any[]) => void;
  transferNative: (options: TransferNativeData) => void;
  transferToken: (options: TransferTokenData) => void;
  transferNFT: (options: TransferNFTData) => void;
  transferUSDC: (options: TransferUSDCData) => void;
  transferTBTC: (options: TransferTBTCData) => void;
  transferNativeByMRL: (options: TransferNativeByMRLData) => void;
  transferTokenByMRL: (options: TransferTokenByMRLData) => void;
  redeemNative: (options: RedeemData) => void;
  redeemToken: (options: RedeemData) => void;
  redeemNFT: (options: RedeemData) => void;
  redeemUSDC: (options: RedeemUSDCData) => void;
  redeemTBTC: (options: RedeemTBTCData) => void;
  redeemTokenByMRL: (options: RedeemTBTCData) => void;
  attestToken: (options: AttestData) => void;
  registerToken: (options: RegisterData) => void;
  approveToken: (options: ApproveTokenData) => void;
  approveNFT: (options: ApproveNFTData) => void;
  sendTransactionResult: ActionResult<TransactionResult>;
  signTransactionResult: ActionResult<SignTransactionResult>;
  transferNativeResult: ActionResult<TransactionResult>;
  transferTokenResult: ActionResult<TransactionResult>;
  transferNFTResult: ActionResult<TransactionResult>;
  transferUSDCResult: ActionResult<TransactionResult>;
  transferTBTCResult: ActionResult<TransactionResult>;
  transferNativeByMRLResult: ActionResult<TransactionResult>;
  transferTokenByMRLResult: ActionResult<TransactionResult>;
  redeemNativeResult: ActionResult<TransactionResult>;
  redeemTokenResult: ActionResult<TransactionResult>;
  redeemNFTResult: ActionResult<TransactionResult>;
  redeemUSDCResult: ActionResult<TransactionResult>;
  redeemTBTCResult: ActionResult<TransactionResult>;
  redeemTokenByMRLResult: ActionResult<TransactionResult>;
  attestTokenResult: ActionResult<TransactionResult>;
  registerTokenResult: ActionResult<TransactionResult>;
  approveTokenResult: ActionResult<TransactionResult>;
  approveNFTResult: ActionResult<TransactionResult>;
  clearSendTransactionResult: () => void;
  clearSignTransactionResult: () => void;
  clearTransferNativeResult: () => void;
  clearTransferTokenResult: () => void;
  clearTransferNFTResult: () => void;
  clearTransferUSDCResult: () => void;
  clearTransferTBTCResult: () => void;
  clearTransferNativeByMRLResult: () => void;
  clearTransferTokenByMRLResult: () => void;
  clearRedeemNativeResult: () => void;
  clearRedeemTokenResult: () => void;
  clearRedeemNFTResult: () => void;
  clearRedeemUSDCResult: () => void;
  clearRedeemTBTCResult: () => void;
  clearRedeemTokenByMRLResult: () => void;
  clearAttestTokenResult: () => void;
  clearRegisterTokenResult: () => void;
  clearApproveTokenResult: () => void;
  clearApproveNFTResult: () => void;
}

export interface Wallet {
  connect: (options: {
    chainId: CarrierChainId;
    walletName: string;
    silence?: boolean;
    selectedAccount?: string;
  }) => void;
  disconnect: (options: { chainId: CarrierChainId; walletName: string }) => void;
  getAccountList: (options: { chainId: CarrierChainId; walletName: string }) => Promise<string[] | undefined>;
  state: WalletState;
  error: Error | undefined;
  wallet: CurrentWallet | undefined;
  expectedChainId: CarrierChainId | undefined;
  expectedWalletName: string | undefined;
}

// this hook is used to create a new wallet instance
// DO NOT use useWalletAdapter directly
// because we have some extra check on this hook and we can have many different wallet on different chain at the same time
// you can see useWallet as an instance of useWalletAdapter
// every time you use useWallet to create a new wallet, you need to connect it
// the wallet property on useWalletAdapter hook represent the currently connected wallet extension, not a wallet instance
// * expectedChainId: it's used for marking the expected chain ID. It will change immediately, before the actual wallet is connected and the wallet address is received. So if you wish to get the wallet address and chain ID at the same time, use wallet.chainId and wallet.walletAddress instead.
export function useWallet(): Wallet {
  const [expectedChainId, setExpectedChainId] = useState<CarrierChainId>();
  const [expectedWalletName, setExpectedWalletName] = useState<string>();
  const [connected, setConnected] = useState(false);
  const [currentWalletCache, setCurrentWalletCache] = useState<ConnectedWallet>();
  const [needToWaitCacheRefresh, setNeedToWaitCacheRefresh] = useState(false);

  const { connect, disconnect, getAccountList, connectedWallet, state, error } = useWalletAdapter();

  const sendTransaction = useCallback(generateActionWithAutoErrorHandler(connectedWallet?.sendTransaction), [
    connectedWallet?.sendTransaction,
  ]);
  const {
    triggerer: _sendTransaction,
    data: sendTransactionResult,
    clearResult: clearSendTransactionResult,
  } = useAction(sendTransaction);
  const signTransaction = useCallback(generateActionWithAutoErrorHandler(connectedWallet?.signTransaction), [
    connectedWallet?.signTransaction,
  ]);
  const {
    triggerer: _signTransaction,
    data: signTransactionResult,
    clearResult: clearSignTransactionResult,
  } = useAction(signTransaction);
  const transferNative = useCallback(generateActionWithAutoErrorHandler(connectedWallet?.transferNative), [
    connectedWallet?.transferNative,
  ]);
  const {
    triggerer: _transferNative,
    data: transferNativeResult,
    clearResult: clearTransferNativeResult,
  } = useAction(transferNative);
  const transferToken = useCallback(generateActionWithAutoErrorHandler(connectedWallet?.transferToken), [
    connectedWallet?.transferToken,
  ]);
  const {
    triggerer: _transferToken,
    data: transferTokenResult,
    clearResult: clearTransferTokenResult,
  } = useAction(transferToken);
  const transferNFT = useCallback(generateActionWithAutoErrorHandler(connectedWallet?.transferNFT), [
    connectedWallet?.transferNFT,
  ]);
  const {
    triggerer: _transferNFT,
    data: transferNFTResult,
    clearResult: clearTransferNFTResult,
  } = useAction(transferNFT);
  const transferUSDC = useCallback(generateActionWithAutoErrorHandler(connectedWallet?.transferUSDC), [
    connectedWallet?.transferUSDC,
  ]);
  const {
    triggerer: _transferUSDC,
    data: transferUSDCResult,
    clearResult: clearTransferUSDCResult,
  } = useAction(transferUSDC);
  const transferTBTC = useCallback(generateActionWithAutoErrorHandler(connectedWallet?.transferTBTC), [
    connectedWallet?.transferTBTC,
  ]);
  const {
    triggerer: _transferTBTC,
    data: transferTBTCResult,
    clearResult: clearTransferTBTCResult,
  } = useAction(transferTBTC);
  const transferNativeByMRL = useCallback(generateActionWithAutoErrorHandler(connectedWallet?.transferNativeByMRL), [
    connectedWallet?.transferNativeByMRL,
  ]);
  const {
    triggerer: _transferNativeByMRL,
    data: transferNativeByMRLResult,
    clearResult: clearTransferNativeByMRLResult,
  } = useAction(transferNativeByMRL);
  const transferTokenByMRL = useCallback(generateActionWithAutoErrorHandler(connectedWallet?.transferTokenByMRL), [
    connectedWallet?.transferTokenByMRL,
  ]);
  const {
    triggerer: _transferTokenByMRL,
    data: transferTokenByMRLResult,
    clearResult: clearTransferTokenByMRLResult,
  } = useAction(transferTokenByMRL);
  const redeemNative = useCallback(generateActionWithAutoErrorHandler(connectedWallet?.redeemNative), [
    connectedWallet?.redeemNative,
  ]);
  const {
    triggerer: _redeemNative,
    data: redeemNativeResult,
    clearResult: clearRedeemNativeResult,
  } = useAction(redeemNative);
  const redeemToken = useCallback(generateActionWithAutoErrorHandler(connectedWallet?.redeemToken), [
    connectedWallet?.redeemToken,
  ]);
  const {
    triggerer: _redeemToken,
    data: redeemTokenResult,
    clearResult: clearRedeemTokenResult,
  } = useAction(redeemToken);
  const redeemNFT = useCallback(generateActionWithAutoErrorHandler(connectedWallet?.redeemNFT), [
    connectedWallet?.redeemNFT,
  ]);
  const { triggerer: _redeemNFT, data: redeemNFTResult, clearResult: clearRedeemNFTResult } = useAction(redeemNFT);
  const redeemUSDC = useCallback(generateActionWithAutoErrorHandler(connectedWallet?.redeemUSDC), [
    connectedWallet?.redeemUSDC,
  ]);
  const { triggerer: _redeemUSDC, data: redeemUSDCResult, clearResult: clearRedeemUSDCResult } = useAction(redeemUSDC);
  const redeemTBTC = useCallback(generateActionWithAutoErrorHandler(connectedWallet?.redeemTBTC), [
    connectedWallet?.redeemTBTC,
  ]);
  const { triggerer: _redeemTBTC, data: redeemTBTCResult, clearResult: clearRedeemTBTCResult } = useAction(redeemTBTC);
  const redeemTokenByMRL = useCallback(generateActionWithAutoErrorHandler(connectedWallet?.redeemTokenByMRL), [
    connectedWallet?.redeemTokenByMRL,
  ]);
  const {
    triggerer: _redeemTokenByMRL,
    data: redeemTokenByMRLResult,
    clearResult: clearRedeemTokenByMRLResult,
  } = useAction(redeemTokenByMRL);
  const attestToken = useCallback(generateActionWithAutoErrorHandler(connectedWallet?.attestToken), [
    connectedWallet?.attestToken,
  ]);
  const {
    triggerer: _attestToken,
    data: attestTokenResult,
    clearResult: clearAttestTokenResult,
  } = useAction(attestToken);
  const registerToken = useCallback(generateActionWithAutoErrorHandler(connectedWallet?.registerToken), [
    connectedWallet?.registerToken,
  ]);
  const {
    triggerer: _registerToken,
    data: registerTokenResult,
    clearResult: clearRegisterTokenResult,
  } = useAction(registerToken);
  const approveToken = useCallback(generateActionWithAutoErrorHandler(connectedWallet?.approveToken), [
    connectedWallet?.approveToken,
  ]);
  const {
    triggerer: _approveToken,
    data: approveTokenResult,
    clearResult: clearApproveTokenResult,
  } = useAction(approveToken);
  const approveNFT = useCallback(generateActionWithAutoErrorHandler(connectedWallet?.approveNFT), [
    connectedWallet?.approveNFT,
  ]);
  const { triggerer: _approveNFT, data: approveNFTResult, clearResult: clearApproveNFTResult } = useAction(approveNFT);

  const connectWallet = useCallback(
    (options: { chainId: CarrierChainId; walletName: string; silence?: boolean; selectedAccount?: string }) => {
      const { chainId, walletName, silence, selectedAccount } = options;

      connect({ chainId, walletName, silence, selectedAccount });

      setNeedToWaitCacheRefresh(true);

      setExpectedChainId(chainId);

      setExpectedWalletName(walletName);

      setConnected(true);
    },
    [connect, setExpectedChainId, setExpectedWalletName, setConnected, setNeedToWaitCacheRefresh],
  );

  const disconnectWallet = useCallback(
    (options: { chainId: CarrierChainId; walletName: string }) => {
      const { chainId, walletName } = options;

      // we don't do disconnect for the wallet extension
      // we just do fake disconnect for the current wallet
      // otherwise when we disconnect the wallet extension, it will effect other wallet instances
      // disconnect({ chainId, walletName });

      setCurrentWalletCache(undefined);

      setExpectedChainId(undefined);

      setExpectedWalletName(undefined);

      setConnected(false);
    },
    [disconnect, setExpectedChainId, setExpectedWalletName, setConnected],
  );

  useEffect(() => {
    if (connected) {
      const isEvmExpectedChain =
        connectedWallet != null &&
        expectedChainId != null &&
        isCarrierEVMChain(expectedChainId) &&
        connectedWallet.availableChainIds.includes(expectedChainId);
      const isParachainExpectedChain =
        connectedWallet != null &&
        expectedChainId != null &&
        isCarrierPolkaChain(expectedChainId) &&
        connectedWallet.chainId === expectedChainId;
      const isSolanaExpectedChain =
        connectedWallet != null &&
        expectedChainId != null &&
        expectedChainId === CHAIN_ID_SOLANA &&
        connectedWallet.chainId === expectedChainId;
      const canCache =
        connectedWallet != null &&
        expectedWalletName != null &&
        connectedWallet.walletName === expectedWalletName &&
        (isEvmExpectedChain || isParachainExpectedChain || isSolanaExpectedChain);

      // console.log('currentWallet0', canCache, connectedWallet, expectedChainId, expectedWalletName);

      if (canCache) {
        setCurrentWalletCache(connectedWallet);
        setNeedToWaitCacheRefresh(false);
      }
    } else {
      // console.log('currentWallet1');
      setCurrentWalletCache(undefined);
      setNeedToWaitCacheRefresh(false);
    }
  }, [
    connectedWallet,
    connected,
    expectedWalletName,
    expectedChainId,
    setCurrentWalletCache,
    setNeedToWaitCacheRefresh,
  ]);

  const currentWalletError = useMemo(() => {
    const incorrectChainError =
      error === errorChainNotSupported || (connectedWallet ? connectedWallet.chainId !== expectedChainId : undefined);
    const incorrectWalletError = connectedWallet ? connectedWallet.walletName !== expectedWalletName : undefined;

    return connected
      ? (incorrectChainError ? errorIncorrectChain : undefined) ||
          (incorrectWalletError ? errorIncorrectWallet : undefined) ||
          error
      : undefined;
  }, [connected, expectedChainId, expectedWalletName, connectedWallet, error]);

  const currentWallet = useMemo((): CurrentWallet | undefined => {
    // console.log(
    //   'currentWallet2',
    //   needToWaitCacheRefresh,
    //   currentWalletCache?.walletName,
    //   currentWalletCache?.chainId,
    //   currentWalletCache?.walletAddress,
    //   expectedWalletName,
    //   expectedChainId,
    // );

    if (currentWalletCache) {
      if (
        expectedChainId &&
        expectedWalletName &&
        ((connectedWallet &&
          (connectedWallet.chainId !== expectedChainId || connectedWallet.chainId !== currentWalletCache.chainId)) ||
          error === errorChainNotSupported) &&
        !needToWaitCacheRefresh
      ) {
        // console.log(
        //   'currentWallet3',
        //   needToWaitCacheRefresh,
        //   currentWalletCache?.walletName,
        //   currentWalletCache?.chainId,
        //   expectedWalletName,
        //   expectedChainId,
        // );
        return restoreCurrentWalletWithError({
          connectedWallet: currentWalletCache,
          error: errorIncorrectChain,
          expectedChainId,
          expectedWalletName,
        });
      } else if (
        expectedChainId &&
        expectedWalletName &&
        connectedWallet &&
        (connectedWallet.walletName !== expectedWalletName ||
          connectedWallet.walletName !== currentWalletCache.walletName) &&
        !needToWaitCacheRefresh
      ) {
        // console.log(
        //   'currentWallet4',
        //   needToWaitCacheRefresh,
        //   currentWalletCache?.walletName,
        //   currentWalletCache?.chainId,
        //   expectedWalletName,
        //   expectedChainId,
        // );
        return restoreCurrentWalletWithError({
          connectedWallet: currentWalletCache,
          error: errorIncorrectWallet,
          expectedChainId,
          expectedWalletName,
        });
      } else {
        const {
          sendTransaction,
          signTransaction,
          transferNative,
          transferToken,
          transferNFT,
          redeemNative,
          redeemToken,
          redeemNFT,
          attestToken,
          registerToken,
          approveToken,
          ...rest
        } = currentWalletCache;
        // console.log(
        //   'currentWallet5',
        //   needToWaitCacheRefresh,
        //   currentWalletCache?.walletName,
        //   currentWalletCache?.chainId,
        //   expectedWalletName,
        //   expectedChainId,
        // );
        return {
          ...rest,
          sendTransaction: _sendTransaction,
          signTransaction: _signTransaction,
          transferNative: _transferNative,
          transferToken: _transferToken,
          transferNFT: _transferNFT,
          transferUSDC: _transferUSDC,
          transferTBTC: _transferTBTC,
          transferNativeByMRL: _transferNativeByMRL,
          transferTokenByMRL: _transferTokenByMRL,
          redeemNative: _redeemNative,
          redeemToken: _redeemToken,
          redeemNFT: _redeemNFT,
          redeemUSDC: _redeemUSDC,
          redeemTBTC: _redeemTBTC,
          redeemTokenByMRL: _redeemTokenByMRL,
          attestToken: _attestToken,
          registerToken: _registerToken,
          approveToken: _approveToken,
          approveNFT: _approveNFT,
          sendTransactionResult,
          signTransactionResult,
          transferNativeResult,
          transferTokenResult,
          transferNFTResult,
          transferUSDCResult,
          transferTBTCResult,
          transferNativeByMRLResult,
          transferTokenByMRLResult,
          redeemNativeResult,
          redeemTokenResult,
          redeemNFTResult,
          redeemUSDCResult,
          redeemTBTCResult,
          redeemTokenByMRLResult,
          attestTokenResult,
          registerTokenResult,
          approveTokenResult,
          approveNFTResult,
          clearSendTransactionResult,
          clearSignTransactionResult,
          clearTransferNativeResult,
          clearTransferTokenResult,
          clearTransferNFTResult,
          clearTransferUSDCResult,
          clearTransferTBTCResult,
          clearTransferNativeByMRLResult,
          clearTransferTokenByMRLResult,
          clearRedeemNativeResult,
          clearRedeemTokenResult,
          clearRedeemNFTResult,
          clearRedeemUSDCResult,
          clearRedeemTBTCResult,
          clearRedeemTokenByMRLResult,
          clearAttestTokenResult,
          clearRegisterTokenResult,
          clearApproveTokenResult,
          clearApproveNFTResult,
        };
      }
    } else {
      return undefined;
    }
  }, [
    needToWaitCacheRefresh,
    error,
    connectedWallet,
    currentWalletCache,
    expectedChainId,
    expectedWalletName,
    _sendTransaction,
    _signTransaction,
    _transferNative,
    _transferToken,
    _transferNFT,
    _transferUSDC,
    _transferTBTC,
    _transferNativeByMRL,
    _transferTokenByMRL,
    _redeemNative,
    _redeemToken,
    _redeemNFT,
    _redeemUSDC,
    _redeemTBTC,
    _redeemTokenByMRL,
    _attestToken,
    _registerToken,
    _approveToken,
    _approveNFT,
    sendTransactionResult,
    signTransactionResult,
    transferNativeResult,
    transferTokenResult,
    transferNFTResult,
    transferUSDCResult,
    transferTBTCResult,
    transferNativeByMRLResult,
    transferTokenByMRLResult,
    redeemNativeResult,
    redeemTokenResult,
    redeemNFTResult,
    redeemUSDCResult,
    redeemTBTCResult,
    redeemTokenByMRLResult,
    attestTokenResult,
    registerTokenResult,
    approveTokenResult,
    approveNFTResult,
    clearSendTransactionResult,
    clearSignTransactionResult,
    clearTransferNativeResult,
    clearTransferTokenResult,
    clearTransferNFTResult,
    clearTransferUSDCResult,
    clearTransferTBTCResult,
    clearTransferNativeByMRLResult,
    clearTransferTokenByMRLResult,
    clearRedeemNativeResult,
    clearRedeemTokenResult,
    clearRedeemNFTResult,
    clearRedeemUSDCResult,
    clearRedeemTBTCResult,
    clearRedeemTokenByMRLResult,
    clearAttestTokenResult,
    clearRegisterTokenResult,
    clearApproveTokenResult,
    clearApproveNFTResult,
  ]);

  const currentWalletState = useMemo(() => {
    return !connected ? WalletState.DISCONNECTED : state;
  }, [connected, state]);

  return useMemo(() => {
    const obj = {
      connect: connectWallet,
      disconnect: disconnectWallet,
      getAccountList,
      state: currentWalletState,
      error: currentWalletError,
      wallet: currentWallet,
      expectedChainId,
      expectedWalletName,
    };

    return obj;
  }, [
    connectWallet,
    disconnectWallet,
    getAccountList,
    currentWalletState,
    currentWalletError,
    currentWallet,
    expectedChainId,
    expectedWalletName,
  ]);
}

function restoreCurrentWalletWithError(options: {
  connectedWallet: ConnectedWallet;
  error: Error;
  expectedChainId: CarrierChainId;
  expectedWalletName: string;
}): CurrentWallet {
  const { connectedWallet, error, expectedChainId, expectedWalletName } = options;
  const { walletAddress, icon, availableChainIds } = connectedWallet;

  async function throwError(): Promise<any> {
    throw error;
  }

  const fakeResult = { loading: false, error: undefined, data: undefined };

  return {
    walletAddress,
    icon,
    availableChainIds,
    chainId: expectedChainId,
    walletName: expectedWalletName,
    sendTransactionResult: fakeResult,
    signTransactionResult: fakeResult,
    transferNativeResult: fakeResult,
    transferTokenResult: fakeResult,
    transferNFTResult: fakeResult,
    transferUSDCResult: fakeResult,
    transferTBTCResult: fakeResult,
    transferNativeByMRLResult: fakeResult,
    transferTokenByMRLResult: fakeResult,
    redeemNativeResult: fakeResult,
    redeemTokenResult: fakeResult,
    redeemNFTResult: fakeResult,
    redeemUSDCResult: fakeResult,
    redeemTBTCResult: fakeResult,
    redeemTokenByMRLResult: fakeResult,
    attestTokenResult: fakeResult,
    registerTokenResult: fakeResult,
    approveTokenResult: fakeResult,
    approveNFTResult: fakeResult,
    sendTransaction: throwError,
    signTransaction: throwError,
    transferNative: throwError,
    transferToken: throwError,
    transferNFT: throwError,
    transferUSDC: throwError,
    transferTBTC: throwError,
    transferNativeByMRL: throwError,
    transferTokenByMRL: throwError,
    redeemNative: throwError,
    redeemToken: throwError,
    redeemNFT: throwError,
    redeemUSDC: throwError,
    redeemTBTC: throwError,
    redeemTokenByMRL: throwError,
    attestToken: throwError,
    registerToken: throwError,
    approveToken: throwError,
    getTokenAllowance: throwError,
    approveNFT: throwError,
    getNFTApproved: throwError,
    clearSendTransactionResult: throwError,
    clearSignTransactionResult: throwError,
    clearTransferNativeResult: throwError,
    clearTransferTokenResult: throwError,
    clearTransferNFTResult: throwError,
    clearTransferUSDCResult: throwError,
    clearTransferTBTCResult: throwError,
    clearTransferNativeByMRLResult: throwError,
    clearTransferTokenByMRLResult: throwError,
    clearRedeemNativeResult: throwError,
    clearRedeemTokenResult: throwError,
    clearRedeemNFTResult: throwError,
    clearRedeemUSDCResult: throwError,
    clearRedeemTBTCResult: throwError,
    clearRedeemTokenByMRLResult: throwError,
    clearAttestTokenResult: throwError,
    clearRegisterTokenResult: throwError,
    clearApproveTokenResult: throwError,
    clearApproveNFTResult: throwError,
  };
}

function generateActionWithAutoErrorHandler<P, R>(
  handler: ((...args: P[]) => Promise<R>) | undefined,
): (...args: P[]) => Promise<R | undefined> {
  return async (...args: P[]) => {
    if (handler) {
      try {
        const data = await handler(...args);

        return data;
      } catch (e) {
        notification.error({
          message: parseError(e),
        });

        throw e;
      }
    }
  };
}

export function swapChain(options: {
  wallets: AbstractWallet[];
  sourceChainId: CarrierChainId;
  currentSourceWallet: Wallet;
  targetChainId: CarrierChainId;
  currentTargetWallet: TargetWallet;
  setSourceChainId: React.Dispatch<React.SetStateAction<CarrierChainId>>;
  setTargetChainId: React.Dispatch<React.SetStateAction<CarrierChainId>>;
}) {
  const {
    wallets,
    sourceChainId,
    currentSourceWallet,
    targetChainId,
    currentTargetWallet,
    setSourceChainId,
    setTargetChainId,
  } = options;

  selectTargetChain({ targetChainId, currentSourceWallet, currentTargetWallet, setTargetChainId });

  selectSourceChain({
    wallets,
    sourceChainId,
    currentSourceWallet,
    currentTargetWallet,
    setSourceChainId,
  });
}

export function selectSourceChain(options: {
  wallets: AbstractWallet[];
  sourceChainId: CarrierChainId;
  currentSourceWallet: Wallet;
  currentTargetWallet?: TargetWallet;
  setSourceChainId: React.Dispatch<React.SetStateAction<CarrierChainId>>;
}) {
  const { wallets, sourceChainId, currentSourceWallet, currentTargetWallet, setSourceChainId } = options;

  if (currentSourceWallet.wallet) {
    const chainAndWalletCache = getChainCache();
    const currentTargetWalletName = currentTargetWallet ? currentTargetWallet.wallet?.walletName : undefined;
    const previousConnectedSourceWalletName = chainAndWalletCache.previousConnectedSourceWalletName
      ? chainAndWalletCache.previousConnectedSourceWalletName[sourceChainId]
      : undefined;
    const currentWalletCache = wallets.find((item) => {
      return item.walletName === currentTargetWalletName && item.availableChainIds.includes(sourceChainId);
    });
    const previousConnectedSourceWallet = wallets.find((item) => {
      return item.walletName === previousConnectedSourceWalletName && item.availableChainIds.includes(sourceChainId);
    });
    const walletName = currentSourceWallet.wallet.availableChainIds.includes(sourceChainId)
      ? currentSourceWallet.expectedWalletName
      : currentTargetWalletName
      ? currentWalletCache?.walletName
      : previousConnectedSourceWalletName
      ? previousConnectedSourceWallet?.walletName
      : undefined;
    const previousConnectedSourceWalletAddress = chainAndWalletCache.previousConnectedSourceWalletAddress
      ? chainAndWalletCache.previousConnectedSourceWalletAddress[sourceChainId]
      : undefined;

    if (walletName) {
      currentSourceWallet.connect({
        chainId: sourceChainId,
        walletName: walletName,
        selectedAccount: previousConnectedSourceWalletAddress,
      });

      cacheSourceWalletNameToLocal(sourceChainId, walletName, previousConnectedSourceWalletAddress);
    } else {
      currentSourceWallet.disconnect({
        chainId: currentSourceWallet.wallet.chainId,
        walletName: currentSourceWallet.wallet.walletName,
      });
    }
  }

  setSourceChainId(sourceChainId);
  cacheSourceChainIdToLocal(sourceChainId);
  setAppTouchedByUser();
}

export async function selectTargetChain(options: {
  targetChainId: CarrierChainId;
  currentSourceWallet: Wallet;
  currentTargetWallet: TargetWallet;
  setTargetChainId: React.Dispatch<React.SetStateAction<CarrierChainId>>;
}) {
  const { targetChainId, currentSourceWallet, currentTargetWallet, setTargetChainId } = options;

  if (currentTargetWallet.wallet) {
    const chainAndWalletCache = getChainCache();
    const previousConnectedTargetWallet = chainAndWalletCache.previousConnectedTargetWallet
      ? chainAndWalletCache.previousConnectedTargetWallet[targetChainId]
      : undefined;

    const targetWallet =
      isCarrierEVMChain(targetChainId) && isCarrierEVMChain(currentTargetWallet.wallet.chainId)
        ? currentTargetWallet.wallet
        : currentSourceWallet.wallet?.availableChainIds.includes(targetChainId) &&
          (await checkIfWalletAddressIsCompatibleWithChain(currentSourceWallet.wallet.walletAddress, targetChainId))
        ? { walletName: currentSourceWallet.wallet.walletName, walletAddress: currentSourceWallet.wallet.walletAddress }
        : previousConnectedTargetWallet;

    if (targetWallet) {
      currentTargetWallet.connect({
        chainId: targetChainId,
        walletName: targetWallet.walletName,
        walletAddress: targetWallet.walletAddress,
      });

      if (targetWallet.walletName) {
        cacheTargetWalletNameAndAddressToLocal(targetChainId, targetWallet.walletName, targetWallet.walletAddress);
      }
    } else {
      currentTargetWallet.disconnect();
    }
  }

  setTargetChainId(targetChainId);
  cacheTargetChainIdToLocal(targetChainId);
  setAppTouchedByUser();
}
