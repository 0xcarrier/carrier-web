import { useEffect, useMemo } from 'react';
import { TransactionStatus } from '../context/Wallet/types';
import { DataResult, getPendingPromise, useData } from './useData';
import { useSignedVaa, VaaType } from './useSignedVaa';
import { useTransactionStatus } from './useTransactionResult';
import { CurrentWalletTransactionResult, useWallet, Wallet } from './useWallet';
import { TargetAsset } from './useTargetAsset';
import { getCluster } from '../utils/env';
import { CarrierChainId } from '../utils/consts';

const attestationResultCacheKey = 'attestationResultCache';
const registrationResultCacheKey = 'registrationResultCache';

interface AttestationResultCache {
  [originChainId: number]: {
    [originAddress: string]: {
      [targetChainId: number]: string;
    };
  };
}

function findAttestationResultCache(options: {
  isAttestation: boolean;
  originChainId: CarrierChainId;
  originAddress: string;
  targetChainId: CarrierChainId;
}): string | undefined {
  const { isAttestation, originChainId, originAddress, targetChainId } = options;
  const data = getAttestationResultCache({ isAttestation });
  data[originChainId] = data[originChainId] || {};
  data[originChainId][originAddress] = data[originChainId][originAddress] || {};

  return data[originChainId][originAddress][targetChainId];
}

function getAttestationResultCache(options: { isAttestation: boolean }): AttestationResultCache {
  const cluster = getCluster();

  const { isAttestation } = options;
  const data = localStorage.getItem(
    `${isAttestation ? attestationResultCacheKey : registrationResultCacheKey}.${cluster}`,
  );

  return data ? JSON.parse(data) : {};
}

function setAttestationResultCache(options: {
  isAttestation: boolean;
  originChainId: CarrierChainId;
  originAddress: string;
  targetChainId: CarrierChainId;
  txHash: string;
}) {
  const cluster = getCluster();
  const { isAttestation, originAddress, originChainId, targetChainId, txHash } = options;

  const data = getAttestationResultCache({ isAttestation });

  data[originChainId] = data[originChainId] || {};
  data[originChainId][originAddress] = data[originChainId][originAddress] || {};
  data[originChainId][originAddress][targetChainId] = txHash;

  localStorage.setItem(
    `${isAttestation ? attestationResultCacheKey : registrationResultCacheKey}.${cluster}`,
    JSON.stringify(data),
  );
}

interface InnerRegistrationData {
  registerRequired: boolean;
  registrationResult?: CurrentWalletTransactionResult;
  attestationResult?: CurrentWalletTransactionResult;
}

async function getRegistrationData(options: {
  signal: AbortSignal;
  targetAssetData: DataResult<TargetAsset | undefined>;
  registrationResult?: CurrentWalletTransactionResult;
  attestationResult?: CurrentWalletTransactionResult;
}): Promise<InnerRegistrationData | undefined> {
  const { signal, targetAssetData, registrationResult, attestationResult } = options;

  if (targetAssetData.error) {
    throw targetAssetData.error;
  }

  if (targetAssetData.loading) {
    return getPendingPromise(signal);
  }

  const registerRequired = targetAssetData.data ? targetAssetData.data.targetAddress == null : false;

  const attestationTxHashCache = targetAssetData.data
    ? findAttestationResultCache({
        isAttestation: true,
        originChainId: targetAssetData.data.originChainId,
        originAddress: targetAssetData.data.originAddress,
        targetChainId: targetAssetData.data.targetChainId,
      })
    : undefined;
  const attestationTxHash = attestationTxHashCache || attestationResult?.result?.txHash;

  const registrationTxHashCache = targetAssetData.data
    ? findAttestationResultCache({
        isAttestation: false,
        originChainId: targetAssetData.data.originChainId,
        originAddress: targetAssetData.data.originAddress,
        targetChainId: targetAssetData.data.targetChainId,
      })
    : undefined;
  const registrationTxHash = registrationTxHashCache || registrationResult?.result?.txHash;

  return {
    registerRequired,
    attestationResult: attestationResult
      ? {
          ...attestationResult,
          result: attestationTxHash
            ? {
                txHash: attestationTxHash,
              }
            : undefined,
        }
      : undefined,
    registrationResult: registrationResult
      ? {
          ...registrationResult,
          result: registrationTxHash
            ? {
                txHash: registrationTxHash,
              }
            : undefined,
        }
      : undefined,
  };
}

