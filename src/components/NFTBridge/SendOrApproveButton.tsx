import { CHAIN_ID_SOLANA } from '@certusone/wormhole-sdk';
import { css } from '@linaria/core';
import React from 'react';
import { TargetWallet } from '../../hooks/useTargetWallet';
import { Wallet } from '../../hooks/useWallet';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { NFTData, TokenData } from '../../utils/tokenData/helper';
import { Button } from '../common/Button';
import { ApprovedData } from './hooks/useAllowance';
import { DataResult } from '../../hooks/useData';
import { TargetAsset } from '../../hooks/useTargetAsset';
import { AssociatedAccountData } from './hooks/useAssociatedAccountData';
import { CarrierChainId } from '../../utils/consts';
import { ethers } from 'ethers';

interface Props {
  approvalData: ApprovedData;
  associatedAccountData: AssociatedAccountData;
  sourceWallet: Wallet;
  sourceToken: TokenData | undefined;
  targetChainId: CarrierChainId;
  targetWallet: TargetWallet;
  targetAssetData: DataResult<TargetAsset | undefined>;
  networkError: Error | undefined;
  tokenError: Error | undefined;
  isWalletBlocked: boolean | undefined;
  onApprove: () => void;
  onTransferData: (transferData: SendTokenData) => void;
}

export const SendOrApproveButton: React.SFC<Props> = ({
  approvalData,
  associatedAccountData,
  sourceWallet,
  sourceToken,
  targetChainId,
  targetWallet,
  targetAssetData,
  networkError,
  tokenError,
  isWalletBlocked,
  onApprove,
  onTransferData,
}) => {
  return (
    <>
      {targetAssetData.data && approvalData.data.approvalRequired ? (
        <ApproveButton
          sourceWallet={sourceWallet}
          approvalData={approvalData}
          sourceToken={sourceToken}
          networkError={networkError}
          tokenError={tokenError}
          isWalletBlocked={isWalletBlocked}
          onApprove={onApprove}
        />
      ) : (
        <SendButton
          associatedAccountData={associatedAccountData}
          sourceToken={sourceToken}
          sourceWallet={sourceWallet}
          targetChainId={targetChainId}
          targetWallet={targetWallet}
          targetAssetData={targetAssetData}
          networkError={networkError}
          tokenError={tokenError}
          isWalletBlocked={isWalletBlocked}
          onTransferData={onTransferData}
        />
      )}
    </>
  );
};

interface ApproveButtonProps {
  sourceWallet: Wallet;
  approvalData: ApprovedData;
  sourceToken: TokenData | undefined;
  networkError: Error | undefined;
  tokenError: Error | undefined;
  isWalletBlocked: boolean | undefined;
  onApprove: () => void;
}

export const ApproveButton: React.SFC<ApproveButtonProps> = ({
  sourceWallet,
  approvalData,
  sourceToken,
  networkError,
  tokenError,
  isWalletBlocked,
  onApprove,
}) => {
  const isLoading = approvalData.loading || sourceWallet.wallet?.approveNFTResult.loading;
  const isOwner = sourceToken && sourceToken.uiAmount > 0 ? true : false;
  const isReady = approvalData && sourceToken && isOwner && !networkError && !tokenError && !isWalletBlocked;
  const isDisabled = !isReady || isLoading;

  return (
    <Button
      type="primary"
      className={GradientButtonStyle}
      loading={isLoading}
      disabled={isDisabled}
      onClick={() => onApprove()}>
      {sourceWallet.wallet?.approveNFTResult.loading
        ? `Approving NFT...`
        : approvalData.loading
        ? `Fetching NFT approval data...`
        : 'Approve NFT'}
    </Button>
  );
};

export interface SendTokenData {
  sourceToken: NFTData | undefined;
  targetChainId: CarrierChainId;
  targetWallet: TargetWallet;
  targetAsset: TargetAsset | undefined;
  providerFee?: ethers.BigNumber;
}

interface SendButtonProps {
  associatedAccountData: AssociatedAccountData;
  sourceWallet: Wallet;
  sourceToken: TokenData | undefined;
  targetChainId: CarrierChainId;
  targetWallet: TargetWallet;
  targetAssetData: DataResult<TargetAsset | undefined>;
  networkError: Error | undefined;
  tokenError: Error | undefined;
  isWalletBlocked: boolean | undefined;
  onTransferData: (transferData: SendTokenData) => void;
}

export const SendButton: React.SFC<SendButtonProps> = ({
  associatedAccountData,
  sourceWallet,
  sourceToken,
  targetChainId,
  targetWallet,
  targetAssetData,
  networkError,
  tokenError,
  isWalletBlocked,
  onTransferData,
}) => {
  const isLoading = sourceWallet.wallet?.transferNFTResult?.loading;

  const isOwner = sourceToken && sourceToken.uiAmount > 0 ? true : false;

  const isAssociatedAccountRequired = targetChainId && targetChainId === CHAIN_ID_SOLANA ? true : false;

  const isAssociatedAccountReady = isAssociatedAccountRequired
    ? !!associatedAccountData.associatedAccountData.data?.associatedAddress
    : true;

  const isReady =
    sourceToken &&
    sourceWallet &&
    targetWallet.wallet &&
    targetChainId &&
    targetAssetData.data &&
    isAssociatedAccountReady &&
    isOwner &&
    !networkError &&
    !tokenError &&
    !isWalletBlocked;

  const isDisabled = !isReady || isLoading;

  console.log('isSendTransactionButtonReady', isReady, {
    sourceToken,
    sourceWallet,
    targetWallet: targetWallet.wallet,
    targetChainId,
    targetAssetData: targetAssetData.data,
  });

  const transferData: SendTokenData = {
    sourceToken: sourceToken,
    targetChainId,
    targetWallet,
    targetAsset: targetAssetData.data,
  };

  return (
    <Button
      type="primary"
      className={GradientButtonStyle}
      loading={isLoading}
      disabled={isDisabled}
      onClick={() => onTransferData(transferData)}>
      {isLoading ? 'Sending transaction...' : 'Confirm & begin transaction'}
    </Button>
  );
};

const GradientButtonStyle = css`
  display: flex;
  align-items: center;
  justify-content: center;
  background-image: linear-gradient(to right, #9263ff 0%, #7c1fff 25%, #4964fe 51%, #2ac9fe 100%);
  font-size: ${pxToPcVw(16)};
  font-weight: 600;
  width: ${pxToPcVw(588)};
  height: ${pxToPcVw(56)};
  border-radius: ${pxToPcVw(8)};
  border: 0;

  &:hover,
  &:focus,
  &:active {
    background-image: linear-gradient(to right, #9263ff 0%, #7c1fff 25%, #4964fe 51%, #2ac9fe 100%);
    opacity: 0.66;
  }

  & > span {
    max-width: 100%;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  @media (max-width: 1024px) {
    width: 100%;
    height: ${pxToMobileVw(56)};
    font-size: ${pxToMobileVw(16)};
    border-radius: ${pxToMobileVw(8)};
  }
`;
