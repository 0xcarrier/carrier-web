import { CHAIN_ID_SOLANA } from '@certusone/wormhole-sdk';
import { css } from '@linaria/core';
import { BigNumber, ethers } from 'ethers';
import React from 'react';
import { DataResult } from '../../hooks/useData';
import { TargetWallet } from '../../hooks/useTargetWallet';
import { Wallet } from '../../hooks/useWallet';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { TokenData } from '../../utils/tokenData/helper';
import { parseAmount } from '../../utils/web3Utils';
import { Button } from '../common/Button';
import { AllowanceData } from '../../hooks/useAllowance';
import { AmountData } from '../../hooks/useAmountData';
import { CarrierChainId } from '../../utils/consts';
import { ProviderFeeData } from '../../hooks/useProviderFeeData';

interface Props {
  allowanceData: AllowanceData;
  providerFeeData: DataResult<ProviderFeeData | undefined>;
  sourceWallet: Wallet;
  sourceToken: TokenData | undefined;
  targetChainId: CarrierChainId;
  targetWallet: TargetWallet;
  amountData: AmountData;
  isUsingRelayer: boolean;
  onApproveAmount: (amount: ethers.BigNumber) => void;
  onTransferData: (transferData: SendTokenData) => void;
}

export const SendOrApproveButton: React.SFC<Props> = ({
  providerFeeData,
  allowanceData,
  sourceWallet,
  sourceToken,
  targetChainId,
  targetWallet,
  amountData,
  isUsingRelayer,
  onApproveAmount,
  onTransferData,
}) => {
  return (
    <>
      {allowanceData.data.approvalRequired ? (
        <ApproveButton
          sourceWallet={sourceWallet}
          allowanceData={allowanceData}
          targetWallet={targetWallet}
          providerFeeData={providerFeeData}
          sourceToken={sourceToken}
          amountData={amountData}
          isUsingRelayer={isUsingRelayer}
          onApproveAmount={onApproveAmount}
        />
      ) : (
        <SendButton
          providerFeeData={providerFeeData}
          sourceToken={sourceToken}
          sourceWallet={sourceWallet}
          targetChainId={targetChainId}
          targetWallet={targetWallet}
          amountData={amountData}
          isUsingRelayer={isUsingRelayer}
          onTransferData={onTransferData}
        />
      )}
    </>
  );
};

interface ApproveButtonProps {
  sourceWallet: Wallet;
  allowanceData: AllowanceData;
  targetWallet: TargetWallet;
  providerFeeData: DataResult<ProviderFeeData | undefined>;
  sourceToken: TokenData | undefined;
  amountData: AmountData;
  isUsingRelayer: boolean;
  onApproveAmount: (amount: ethers.BigNumber) => void;
}

export const ApproveButton: React.SFC<ApproveButtonProps> = ({
  sourceWallet,
  allowanceData,
  targetWallet,
  providerFeeData,
  sourceToken,
  amountData,
  isUsingRelayer,
  onApproveAmount,
}) => {
  const relayerFee =
    isUsingRelayer && providerFeeData?.data?.relayable && providerFeeData?.data?.relayerFeeFormatted && sourceToken
      ? parseAmount(providerFeeData.data.relayerFeeFormatted, sourceToken.decimals)
      : BigNumber.from('0');
  const transferAmt = amountData?.amountValidationInfo?.data?.transferAmountParsed || BigNumber.from('0');
  const approvedAmount = transferAmt.add(relayerFee);

  const isLoading =
    allowanceData.loading || amountData.amountValidationInfo.loading || sourceWallet.wallet?.approveTokenResult.loading;

  const isReady =
    allowanceData &&
    sourceToken &&
    amountData &&
    (targetWallet.wallet && targetWallet.wallet.chainId === CHAIN_ID_SOLANA
      ? targetWallet.wallet.extraData?.associatedAccountAddress
      : true) &&
    !amountData.amountValidationInfo.data?.transferAmountError &&
    (isUsingRelayer ? providerFeeData?.data?.relayable : true);
  const isDisabled = !isReady || isLoading;

  return (
    <Button
      type="primary"
      className={GradientButtonStyle}
      loading={isLoading}
      disabled={isDisabled}
      onClick={() => onApproveAmount(approvedAmount)}>
      {sourceWallet.wallet?.approveTokenResult.loading
        ? `Approving allowance...`
        : allowanceData.loading
        ? `Fetching allowance...`
        : `Approve ${amountData.transferAmountString} ${
            isUsingRelayer && providerFeeData?.data?.relayable && providerFeeData.data?.relayerFeeFormatted
              ? `+ ${providerFeeData.data?.relayerFeeFormatted}`
              : ''
          } token(s)`}
    </Button>
  );
};

export interface SendTokenData {
  sourceToken: TokenData | undefined;
  amount: string;
  targetChainId: CarrierChainId;
  targetWallet: TargetWallet;
  providerFee?: ethers.BigNumber;
}

interface SendButtonProps {
  providerFeeData: DataResult<ProviderFeeData | undefined>;
  sourceWallet: Wallet;
  sourceToken: TokenData | undefined;
  targetChainId: CarrierChainId;
  targetWallet: TargetWallet;
  amountData: AmountData;
  isUsingRelayer: boolean;
  onTransferData: (transferData: SendTokenData) => void;
}

export const SendButton: React.SFC<SendButtonProps> = ({
  providerFeeData,
  sourceToken,
  sourceWallet,
  targetChainId,
  targetWallet,
  amountData,
  isUsingRelayer,
  onTransferData,
}) => {
  const isLoading =
    sourceWallet.wallet?.transferNativeResult?.loading || sourceWallet.wallet?.transferTokenResult?.loading;

  const isRelayerReady = isUsingRelayer ? providerFeeData?.data?.relayable : true;

  // TODO: add checks to verify solana associated account
  const isReady =
    sourceToken &&
    sourceWallet &&
    amountData.amountValidationInfo.data?.transferAmountValid &&
    targetWallet.wallet &&
    targetChainId &&
    isRelayerReady;

  const isDisabled = !isReady || isLoading;

  // console.log('isSendTransactionButtonReady', isReady, {
  //   sourceToken,
  //   sourceWallet,
  //   amountData,
  //   transferAmountError: amountData.amountValidationInfo.data?.transferAmountError,
  //   targetWallet: targetWallet.wallet,
  //   targetChainId,
  //   targetAssetAddress: targetAssetData.data?.targetAddress,
  //   targetAssetChainId: targetAssetData.data?.targetChainId,
  //   isUsingRelayer,
  //   relayable: providerFeeData?.data?.relayable,
  // });

  const transferData: SendTokenData = {
    sourceToken: sourceToken,
    amount: amountData.transferAmountString,
    targetChainId,
    targetWallet,
    providerFee: providerFeeData.data?.hasFees ? providerFeeData.data.totalFeeParsed : undefined,
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
