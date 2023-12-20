import { css, cx } from '@linaria/core';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { SVGIcon } from '../common/SVGIcon';
import BridgeShowTx from './BridgeShowTx';
import { ElapsedTime } from './ElapsedTime';
import { CarrierLoader } from './CarrierLoader';
import { useFinalityCounter } from './hook/useFinalityCounter';
import { ProgressParams, routes } from '../../utils/routes';
import { CHAIN_ID_MOONBEAM, CHAIN_ID_SOLANA } from '@certusone/wormhole-sdk';
import {
  CHAINS,
  CHAINS_BY_ID,
  CarrierChainId,
  MOONBEAM_MRL_PRECOMPILE_ADDRESS,
  MOONBEAM_PARACHAIN_ID,
  isDefaultCurrencyIsNativeCurrency,
  wormholeChainToEvmChain,
} from '../../utils/consts';
import { errorIsNotAWormholeTx, useSignedVaa, VaaType } from '../../hooks/useSignedVaa';
import { useTransaction } from '../../hooks/useTransaction';
import { getSolanaConnection, shortenAddress } from '../../utils/solana';
import { errorIncorrectChain, errorIncorrectWallet, useWallet } from '../../hooks/useWallet';
import { useRexContext } from '@jimengio/rex';
import { IStore } from '../../store';
import { useWalletAdapter } from '../../context/Wallet/WalletProvider';
import { copyContent } from '../../utils/copyToClipboard';
import { getTBTCGatewayForChain, isTBTCCanBeRedeemOnTarget } from '../../utils/tbtc';
import { Button } from '../common/Button';
import { WalletSelectorButton } from '../common/WalletSelector/WalletSelectorButton';
import { useTransactionTimestamp } from '../../hooks/useTransactionTimestamp';
import { ethers } from 'ethers';
import { PublicKey } from '@solana/web3.js';
import { TransactionStatus, WalletState } from '../../context/Wallet/types';
import { useTargetAssetWithOriginData } from './hook/useTargetAssetWithOriginData';
import { A } from '../common/A';
import { useTransactionStatus } from '../../hooks/useTransactionResult';
import { getDefaultNativeCurrencyAddress } from '../../utils/consts';
import usePollingTransferStatus from './hook/usePollingTransferStatus';
import { BridgeType, useTransferWormholeData } from '../../hooks/useTransferWormholeData';
import { Spinner } from '../common/Spinner';
import { useData } from '../../hooks/useData';
import { getChainCache } from '../../utils/chainCache';
import { isCarrierEVMChain, tryCarrierUint8ArrayToNative } from '../../utils/web3Utils';
import {
  ParachainBridgeType,
  getMoonbeamTransactionHashByExtrinsic,
  getParachainAddressPrefix,
  getPolkadotProviderWithWormholeChainId,
  isParachainTxHash,
  parseParachainTxHash,
  parseParachainTxPayload,
} from '../../utils/polkadot';
import { encodeAddress } from '@polkadot/util-crypto';
import { useParachainExtrinsicResult } from './hook/useParachainExtrinsicResult';
import Tooltip from '../common/Tooltip';

const errorRedemptionCompleted = new Error('redemption is completed');
const errorRedemptionTransactionFailed = new Error('redemption transaction executed failed');

const descriptionInfo = {
  SENDING: 'Transferring token from source chain to bridge.',
  SENT: 'Transfer confirmed and verfied by Guardian network',
  REDEEMING: 'Transferring token from bridge to dest chain',
  REDEEMED_OUTPUT_TOKEN_ADDR: 'Bridge completed',
  REDEEM_ERROR: 'Redeem halted',
};

enum ProgressStatus {
  Loading,
  Failed,
  Successful,
}

interface IProps {}