export interface RegistrationData {
  registrationData: DataResult<InnerRegistrationData | undefined>;
  attestationSignedVaa: ReturnType<typeof useSignedVaa>;
  attestationTxStatus: DataResult<TransactionStatus.Successful | TransactionStatus.Failed | undefined>;
  registrationTxStatus: DataResult<TransactionStatus.Successful | TransactionStatus.Failed | undefined>;
  wallet: Wallet;
}

// how to use this hook?
// put wallet and originAsset.chainId or targetAsset.chainId into WalletSelector component
// select a wallet and connect to originAsset or targetAsset's chainId
// then use wallet.wallet.attestToken or wallet.wallet.registerToken
// use registrationData.registerRequired to check if need to attest token
// use registrationData.attestationResult.result.txHash to check if attestation finished.
export function useRegistrationData(options: {
  targetChainId: CarrierChainId;
  targetAssetData: DataResult<TargetAsset | undefined>;
}) {
  const { targetChainId, targetAssetData } = options;
  const wallet = useWallet();

  const registrationData = useData(
    async (signal) => {
      // console.log('useRegistrationData', {
      //   signal,
      //   targetAssetData,
      //   attestationResult: wallet.wallet?.attestTokenResult,
      //   registrationResult: wallet.wallet?.registerTokenResult,
      // });

      const data = await getRegistrationData({
        signal,
        targetAssetData,
        attestationResult: wallet.wallet?.attestTokenResult,
        registrationResult: wallet.wallet?.registerTokenResult,
      });

      // console.log('useRegistrationData result', data);

      return data;
    },
    [targetAssetData, wallet.wallet?.attestTokenResult, wallet.wallet?.registerTokenResult],
  );

  useEffect(() => {
    if (
      wallet.wallet?.attestTokenResult?.result?.txHash &&
      targetAssetData.data?.originChainId &&
      targetAssetData.data?.originAddress &&
      targetAssetData.data?.targetChainId
    ) {
      setAttestationResultCache({
        isAttestation: true,
        originChainId: targetAssetData.data.originChainId,
        originAddress: targetAssetData.data.originAddress,
        targetChainId: targetAssetData.data.targetChainId,
        txHash: wallet.wallet?.attestTokenResult.result.txHash,
      });
    }
  }, [
    wallet.wallet?.attestTokenResult?.result?.txHash,
    targetAssetData.data?.originChainId,
    targetAssetData.data?.originAddress,
    targetAssetData.data?.targetChainId,
  ]);

  useEffect(() => {
    if (
      wallet.wallet?.registerTokenResult?.result?.txHash &&
      targetAssetData.data?.originChainId &&
      targetAssetData.data?.originAddress &&
      targetAssetData.data?.targetChainId
    ) {
      setAttestationResultCache({
        isAttestation: false,
        originChainId: targetAssetData.data.originChainId,
        originAddress: targetAssetData.data.originAddress,
        targetChainId: targetAssetData.data.targetChainId,
        txHash: wallet.wallet?.registerTokenResult.result.txHash,
      });
    }
  }, [
    wallet.wallet?.registerTokenResult?.result?.txHash,
    targetAssetData.data?.originChainId,
    targetAssetData.data?.originAddress,
    targetAssetData.data?.targetChainId,
  ]);

  const attestationTxStatus = useTransactionStatus({
    chainId: targetAssetData.data?.originChainId,
    txHash: registrationData.data?.attestationResult?.result?.txHash,
  });

  const registrationTxStatus = useTransactionStatus({
    chainId: targetChainId,
    txHash: registrationData.data?.registrationResult?.result?.txHash,
  });

  const attestationSignedVaa = useSignedVaa({
    chainId: targetAssetData.data?.originChainId,
    txHash:
      attestationTxStatus.data === TransactionStatus.Successful
        ? registrationData.data?.attestationResult?.result?.txHash
        : undefined,
    vaaType: VaaType.Attest,
    shouldFetchVaa: true,
  });

  return useMemo((): RegistrationData => {
    const obj = {
      registrationData,
      attestationSignedVaa,
      attestationTxStatus,
      registrationTxStatus,
      wallet,
    };

    return obj;
  }, [wallet, registrationData, attestationSignedVaa, attestationTxStatus, registrationTxStatus]);
}
