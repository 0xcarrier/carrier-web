import { CHAIN_ID_SOLANA } from '@certusone/wormhole-sdk/lib/esm';
import { useEffect, useMemo } from 'react';
import { DataResult, getPendingPromise, useData } from './useData';
import { PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { createAssociatedTokenAccountInstruction, getAssociatedTokenAddress } from '@solana/spl-token';
import { getSolanaConnection } from '../utils/solana';
import { useWallet, Wallet } from './useWallet';
import { TargetWallet } from './useTargetWallet';
import { errorNeedRetry, runWithErrorRetry } from '../utils/timer';
import { useTransactionStatus } from './useTransactionResult';
import { TransactionResult, TransactionStatus } from '../context/Wallet/types';
import { ActionResult, useAction } from './useAction';
import { TargetAsset } from './useTargetAsset';
import { getCluster } from '../utils/env';
import { CarrierChainId } from '../utils/consts';
import { getTBTCAddressForChain, getWtBTCAddressForChain } from '../utils/tbtc';
import { notification } from 'antd';
import parseError from '../utils/parseError';

const associatedAccountCacheKey = 'associatedAccountCacheKey';

interface AssociatedAccountCache {
  [walletAddress: string]: {
    [tokenAddress: string]: string;
  };
}

function getAssociatedAccountCache(): AssociatedAccountCache {
  const cluster = getCluster();
  const cache = localStorage.getItem(`${associatedAccountCacheKey}.${cluster}`);

  return cache ? JSON.parse(cache) : {};
}

function setAssociatedAccountCache(walletAddress: string, tokenAddress: string, associatedAccountAddress: string) {
  const cluster = getCluster();
  const cache = getAssociatedAccountCache();
  cache[walletAddress] = cache[walletAddress] || {};
  cache[walletAddress][tokenAddress] = associatedAccountAddress;

  localStorage.setItem(`${associatedAccountCacheKey}.${cluster}`, JSON.stringify(cache));
}

async function getAssociatedAccountAddress(options: { mintPublicKey: PublicKey; targetAddressSolPK: PublicKey }) {
  const { mintPublicKey, targetAddressSolPK } = options;
  const associatedAddress = await getAssociatedTokenAddress(mintPublicKey, targetAddressSolPK);

  return associatedAddress;
}

interface InnerAssociatedAccountData {
  isRequiredCreateAssociatedAccount: boolean;
  associatedAddress: string | undefined;
}

async function createAssociatedAccountHandler(options: {
  targetWallet: TargetWallet;
  wallet: Wallet;
  targetAssetData: DataResult<TargetAsset | undefined>;
  associatedAccountData: DataResult<InnerAssociatedAccountData | undefined>;
}) {
  const { targetWallet, wallet, targetAssetData, associatedAccountData } = options;

  if (
    targetWallet.wallet &&
    targetWallet.wallet.chainId === CHAIN_ID_SOLANA &&
    wallet.wallet &&
    targetAssetData &&
    targetAssetData.data &&
    targetAssetData.data.targetAddress &&
    associatedAccountData &&
    associatedAccountData.data &&
    associatedAccountData.data.isRequiredCreateAssociatedAccount
  ) {
    let instruction: TransactionInstruction | undefined = undefined;
    let wtbtcInstruction: TransactionInstruction | undefined = undefined;

    try {
      const connection = getSolanaConnection();
      const mintPublicKey = new PublicKey(targetAssetData.data.targetAddress);
      const targetAddressSolPK = new PublicKey(targetWallet.wallet.walletAddress);
      const associatedAddress = await getAssociatedAccountAddress({ mintPublicKey, targetAddressSolPK });
      const associatedAddressInfo = await connection.getAccountInfo(associatedAddress);

      if (!associatedAddressInfo) {
        instruction = createAssociatedTokenAccountInstruction(
          new PublicKey(wallet.wallet.walletAddress), // payer
          associatedAddress,
          targetAddressSolPK, // owner
          mintPublicKey,
        );
      }

      // create wtbc account when the user select tbtc, because redeem tbtc on sol needs to use the wtbtc account
      if (mintPublicKey.toBase58().toLowerCase() === getTBTCAddressForChain(CHAIN_ID_SOLANA).toLowerCase()) {
        const wtbtcMint = getWtBTCAddressForChain(CHAIN_ID_SOLANA);
        const wtbtcMintPublicKey = new PublicKey(wtbtcMint);
        const wtbtcAssociatedAccount = await getAssociatedAccountAddress({
          mintPublicKey: wtbtcMintPublicKey,
          targetAddressSolPK,
        });
        const wtbtcAssociatedAddressInfo = await connection.getAccountInfo(wtbtcAssociatedAccount);

        if (!wtbtcAssociatedAddressInfo) {
          wtbtcInstruction = createAssociatedTokenAccountInstruction(
            new PublicKey(wallet.wallet.walletAddress), // payer
            wtbtcAssociatedAccount,
            targetAddressSolPK, // owner
            wtbtcMintPublicKey,
          );
        }
      }
    } catch (e) {
      notification.error({
        message: parseError(e),
      });

      throw e;
    }

    const transaction = new Transaction();

    if (instruction != null) {
      transaction.add(instruction);
    }

    if (wtbtcInstruction != null) {
      transaction.add(wtbtcInstruction);
    }

    wallet.wallet.sendTransaction(transaction);
  }
}

async function getAssociatedAccountData(options: {
  signal: AbortSignal;
  retryTimes: number;
  targetAssetData: DataResult<TargetAsset | undefined>;
  targetChainId: CarrierChainId | undefined;
  targetWalletAddress: string | undefined;
  targetWalletSetExtraData: (extraData: any) => void;
}): Promise<InnerAssociatedAccountData | undefined> {
  const { signal, retryTimes, targetAssetData, targetChainId, targetWalletAddress, targetWalletSetExtraData } = options;

  if (targetAssetData.error) {
    throw targetAssetData.error;
  }

  if (targetAssetData.loading) {
    return getPendingPromise(signal);
  }

  let isRequiredCreateAssociatedAccount = false;
  let associatedAddress = undefined;

  if (
    targetAssetData.data &&
    targetAssetData.data.targetChainId === CHAIN_ID_SOLANA &&
    targetAssetData.data.targetAddress &&
    targetChainId === CHAIN_ID_SOLANA &&
    targetWalletAddress
  ) {
    const cache = getAssociatedAccountCache();
    const associatedAccountCache = cache[targetWalletAddress]
      ? cache[targetWalletAddress][targetAssetData.data.targetAddress]
      : undefined;
    const mintPublicKey = new PublicKey(targetAssetData.data.targetAddress);
    const targetAddressSolPK = new PublicKey(targetWalletAddress);
    let needToCreateWrappedTbtcAccount = false;

    if (mintPublicKey.toBase58().toLowerCase() === getTBTCAddressForChain(CHAIN_ID_SOLANA).toLowerCase()) {
      const connection = getSolanaConnection();
      const targetAddressSolPK = new PublicKey(targetWalletAddress);
      const wtbtcMint = getWtBTCAddressForChain(CHAIN_ID_SOLANA);
      const wtbtcMintPublicKey = new PublicKey(wtbtcMint);
      const wtbtcAssociatedAccount = await getAssociatedAccountAddress({
        mintPublicKey: wtbtcMintPublicKey,
        targetAddressSolPK,
      });
      const wtbtcAssociatedAddressInfo = await connection.getAccountInfo(wtbtcAssociatedAccount);

      if (!wtbtcAssociatedAddressInfo) {
        needToCreateWrappedTbtcAccount = true;
      }
    }

    if (needToCreateWrappedTbtcAccount) {
      isRequiredCreateAssociatedAccount = true;
    } else {
      if (associatedAccountCache) {
        associatedAddress = associatedAccountCache;
        isRequiredCreateAssociatedAccount = false;
      } else {
        const connection = getSolanaConnection();
        const maxRetry = retryTimes !== 0 ? 10 : 0;
        const { _associatedAddress } = await runWithErrorRetry(
          async ({ retryCount }) => {
            const associatedAddress = await getAssociatedAccountAddress({ mintPublicKey, targetAddressSolPK });
            const associatedAddressInfo = await connection.getAccountInfo(associatedAddress);

            if (retryCount < maxRetry && !associatedAddressInfo) {
              throw errorNeedRetry;
            }

            return { _associatedAddress: !associatedAddressInfo ? undefined : associatedAddress.toBase58() };
          },
          { signal, maxRetry },
        );

        if (_associatedAddress) {
          setAssociatedAccountCache(targetWalletAddress, targetAssetData.data.targetAddress, _associatedAddress);
        }

        associatedAddress = _associatedAddress;
        isRequiredCreateAssociatedAccount = !_associatedAddress;
      }
    }

    if (associatedAddress) {
      targetWalletSetExtraData({ associatedAccountAddress: associatedAddress });
    }

    return {
      isRequiredCreateAssociatedAccount,
      associatedAddress,
    };
  }
}

export interface AssociatedAccountData {
  associatedAccountData: DataResult<InnerAssociatedAccountData | undefined>;
  wallet: Wallet;
  associatedAccountTxStatus: DataResult<TransactionStatus.Successful | TransactionStatus.Failed | undefined>;
  createAssociatedAccountResult: ActionResult<TransactionResult>;
  createAssociatedAccount: () => void;
}

export function useAssociatedAccountData(options: {
  targetAssetData: DataResult<TargetAsset | undefined>;
  targetWallet: TargetWallet;
}) {
  const { targetAssetData, targetWallet } = options;
  const wallet = useWallet();

  const associatedAccountData = useData(
    async (signal, _, retryTimes) => {
      const data = await getAssociatedAccountData({
        signal,
        retryTimes,
        targetAssetData,
        targetChainId: targetWallet.wallet?.chainId,
        targetWalletAddress: targetWallet.wallet?.walletAddress,
        targetWalletSetExtraData: targetWallet.setExtraData,
      });

      console.log('use associated account data: ', data);

      return data;
    },
    [targetAssetData, targetWallet.wallet?.chainId, targetWallet.wallet?.walletAddress, targetWallet.setExtraData],
  );

  const { triggerer: sendAssociatedAccountTransaction, data: sendAssociatedAccountTransactionResult } =
    useAction(createAssociatedAccountHandler);

  const associatedAccountTxStatus = useTransactionStatus({
    chainId: CHAIN_ID_SOLANA,
    txHash: wallet.wallet?.sendTransactionResult.result?.txHash,
  });

  useEffect(() => {
    if (associatedAccountTxStatus.data === TransactionStatus.Successful) {
      associatedAccountData.retry();
    }
  }, [associatedAccountTxStatus, associatedAccountData.retry]);

  useEffect(() => {
    // we need to reset retry times when target wallet changed or token address changed
    associatedAccountData.resetRetryTimes();
  }, [targetAssetData.data?.targetAddress, targetWallet.wallet?.walletAddress]);

  return useMemo((): AssociatedAccountData => {
    const obj = {
      associatedAccountData,
      wallet,
      associatedAccountTxStatus,
      createAssociatedAccountResult: {
        loading:
          sendAssociatedAccountTransactionResult.loading || wallet.wallet?.sendTransactionResult.loading || false,
        error: sendAssociatedAccountTransactionResult.error || wallet.wallet?.sendTransactionResult.error,
        result: wallet.wallet?.sendTransactionResult.result,
      },
      createAssociatedAccount: () =>
        sendAssociatedAccountTransaction({ associatedAccountData, wallet, targetWallet, targetAssetData }),
    };

    return obj;
  }, [
    targetAssetData,
    targetWallet,
    associatedAccountData,
    wallet,
    associatedAccountTxStatus,
    sendAssociatedAccountTransactionResult,
    sendAssociatedAccountTransaction,
  ]);
}