export const BridgeProgress: React.SFC<IProps> = () => {
  const [searchParams] = useSearchParams();
  const enableManualRedemptionQuery = Boolean(searchParams.get('enableManualRedemption'));
  // isUsingRelayerQuery is only used for incoming requests from the token/nft bridge page,
  // in order to display the progress page immediately.
  // for those are not from these two pages, still need to wait transferWormholeData to get isUsingRelayer.
  const isUsingRelayerQuery = searchParams.get('isUsingRelayer');
  const navigate = useNavigate();
  const [walletSelectorModalVisible, setWalletSelectorModalVisible] = useState(false);
  const { walletCache } = useRexContext((store: IStore) => store);
  const { chainId: chainIdParam, txHash } = useParams<keyof ProgressParams>();
  const chainIdParsed = chainIdParam ? (parseInt(chainIdParam) as CarrierChainId) : undefined;
  const chainId = CHAINS.find((item) => item.id === chainIdParsed)?.id;
  const xcmTxHash = useMemo(() => {
    if (txHash) {
      const parsedTxHash = isParachainTxHash(txHash) ? parseParachainTxHash(txHash) : undefined;

      return parsedTxHash;
    }
  }, [txHash]);
  const isXCMBridge = useMemo(() => {
    if (xcmTxHash) {
      // if txHash is a parachain tx and it's not mrl bridge sent from parachain, then it's a xcm bridge.
      return xcmTxHash != null && xcmTxHash.bridgeType !== ParachainBridgeType.MRL;
    }

    return false;
  }, [xcmTxHash]);
  const transferTx = useTransaction({ chainId, txHash });
  const transferWormholeData = useTransferWormholeData({ chainId, txHash, transferTx });
  const transferTxTimestamp = useTransactionTimestamp({ chainId, tx: transferTx });
  const finalityResult = useFinalityCounter({ chainId, txHash, tx: transferTx, isXCMBridge });
  const bridgeType = useMemo(() => {
    const isNFTFromTransferLogs = transferWormholeData && transferWormholeData.data?.bridgeType;

    return isNFTFromTransferLogs;
  }, [transferWormholeData.data]);
  const signedVAA = useSignedVaa({
    chainId,
    txHash,
    vaaType:
      bridgeType === BridgeType.NFT ? VaaType.NFT : bridgeType === BridgeType.USDC ? VaaType.USDC : VaaType.Token,
    tx: transferTx,
    shouldFetchVaa: bridgeType != null && !isXCMBridge && finalityResult.isFinalityReached,
  });
  const transferTransactionError = useMemo(
    () => transferTx.error || transferWormholeData.error || signedVAA.error,
    [transferTx, transferWormholeData, signedVAA],
  );
  const isUsingRelayer = useMemo(() => {
    const isUsingRelayerQueryParsed = isUsingRelayerQuery != null ? isUsingRelayerQuery === 'true' : undefined;
    const isUsingRelayerFromTransferLogs = transferWormholeData && transferWormholeData.data?.isUsingRelayer;

    return isUsingRelayerQueryParsed != null
      ? isUsingRelayerQueryParsed
      : isUsingRelayerFromTransferLogs != null
      ? isUsingRelayerFromTransferLogs
      : false;
  }, [transferWormholeData.data, isUsingRelayerQuery]);
  const isSendComplete = useMemo(() => !!signedVAA.data || isXCMBridge, [signedVAA, isXCMBridge]);
  const targetWallet = useMemo(() => {
    const targetChainId = signedVAA.data?.parsedVaaPayload?.targetChain as CarrierChainId;
    const tbtcGateway = getTBTCGatewayForChain(targetChainId);
    const isTBtcBridge = tbtcGateway.toLowerCase() === signedVAA.data?.parsedVaaPayload?.targetAddress.toLowerCase();
    const targetAddressUnparsed = isTBtcBridge
      ? signedVAA.data && 'payload' in signedVAA.data && signedVAA.data.payload
        ? tryCarrierUint8ArrayToNative(Buffer.from(signedVAA.data.payload), targetChainId)
        : undefined
      : signedVAA.data?.parsedVaaPayload?.targetAddress;

    let targetAddress;

    if (targetAddressUnparsed) {
      if (isCarrierEVMChain(targetChainId)) {
        try {
          targetAddress = ethers.utils.getAddress(targetAddressUnparsed);
        } catch (e) {}
      } else if (targetChainId === CHAIN_ID_SOLANA) {
        try {
          targetAddress = new PublicKey(targetAddressUnparsed).toBase58();
        } catch (e) {}
      }
    }

    if (targetAddress && targetChainId) {
      return { targetChainId, targetAddress };
    }
  }, [signedVAA]);

  const isMRLRedemption = useMemo(() => {
    const targetChainId = signedVAA.data?.parsedVaaPayload?.targetChain as CarrierChainId;
    const isMRL =
      MOONBEAM_MRL_PRECOMPILE_ADDRESS.toLowerCase() === signedVAA.data?.parsedVaaPayload?.targetAddress.toLowerCase() &&
      targetChainId === CHAIN_ID_MOONBEAM;

    return isMRL;
  }, [signedVAA]);

  const mrlTransactionData = useData(async () => {
    const MRLPayload =
      isMRLRedemption && signedVAA.data && 'payload' in signedVAA.data && signedVAA.data.payload
        ? await parseParachainTxPayload(signedVAA.data.payload)
        : undefined;

    if (isMRLRedemption && MRLPayload) {
      const { parachainId, accountId: accountIdUnparsed } = MRLPayload;
      const api = await getPolkadotProviderWithWormholeChainId(parachainId);
      const addressPrefix = await getParachainAddressPrefix(api);
      const accountId = encodeAddress(accountIdUnparsed, addressPrefix);

      return { parachainId, accountId };
    }
  }, [signedVAA, isMRLRedemption]);
  const destinationChainId = useMemo(() => {
    return isXCMBridge && xcmTxHash && 'targetParachainId' in xcmTxHash
      ? xcmTxHash.targetParachainId === MOONBEAM_PARACHAIN_ID
        ? CHAIN_ID_MOONBEAM
        : xcmTxHash.targetParachainId
      : isMRLRedemption
      ? mrlTransactionData.data?.parachainId
      : targetWallet?.targetChainId;
  }, [isXCMBridge, xcmTxHash, isMRLRedemption, mrlTransactionData, targetWallet]);

  const targetAssetData = useTargetAssetWithOriginData({
    originChainId: signedVAA.data?.parsedVaaPayload?.originChain as CarrierChainId,
    originAddress: signedVAA.data?.parsedVaaPayload?.originAddress,
    originTokenId:
      signedVAA.data?.parsedVaaPayload &&
      'tokenId' in signedVAA.data?.parsedVaaPayload &&
      signedVAA.data?.parsedVaaPayload.tokenId
        ? signedVAA.data?.parsedVaaPayload.tokenId.toString()
        : undefined,
    targetChainId: isMRLRedemption
      ? mrlTransactionData.data?.parachainId
      : (signedVAA.data?.parsedVaaPayload?.targetChain as CarrierChainId),
    xcmTxHash,
  });
  const { wallets } = useWalletAdapter();
  const redemptionWallet = useWallet();
  const redemptionWalletError = useMemo(() => {
    return redemptionWallet.error;
  }, [redemptionWallet.error]);
  const redemptionTxHash = useMemo(() => {
    const txHash =
      redemptionWallet.wallet?.redeemTokenResult.result?.txHash ||
      redemptionWallet.wallet?.redeemNativeResult.result?.txHash ||
      redemptionWallet.wallet?.redeemNFTResult.result?.txHash ||
      redemptionWallet.wallet?.redeemUSDCResult.result?.txHash ||
      redemptionWallet.wallet?.redeemTBTCResult.result?.txHash ||
      redemptionWallet.wallet?.redeemTokenByMRLResult.result?.txHash;

    return txHash;
  }, [
    redemptionWallet.wallet?.redeemTokenResult.result?.txHash,
    redemptionWallet.wallet?.redeemNativeResult.result?.txHash,
    redemptionWallet.wallet?.redeemNFTResult.result?.txHash,
    redemptionWallet.wallet?.redeemUSDCResult.result?.txHash,
    redemptionWallet.wallet?.redeemTBTCResult.result?.txHash,
    redemptionWallet.wallet?.redeemTokenByMRLResult.result?.txHash,
  ]);
  const redemptionTxSent = useMemo(() => {
    return redemptionTxHash != null;
  }, [redemptionTxHash]);
  const redemptionTxStatus = useTransactionStatus({
    chainId: targetWallet?.targetChainId,
    txHash: redemptionTxHash,
  });
  const redemptionError = useMemo((): Error | undefined => {
    const error =
      redemptionWallet.wallet?.redeemTokenResult.error ||
      redemptionWallet.wallet?.redeemNativeResult.error ||
      redemptionWallet.wallet?.redeemNFTResult.error ||
      redemptionWallet.wallet?.redeemUSDCResult.error ||
      redemptionWallet.wallet?.redeemTBTCResult.error ||
      redemptionWallet.wallet?.redeemTokenByMRLResult.error;
    const isErrorRejected = error ? error.message?.includes('user rejected transaction') : false;
    const isErrorCompleted = error ? /.*transfer already completed.*/.test(error.message) : false;
    return error
      ? isErrorCompleted
        ? errorRedemptionCompleted
        : isErrorRejected
        ? undefined
        : error
      : redemptionTxStatus.data === TransactionStatus.Failed
      ? errorRedemptionTransactionFailed
      : undefined;
  }, [
    redemptionTxStatus,
    redemptionWallet.wallet?.redeemTokenResult.error,
    redemptionWallet.wallet?.redeemNativeResult.error,
    redemptionWallet.wallet?.redeemNFTResult.error,
    redemptionWallet.wallet?.redeemUSDCResult.error,
    redemptionWallet.wallet?.redeemTBTCResult.error,
    redemptionWallet.wallet?.redeemTokenByMRLResult.error,
  ]);
  const isRedeeming = useMemo(() => {
    const loading =
      redemptionWallet.wallet?.redeemTokenResult.loading ||
      redemptionWallet.wallet?.redeemNativeResult.loading ||
      redemptionWallet.wallet?.redeemNFTResult.loading ||
      redemptionWallet.wallet?.redeemUSDCResult.loading ||
      redemptionWallet.wallet?.redeemTBTCResult.loading ||
      redemptionWallet.wallet?.redeemTokenByMRLResult.loading;
    const pending = loading ? loading : redemptionTxHash != null && redemptionTxStatus.data == null;

    return pending;
  }, [
    redemptionTxHash,
    redemptionTxStatus.data,
    redemptionWallet.wallet?.redeemTokenResult.loading,
    redemptionWallet.wallet?.redeemNativeResult.loading,
    redemptionWallet.wallet?.redeemNFTResult.loading,
    redemptionWallet.wallet?.redeemUSDCResult.loading,
    redemptionWallet.wallet?.redeemTBTCResult.loading,
    redemptionWallet.wallet?.redeemTokenByMRLResult.loading,
  ]);

  const parachainExtrinsicResult = useParachainExtrinsicResult({
    parachainId: mrlTransactionData.data?.parachainId,
    emitterChain: signedVAA.data && 'parsedVaa' in signedVAA.data ? signedVAA.data.parsedVaa.emitterChain : undefined,
    emitterAddress:
      signedVAA.data && 'parsedVaa' in signedVAA.data
        ? signedVAA.data.parsedVaa.emitterAddress.toString('hex')
        : undefined,
    sequence: signedVAA.data && 'parsedVaa' in signedVAA.data ? signedVAA.data.parsedVaa.sequence : undefined,
    shouldFire: isMRLRedemption && signedVAA.data != null,
  });

  const isRedeemCompleted = useMemo(() => {
    return (
      redemptionTxStatus.data === TransactionStatus.Successful &&
      (!isMRLRedemption || !!parachainExtrinsicResult.data?.parachainTxHash)
    );
  }, [redemptionTxStatus.data, isMRLRedemption, parachainExtrinsicResult]);

  const xcmSourceTxHash = useData(async () => {
    return isXCMBridge && xcmTxHash && 'sourceParachainId' in xcmTxHash
      ? xcmTxHash.sourceParachainId === MOONBEAM_PARACHAIN_ID
        ? await getMoonbeamTransactionHashByExtrinsic({
            blockHash: xcmTxHash.sourceParachainBlockHash,
            extrinsicHash: xcmTxHash.sourceParachainExtrinsicHash,
          })
        : txHash
      : undefined;
  }, [isXCMBridge, xcmTxHash, txHash]);

  const sourceTxHash = useMemo(() => {
    return xcmSourceTxHash.data ? xcmSourceTxHash.data : txHash;
  }, [xcmSourceTxHash, txHash]);

  const xcmDestinationTxHash = useData(async () => {
    return isXCMBridge && xcmTxHash && 'targetParachainId' in xcmTxHash
      ? xcmTxHash.targetParachainId === MOONBEAM_PARACHAIN_ID
        ? await getMoonbeamTransactionHashByExtrinsic({
            blockHash: xcmTxHash.targetParachainBlockHash,
            extrinsicHash: xcmTxHash.targetParachainExtrinsicHash,
          })
        : txHash
      : undefined;
  }, [isXCMBridge, xcmTxHash, txHash]);

  const destinationTxHash = useMemo(() => {
    return xcmDestinationTxHash.data
      ? xcmDestinationTxHash.data
      : isMRLRedemption
      ? parachainExtrinsicResult.data?.parachainTxHash
      : redemptionTxHash;
  }, [xcmDestinationTxHash, redemptionTxHash, parachainExtrinsicResult, isMRLRedemption]);

  const transferStatus = usePollingTransferStatus({
    sourceChainId: chainId,
    targetChainId: targetWallet?.targetChainId,
    vaaType:
      bridgeType === BridgeType.NFT ? VaaType.NFT : bridgeType === BridgeType.USDC ? VaaType.USDC : VaaType.Token,
    signedVAA: signedVAA.data && 'vaaBytes' in signedVAA.data ? signedVAA.data.vaaBytes : undefined,
    cctpBurnTxhash: bridgeType === BridgeType.USDC ? txHash : undefined,
  });
  const isTransferCompletedOnChain = useMemo(
    () => isXCMBridge || (transferStatus != null ? transferStatus : false),
    [transferStatus, isXCMBridge],
  );
  const isRelayerRedeemComplete = useMemo(
    () => (isUsingRelayer ? isTransferCompletedOnChain : false),
    [isUsingRelayer, isTransferCompletedOnChain],
  );
  const isRelayerRedeeming = useMemo(
    () => (isUsingRelayer ? isSendComplete && !isRelayerRedeemComplete : false),
    [isUsingRelayer, isSendComplete, isRelayerRedeemComplete],
  );
  const isTransferCompleted = useMemo(() => {
    return isTransferCompletedOnChain || isRedeemCompleted || redemptionError === errorRedemptionCompleted;
  }, [isTransferCompletedOnChain, isRedeemCompleted, redemptionError]);

  const progressMessage = useMemo(() => {
    return isTransferCompleted
      ? descriptionInfo.REDEEMED_OUTPUT_TOKEN_ADDR
      : !isSendComplete
      ? descriptionInfo.SENDING
      : redemptionWalletError
      ? redemptionWalletError === errorIncorrectChain && redemptionWallet.expectedChainId
        ? `Target wallet is not connected to expected network: ${
            CHAINS_BY_ID[redemptionWallet.expectedChainId].name
          } (Chain ID: ${wormholeChainToEvmChain[redemptionWallet.expectedChainId]})`
        : redemptionWalletError === errorIncorrectWallet && redemptionWallet.expectedWalletName
        ? `Target wallet is not connected to expected wallet: ${redemptionWallet.expectedWalletName}`
        : redemptionWalletError.message
      : redemptionError
      ? descriptionInfo.REDEEM_ERROR
      : isSendComplete && !isRedeeming && !isRelayerRedeeming && !isTransferCompleted
      ? descriptionInfo.SENT
      : isRedeeming || isRelayerRedeeming
      ? descriptionInfo.REDEEMING
      : '';
  }, [
    redemptionWallet.expectedChainId,
    redemptionWallet.expectedWalletName,
    redemptionWalletError,
    isRelayerRedeeming,
    redemptionError,
    isRedeeming,
    isSendComplete,
    isTransferCompleted,
  ]);

  const progressStatus = useMemo(() => {
    return isTransferCompleted
      ? ProgressStatus.Successful
      : redemptionError != null || redemptionWalletError
      ? ProgressStatus.Failed
      : ProgressStatus.Loading;
  }, [redemptionWalletError, isTransferCompleted, redemptionError]);

  const transactionMessage = useMemo(
    () => ({
      TX_SUBMITTED: 'Source transaction submitted, pending to be executed.',
      TX_EXECUTED: (
        <>
          {finalityResult.message}
          <Tooltip
            className={styleTooltips}
            tooltipText={
              <>
                Reach finality means the transaction is confirmed and it will never be reverted. The time taken for the
                block that contains your bridge transaction to reach finality on different chains will differ
                significantly.{' '}
                <a
                  href="https://docs.carrier.so/resources/frequently-asked-questions#why-is-the-bridging-process-taking-longer-than-usual"
                  target="_blank">
                  More details
                </a>
              </>
            }
          />
        </>
      ),
      TX_CONFIRMED: (
        <>
          {finalityResult.isFinalityReached ? 'Finality reached, getting VAA.' : 'Getting VAA.'}
          <Tooltip
            className={styleTooltips}
            tooltipText={
              <>
                VAA packs the transaction data across chains and makes sure your token bridging is valid and can be
                redeemed. This step may take 10 or 20 minutes to finished.{' '}
                <a href="https://docs.wormhole.com/wormhole/explore-wormhole/vaa" target="_blank">
                  More details
                </a>
              </>
            }
          />
        </>
      ),
      VAA_OK: !isUsingRelayer ? (
        'VAA received, waiting for submitting redeem transaction on destination chain.'
      ) : (
        <>
          Waiting for relayer to redeem on destination network.
          <Tooltip
            className={styleTooltips}
            tooltipText={
              <>
                If the relayer is taking too long to redeem your transaction, you can follow{' '}
                <a
                  href="https://docs.carrier.so/resources/frequently-asked-questions#my-transaction-is-still-pending-after-using-the-relayer-service.-what-should-i-do"
                  target="_blank">
                  this guide
                </a>{' '}
                to redeem your token manually.
              </>
            }
          />
        </>
      ),
      DESTINATION_TX_SUBMITTED: 'Destination transaction submitted, pending to be executed.',
      FETCH_FINAL_TOKEN:
        !targetAssetData.loading && targetAssetData.data?.targetAddress
          ? `Your asset has been bridged to the destination network, final token address is ${shortenAddress(
              targetAssetData.data.targetAddress,
            )}.`
          : 'Waiting for final token address.',
      REDEEMED:
        !isUsingRelayer || (enableManualRedemptionQuery && isTransferCompleted)
          ? 'Redeem complete.'
          : 'Token has been automatically redeemed by relayer on the destination chain.',
    }),
    [finalityResult, targetAssetData, isUsingRelayer, enableManualRedemptionQuery, isTransferCompleted],
  );
  const transactionLogs = useMemo(() => {
    if (isUsingRelayer) {
      return [
        transactionMessage.TX_SUBMITTED,
        transactionMessage.TX_EXECUTED,
        transactionMessage.TX_CONFIRMED,
        transactionMessage.VAA_OK,
        transactionMessage.FETCH_FINAL_TOKEN,
      ];
    } else {
      return [
        transactionMessage.TX_SUBMITTED,
        transactionMessage.TX_EXECUTED,
        transactionMessage.TX_CONFIRMED,
        transactionMessage.VAA_OK,
        transactionMessage.DESTINATION_TX_SUBMITTED,
        transactionMessage.FETCH_FINAL_TOKEN,
        transactionMessage.REDEEMED,
      ];
    }
  }, [
    isUsingRelayer,
    transactionMessage.DESTINATION_TX_SUBMITTED,
    transactionMessage.FETCH_FINAL_TOKEN,
    transactionMessage.REDEEMED,
    transactionMessage.TX_CONFIRMED,
    transactionMessage.TX_EXECUTED,
    transactionMessage.TX_SUBMITTED,
    transactionMessage.VAA_OK,
  ]);

  const currentStep = useMemo(() => {
    if (isTransferCompleted) {
      return !isUsingRelayer
        ? !targetAssetData.loading && targetAssetData.data?.targetAddress
          ? 7
          : 6
        : !targetAssetData.loading && targetAssetData.data?.targetAddress
        ? 5
        : 4;
    } else if (redemptionTxSent) {
      return 5;
    } else if (isSendComplete) {
      return 4;
    } else if (transferTx && transferTx.data) {
      return finalityResult.isFinalityReached ? 3 : 2;
    } else {
      return 1;
    }
  }, [
    isTransferCompleted,
    isUsingRelayer,
    redemptionTxSent,
    isSendComplete,
    transferTx,
    finalityResult,
    targetAssetData.loading,
    targetAssetData.data?.targetAddress,
  ]);

  const totalSteps = useMemo(() => transactionLogs.length, [transactionLogs.length]);
  const isReadyToRedeem = useMemo(() => {
    return (
      (!isUsingRelayer || enableManualRedemptionQuery) &&
      isSendComplete &&
      transferStatus === false &&
      !isRedeemCompleted &&
      !isTransferCompleted &&
      !redemptionError &&
      !transferTransactionError
    );
  }, [
    isUsingRelayer,
    enableManualRedemptionQuery,
    isSendComplete,
    transferStatus,
    isRedeemCompleted,
    isTransferCompleted,
    redemptionError,
    transferTransactionError,
  ]);
  const redemptionChainAndWalletName = useData(async () => {
    const connection = getSolanaConnection();
    const targetAddressAccountInfo =
      targetWallet && targetWallet?.targetChainId === CHAIN_ID_SOLANA
        ? await connection.getParsedAccountInfo(new PublicKey(targetWallet?.targetAddress))
        : undefined;
    const targetAddressOwner =
      targetAddressAccountInfo &&
      targetAddressAccountInfo.value &&
      'parsed' in targetAddressAccountInfo.value.data &&
      targetAddressAccountInfo.value.data.parsed.info.owner;

    const targetWalletCache = targetWallet
      ? walletCache.find((item) => {
          return targetWallet?.targetChainId === CHAIN_ID_SOLANA
            ? targetAddressOwner
              ? item.address.toLowerCase() === targetAddressOwner.toLowerCase()
              : item.address.toLowerCase() === targetWallet?.targetAddress.toLowerCase()
            : item.chainId === targetWallet?.targetChainId &&
                item.address.toLowerCase() === targetWallet?.targetAddress.toLowerCase();
        })
      : undefined;

    const targetAbstractWallet =
      targetWallet && targetWalletCache
        ? wallets.find(
            (item) =>
              item.walletName === targetWalletCache.name && item.availableChainIds.includes(targetWallet.targetChainId),
          )
        : undefined;

    const installed = targetAbstractWallet ? await targetAbstractWallet.isInstalled() : false;

    if (targetAbstractWallet && targetWallet && installed) {
      return {
        chainId: targetWallet.targetChainId,
        walletName: targetAbstractWallet.walletName,
      };
    }
  }, [targetWallet, walletCache]);

  useEffect(() => {
    if (isReadyToRedeem && redemptionChainAndWalletName.data) {
      redemptionWallet.connect({
        chainId: redemptionChainAndWalletName.data.chainId,
        walletName: redemptionChainAndWalletName.data.walletName,
      });
    }
  }, [isReadyToRedeem, redemptionChainAndWalletName]);

  useEffect(() => {
    if (isRedeemCompleted) {
      // need to refresh targetAssetData because NFT doesn't need to register before bridge
      // the target address can only fetched after redeem completed.
      targetAssetData.retry();
    }
  }, [isRedeemCompleted]);

  function handleRedeem() {
    if (
      bridgeType != null &&
      targetAssetData.data &&
      signedVAA.data &&
      redemptionWallet.wallet &&
      redemptionWallet.state === WalletState.CONNECTED &&
      redemptionWallet.error == null
    ) {
      const nativeCurrencyAddress = getDefaultNativeCurrencyAddress(targetAssetData.data.targetChainId);
      const isRedeemNative =
        bridgeType === BridgeType.TOKEN &&
        nativeCurrencyAddress.toLowerCase() === targetAssetData.data.targetAddress?.toLowerCase() &&
        signedVAA.data.parsedVaaPayload &&
        isDefaultCurrencyIsNativeCurrency(signedVAA.data.parsedVaaPayload.targetChain);
      const isRedeemByMRL =
        bridgeType === BridgeType.TOKEN &&
        signedVAA.data.parsedVaaPayload?.targetAddress.toLowerCase() ===
          MOONBEAM_MRL_PRECOMPILE_ADDRESS.toLowerCase() &&
        signedVAA.data.parsedVaaPayload.targetChain === CHAIN_ID_MOONBEAM;
      const isRedeemTBTC = isTBTCCanBeRedeemOnTarget({
        targetChainId: targetAssetData.data.targetChainId,
        originAddress: targetAssetData.data.originAddress,
        originChainId: targetAssetData.data.originChainId,
      });

      console.log(
        'handleRedeem',
        bridgeType,
        nativeCurrencyAddress,
        targetAssetData.data.targetAddress,
        isRedeemNative,
        isRedeemTBTC,
        isRedeemByMRL,
      );

      if (bridgeType === BridgeType.USDC && 'cctpMessageAttestation' in signedVAA.data) {
        redemptionWallet.wallet.redeemUSDC({
          wormholeSignedVAA: signedVAA.data.wormholeSignedVAA,
          circleMessage: signedVAA.data.cctpMessageBytes,
          circleAttestation: signedVAA.data.cctpMessageAttestation,
        });
      } else if ('vaaBytes' in signedVAA.data) {
        if (isRedeemByMRL) {
          redemptionWallet.wallet.redeemTokenByMRL({
            signedVAA: signedVAA.data.vaaBytes,
          });
        } else if (bridgeType === BridgeType.NFT) {
          redemptionWallet.wallet.redeemNFT({ signedVAA: signedVAA.data.vaaBytes });
        } else if (isRedeemNative) {
          redemptionWallet.wallet.redeemNative({ signedVAA: signedVAA.data.vaaBytes });
        } else if (isRedeemTBTC) {
          redemptionWallet.wallet.redeemTBTC({ signedVAA: signedVAA.data.vaaBytes });
        } else {
          redemptionWallet.wallet.redeemToken({ signedVAA: signedVAA.data.vaaBytes });
        }
      }
    }
  }

  if (isUsingRelayerQuery == null && transferWormholeData && transferWormholeData.loading) {
    return (
      <div className={loadingTips}>
        <div>This may take a while...</div>
        <Spinner />
      </div>
    );
  }

  return (
    <div className={rootWrapper}>
      {!redemptionError && !transferTransactionError ? (
        <div className={styleLoader}>
          <CarrierLoader percent={Math.ceil((currentStep / totalSteps) * 100)} />
        </div>
      ) : null}

      <div className={contentWrapper}>
        {!redemptionError && !transferTransactionError ? (
          <header className={stepsHeader}>
            <h2>
              {currentStep} of {totalSteps} steps completed
            </h2>
            <div>
              {isTransferCompleted ? <span>Bridge completed</span> : <span>Bridge in progress</span>}

              <i>&bull;</i>

              <ElapsedTime shouldCancelTimer={isTransferCompleted} startTime={transferTxTimestamp.data} />
            </div>
          </header>
        ) : (
          <div className={errorWrapper}>
            <div className={errorHeadingWrap}>
              <SVGIcon className={styleErrorIcon} iconName="exclaimation-triangle-outline" />
              <h2>Redeem aborted</h2>
            </div>

            {transferTransactionError === errorIsNotAWormholeTx ? (
              <p>This is not a valid wormhole transaction, please check your transaction hash.</p>
            ) : transferTransactionError?.message.includes('invalid hash') ? (
              <p>This is not a valid transaction, please check your transaction hash.</p>
            ) : redemptionError === errorRedemptionCompleted ? (
              <p>
                Redemption has been completed. Please check the status of this transaction in your wallet or start
                another transaction.
              </p>
            ) : (
              <p>An error has occurred. Please try to sign the redeem transaction again on your destination wallet.</p>
            )}
          </div>
        )}

        {isReadyToRedeem ? (
          <div className={redeemWrapper}>
            <div className={styleButtonsRowGroup}>
              {targetWallet ? (
                redemptionWalletError != null ||
                !redemptionWallet.wallet ||
                redemptionWallet.state !== WalletState.CONNECTED ? (
                  <WalletSelectorButton
                    walletSelectorModalVisible={walletSelectorModalVisible}
                    modalTitle="Connect to destination wallet"
                    type="primary"
                    chainId={targetWallet.targetChainId}
                    wallets={wallets}
                    loading={redemptionWallet.state === WalletState.CONNECTING}
                    disabled={redemptionWallet.state === WalletState.CONNECTING}
                    block
                    withoutTips
                    onSelectWallet={({ walletName }) => {
                      if (targetWallet) {
                        redemptionWallet.connect({ chainId: targetWallet.targetChainId, walletName });
                      }
                    }}
                    onWalletSelectorModalVisibleChange={(visible) => {
                      setWalletSelectorModalVisible(visible);
                    }}
                    onClick={() => {
                      setWalletSelectorModalVisible(true);
                    }}>
                    Connect Wallet
                  </WalletSelectorButton>
                ) : (
                  <>
                    <Button
                      type="primary"
                      block
                      loading={isRedeeming}
                      disabled={isRedeeming}
                      onClick={() => {
                        handleRedeem();
                      }}>
                      Manual Redeem
                    </Button>
                    <WalletSelectorButton
                      walletSelectorModalVisible={walletSelectorModalVisible}
                      modalTitle="Connect to destination wallet"
                      type="secondary"
                      chainId={targetWallet.targetChainId}
                      wallets={wallets}
                      onSelectWallet={({ walletName }) => {
                        if (targetWallet) {
                          redemptionWallet.connect({ chainId: targetWallet.targetChainId, walletName });
                        }
                      }}
                      onWalletSelectorModalVisibleChange={(visible) => {
                        setWalletSelectorModalVisible(visible);
                      }}
                      onClick={() => {
                        setWalletSelectorModalVisible(true);
                      }}
                    />
                  </>
                )
              ) : null}
            </div>
          </div>
        ) : redemptionError != null && redemptionError !== errorRedemptionCompleted ? (
          <div className={styleButtonsRowGroup}>
            <Button
              icon={<SVGIcon className={styleBackButtonIcon} iconName="arrow-left" />}
              type="secondary"
              onClick={() =>
                navigate(bridgeType === BridgeType.NFT ? routes.nftBridge.getPath() : routes.tokenBridge.getPath())
              }>
              Back to setup
            </Button>

            <Button
              type="primary"
              block
              onClick={() => {
                handleRedeem();
              }}>
              Try again
            </Button>
          </div>
        ) : (
          <Button
            type="primary"
            onClick={() => {
              // switch to latest source chain when the redemption wallet is connected
              // to avoid the token bridge wallet incorrect network error
              const chainAndWalletCache = getChainCache();

              if (
                redemptionWallet.state === WalletState.CONNECTED &&
                redemptionWallet.wallet &&
                redemptionWallet.wallet.availableChainIds.includes(chainAndWalletCache.sourceChainId) &&
                redemptionWallet.expectedWalletName
              ) {
                redemptionWallet.connect({
                  chainId: chainAndWalletCache.sourceChainId,
                  walletName: redemptionWallet.expectedWalletName,
                });
              }

              navigate(bridgeType === BridgeType.NFT ? routes.nftBridge.getPath() : routes.tokenBridge.getPath());
            }}>
            Start another transaction
          </Button>
        )}

        {!transferTransactionError ? (
          <div className={transactionDetails}>
            <h2>Transaction details</h2>

            {/* current progress description */}
            {progressMessage && (
              <div
                className={cx(
                  ongoingProgress,
                  progressStatus === ProgressStatus.Failed ? ongoingProgressError : undefined,
                )}>
                <SVGIcon
                  className={cx(
                    styleProgressIcon,
                    progressStatus === ProgressStatus.Loading
                      ? styleProgressIconLoading
                      : progressStatus === ProgressStatus.Failed
                      ? styleProgressIconFailed
                      : styleProgressIconSuccess,

                    progressStatus === ProgressStatus.Loading ? 'animate' : undefined,
                  )}
                  iconName={
                    progressStatus === ProgressStatus.Loading
                      ? 'arrow-path'
                      : progressStatus === ProgressStatus.Failed
                      ? 'exclaimation-circle'
                      : 'check-circle'
                  }
                />

                {progressMessage}
              </div>
            )}

            {/* transaction logs */}
            {currentStep > 0 && (
              <ol className={transactionLogsListWrapper}>
                {transactionLogs.slice(0, currentStep).map((message, index) => (
                  <li key={index}>
                    <span>{message}</span>

                    {message === transactionMessage.TX_SUBMITTED && sourceTxHash && chainId ? (
                      <BridgeShowTx chainId={chainId} txHash={sourceTxHash} />
                    ) : message === transactionMessage.DESTINATION_TX_SUBMITTED &&
                      destinationChainId &&
                      destinationTxHash ? (
                      <BridgeShowTx chainId={destinationChainId} txHash={destinationTxHash} />
                    ) : message === transactionMessage.FETCH_FINAL_TOKEN && targetAssetData.data?.targetAddress ? (
                      <A
                        className={copyAddressButton}
                        onClick={() => {
                          if (targetAssetData.data?.targetAddress) {
                            copyContent(targetAssetData.data.targetAddress);
                          }
                        }}>
                        Copy address
                        <SVGIcon iconName="document-duplicate" />
                      </A>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

const loadingTips = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: auto;
  gap: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(8)};
  }
`;

const rootWrapper = css`
  position: relative;
  margin: 0 auto;
  width: ${pxToPcVw(1080)};
  font-size: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    margin: 0;
    width: 100%;
    font-size: ${pxToMobileVw(16)};
    padding-inline: ${pxToMobileVw(12)};
  }
`;

const styleLoader = css`
  position: absolute;
  top: 0;
  left: 0;

  @media (max-width: 1024px) {
    position: static;
    display: flex;
    justify-content: center;
  }
`;

const contentWrapper = css`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  margin-inline: auto;
  gap: ${pxToPcVw(32)};
  width: ${pxToPcVw(504)};

  @media (max-width: 1024px) {
    width: 100%;
    gap: ${pxToMobileVw(24)};
    margin-top: ${pxToMobileVw(24)};
  }
`;

const errorWrapper = css`
  display: flex;
  flex-direction: column;
  gap: ${pxToPcVw(16)};

  > p {
    font-weight: 500;
    font-size: ${pxToPcVw(16)};
    line-height: 1.21875;
    color: var(--color-text-3);
    margin-bottom: 0;
  }

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(16)};

    > p {
      font-size: ${pxToMobileVw(16)};
    }
  }
`;

const errorHeadingWrap = css`
  display: inline-flex;
  gap: ${pxToPcVw(16)};
  align-items: center;

  > h2 {
    font-weight: 700;
    font-size: ${pxToPcVw(24)};
    line-height: 1.1666666667;
    color: #fff;
    margin: 0;
  }

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(16)};

    > h2 {
      font-size: ${pxToMobileVw(24)};
    }
  }
`;

const stepsHeader = css`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${pxToPcVw(16)};

  > h2 {
    font-weight: 700;
    font-size: ${pxToPcVw(24)};
    line-height: 1.1666666667;
    color: #fff;
    margin: 0;
  }

  > div {
    display: flex;
    flex-direction: row;
    gap: ${pxToPcVw(6)};
    align-items: center;
    font-weight: 500;
    color: var(--color-text-3);

    strong {
      font-weight: 600;
      color: var(--color-text);
    }

    > span {
      display: inline-flex;
      gap: ${pxToPcVw(6)};
      align-items: center;
    }
  }

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(16)};

    > h2 {
      font-size: ${pxToMobileVw(24)};
    }

    > div {
      gap: ${pxToMobileVw(6)};

      > span {
        gap: ${pxToMobileVw(6)};
      }
    }
  }
`;

const transactionDetails = css`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  background-color: var(--ant-background);
  border: ${pxToPcVw(2)} solid var(--ant-primary-color-outline);
  border-radius: ${pxToPcVw(8)};
  padding: ${pxToPcVw(24)};
  margin-bottom: ${pxToPcVw(90)};

  h2 {
    font-weight: 600;
    line-height: 1.2;
    color: #fff;
    font-size: ${pxToPcVw(20)};
    margin-bottom: ${pxToPcVw(24)};
  }

  @media (max-width: 1024px) {
    border: ${pxToMobileVw(2)} solid var(--ant-primary-color-outline);
    border-radius: ${pxToMobileVw(8)};
    padding: ${pxToMobileVw(24)};
    margin-bottom: ${pxToMobileVw(90)};

    h2 {
      font-size: ${pxToMobileVw(20)};
      margin-bottom: ${pxToMobileVw(24)};
    }
  }
`;

const ongoingProgress = css`
  display: flex;
  flex-direction: row;
  align-items: center;
  font-weight: 400;
  line-height: 1.2142857143;
  gap: ${pxToPcVw(12)};
  font-size: ${pxToPcVw(14)};

  .animate {
    @keyframes rotateArrowPath {
      0% {
        transform: rotate(0deg);
      }
      75% {
        transform: rotate(180deg);
      }
      100% {
        transform: rotate(180deg);
      }
    }

    animation: rotateArrowPath 0.75s cubic-bezier(0.33, 0.38, 0.2, 0.94) infinite;
  }

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(12)};
    font-size: ${pxToMobileVw(14)};
  }
