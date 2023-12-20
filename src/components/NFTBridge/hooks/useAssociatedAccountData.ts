import { CHAIN_ID_SOLANA } from '@certusone/wormhole-sdk';
import { PublicKey } from '@solana/web3.js';
import { useMemo } from 'react';
import { DataResult, getPendingPromise, useData } from '../../../hooks/useData';
import { TargetAsset } from '../../../hooks/useTargetAsset';
import { TargetWallet } from '../../../hooks/useTargetWallet';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { deriveWrappedMintKey as deriveWrappedMintKeyNFT } from '@certusone/wormhole-sdk/lib/esm/solana/nftBridge/accounts/wrapped';
import { CarrierChainId, getNFTBridgeAddressForChain } from '../../../utils/consts';

interface InnerAssociatedAccountData {
  associatedAddress: string | undefined;
}

async function getAssociatedAccountAddress(options: { mintPublicKey: PublicKey; targetAddressSolPK: PublicKey }) {
  const { mintPublicKey, targetAddressSolPK } = options;
  const associatedAddress = await getAssociatedTokenAddress(mintPublicKey, targetAddressSolPK);

  return associatedAddress;
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

  let associatedAddress: string | undefined = undefined;

  if (
    targetAssetData.data &&
    targetAssetData.data.sourceAddress &&
    targetAssetData.data.originAddress &&
    targetAssetData.data.originChainId &&
    targetAssetData.data.originTokenId &&
    targetChainId &&
    targetChainId === CHAIN_ID_SOLANA &&
    targetWalletAddress
  ) {
    const { originChainId, originTokenId, originAddress, sourceAddress } = targetAssetData.data;

    const targetAddressSolPK = new PublicKey(targetWalletAddress);
    let mintPublicKey: PublicKey;

    if (originChainId === targetChainId) {
      // origin chain is solana
      // mint key is the origin address
      // don't use origin asset address here as the origin asset address is wrong
      mintPublicKey = new PublicKey(originAddress);
    } else {
      mintPublicKey = deriveWrappedMintKeyNFT(
        getNFTBridgeAddressForChain(CHAIN_ID_SOLANA),
        originChainId,
        originAddress,
        BigInt(originTokenId),
      );
    }

    associatedAddress = (await getAssociatedAccountAddress({ mintPublicKey, targetAddressSolPK })).toBase58();

    if (associatedAddress) {
      targetWalletSetExtraData({ associatedAccountAddress: associatedAddress });
    }

    return {
      associatedAddress,
    };
  }
}

export interface AssociatedAccountData {
  associatedAccountData: DataResult<InnerAssociatedAccountData | undefined>;
}

export function useAssociatedAccountData(options: {
  targetAssetData: DataResult<TargetAsset | undefined>;
  targetWallet: TargetWallet;
}) {
  const { targetAssetData, targetWallet } = options;

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

      return data;
    },
    [targetAssetData, targetWallet.wallet?.chainId, targetWallet.wallet?.walletAddress, targetWallet.setExtraData],
  );

  return useMemo((): AssociatedAccountData => {
    const obj = {
      associatedAccountData,
    };
    return obj;
  }, [targetAssetData, targetWallet, associatedAccountData]);
}