`;

const ongoingProgressError = css`
  color: var(--color-error);
`;

/* const Messages = css`
  display: flex;
  flex-direction: column;
  gap: ${pxToPcVw(8)};
`; */

const transactionLogsListWrapper = css`
  list-style: none;
  padding: 0;
  margin: ${pxToPcVw(24)} 0 0;

  > li {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    font-weight: 400;
    line-height: 1.4em;
    font-size: ${pxToPcVw(14)};
    gap: ${pxToPcVw(24)};

    &:not(:last-child) {
      margin-bottom: ${pxToPcVw(16)};
    }

    > span:first-child {
      max-width: 60%;
    }
  }

  @media (max-width: 1024px) {
    margin: ${pxToMobileVw(24)} 0 0;

    > li {
      flex-direction: column;
      align-items: flex-start;
      gap: ${pxToMobileVw(4)};
      font-size: ${pxToMobileVw(14)};

      &:not(:last-child) {
        margin-bottom: ${pxToMobileVw(16)};
      }

      > span:first-child {
        max-width: none;
      }
    }
  }
`;

const redeemWrapper = css`
  display: flex;
  flex-direction: column;
  gap: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(8)};
  }
`;

const styleButtonsRowGroup = css`
  display: flex;
  flex-direction: row;
  gap: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(16)};
  }
`;

const copyAddressButton = css`
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  margin: 0;
  padding: 0;
  border: 0;
  height: unset;
  font-weight: 600;
  font-size: ${pxToPcVw(13)};
  gap: ${pxToPcVw(4)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(13)};
    gap: ${pxToMobileVw(4)};
  }
`;

const styleErrorIcon = css`
  width: ${pxToPcVw(40)};
  height: ${pxToPcVw(40)};

  & > * {
    fill: var(--status-failed);
  }

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(40)};
    height: ${pxToMobileVw(40)};
  }
`;

const styleBackButtonIcon = css`
  width: ${pxToPcVw(24)};
  height: ${pxToPcVw(24)};

  & > * {
    fill: #fff;
  }

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(24)};
    height: ${pxToMobileVw(24)};
  }
`;

const styleProgressIcon = css`
  width: ${pxToPcVw(24)};
  height: ${pxToPcVw(24)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(24)};
    height: ${pxToMobileVw(24)};
  }
`;

const styleProgressIconSuccess = css`
  & > * {
    fill: var(--status-success);
  }
`;

const styleProgressIconFailed = css`
  & > * {
    fill: var(--color-error);
  }
`;

const styleProgressIconLoading = css`
  & > * {
    fill: var(--ant-primary-5);
  }
`;

const styleTooltips = css`
  margin-left: ${pxToPcVw(5)};

  @media (max-width: 1024px) {
    margin-left: ${pxToMobileVw(5)};
  }
`;
