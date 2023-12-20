import { css, cx } from '@linaria/core';
import React from 'react';
import { DataResult } from '../../hooks/useData';
import { TokensData } from '../../hooks/useTokens';
import { Wallet } from '../../hooks/useWallet';
import { formatAmount } from '../../utils/format-amount';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { TokenData } from '../../utils/tokenData/helper';
import { HintMessage } from '../common/HintMessage';
import { AmountInput } from './AmountInput';
import {
  AmountData,
  amountErrorExceedsMaxAmount,
  amountErrorInsufficientBalance,
  amountErrorNameInsufficientXcGLMR,
  amountErrorLessThanEightDecimals,
  amountErrorZero,
  minimumAmount,
  amountErrorNameLowerThanExistentialDeposit,
  amountErrorInsufficientBalanceForMRLFee,
} from '../../hooks/useAmountData';
import { MaxAmountData } from '../../hooks/useMaxAmoutData';
import { UseBridgeLimitDataHook } from './hooks/useBridgeLimitData';
import { MaxAmountButton } from './MaxAmountButton';
import { TokenSelectorButton } from './TokenSelectorButton';
import { EstimatedFees } from '../EstimatedFees/EstimatedFees';
import { EstimatedTime } from '../EstimatedFees/EstimatedTime';
import { BridgeFee } from './hooks/useBridgeFee';
import EstimatedTotal from './EstimatedTotal';
import { TokenPrice } from '../../utils/tokenPrices';
import { A } from '../common/A';
import { styleDisabled } from '../../utils/styles';
import { TargetAsset, errorTokenIsNotSupportedOnPolkachain } from '../../hooks/useTargetAsset';
import { CarrierChainId } from '../../utils/consts';
import { ProviderFeeData } from '../../hooks/useProviderFeeData';
import { errorTokenIsDisabled } from '../../hooks/useTokenError';

interface Props {
  className?: string;
  disabled?: boolean;
  enableWalletErrorTips: boolean;
  bridgeFee: BridgeFee;
  bridgeLimitData: ReturnType<UseBridgeLimitDataHook>;
  sourceChainId?: CarrierChainId;
  targetAssetData: DataResult<TargetAsset | undefined>;
  tokenPricesData: DataResult<TokenPrice | undefined>;
  providerFeeData: DataResult<ProviderFeeData | undefined>;
  sourceWallet: Wallet;
  sourceTokens: TokensData;
  sourceToken?: TokenData;
  amountData: AmountData;
  maxAmountData: DataResult<MaxAmountData | undefined>;
  isUsingRelayer: boolean;
  tokenError: Error | undefined;
  onSearchToken: (options: { tokenAddress: string }) => void;
  onSelectToken: (options: { tokenAddress: string }) => void;
  onConnectToNetwork: () => void;
  onAmountChanged: (amountString: string) => void;
  onMaxAmountRetry: () => void;
}

export const TokenSelectorSection: React.SFC<Props> = ({
  className,
  disabled,
  enableWalletErrorTips,
  bridgeFee,
  bridgeLimitData,
  sourceChainId,
  targetAssetData,
  tokenPricesData,
  providerFeeData,
  sourceWallet,
  sourceTokens,
  sourceToken,
  amountData,
  maxAmountData,
  isUsingRelayer,
  tokenError,
  onSearchToken,
  onSelectToken,
  onConnectToNetwork,
  onAmountChanged,
  onMaxAmountRetry,
}) => {
  function renderRelayerMessage() {
    if (
      sourceToken &&
      providerFeeData.data &&
      !providerFeeData.error &&
      isUsingRelayer &&
      !providerFeeData.data.relayable
    ) {
      return (
        <HintMessage
          type="error"
          message='No relayer for this token. Disable "Auto Relay" in Settings and redeem manually on destination.'
        />
      );
    }
  }

  function renderAmountError() {
    if (
      amountData.amountValidationInfo.data?.transferAmountError?.name === amountErrorNameInsufficientXcGLMR ||
      amountData.amountValidationInfo.data?.transferAmountError?.name === amountErrorNameLowerThanExistentialDeposit
    ) {
      return <HintMessage type="error" message={amountData.amountValidationInfo.data?.transferAmountError?.message} />;
    } else if (amountData.amountValidationInfo.data?.transferAmountError === amountErrorInsufficientBalance) {
      return (
        <HintMessage
          type="error"
          message={`Insufficient balance for relayer fee. Top up your wallet or disable "Auto Relay" in Settings.`}
        />
      );
    } else if (amountData.amountValidationInfo.data?.transferAmountError === amountErrorInsufficientBalanceForMRLFee) {
      return (
        <HintMessage
          type="error"
          message={`Insufficient balance for MRL fee. Please deposit enough tokens then bridge again.`}
        />
      );
    } else if (amountData.amountValidationInfo.data?.transferAmountError === amountErrorZero) {
      return <HintMessage type="error" message="Input amount cannot be 0." />;
    } else if (amountData.amountValidationInfo.data?.transferAmountError === amountErrorLessThanEightDecimals) {
      return <HintMessage type="error" message={`Input amount cannot be less than ${minimumAmount}.`} />;
    } else if (
      amountData.amountValidationInfo.data?.transferAmountError === amountErrorExceedsMaxAmount &&
      maxAmountData.data
    ) {
      return (
        <HintMessage type="error" message={`Input amount cannot be more than ${maxAmountData.data.maxAmountString}.`} />
      );
    }
  }

  function renderBridgeLimitError() {
    if (
      sourceToken &&
      !amountData.amountValidationInfo.data?.transferAmountError &&
      bridgeLimitData.data?.limitExceeded
    ) {
      if (bridgeLimitData.data.maxBridgeLimit.isZero()) {
        return <HintMessage type="error" message={`Bridge maximum safe amount has been reached.`} />;
      }

      return (
        <HintMessage
          type="error"
          message={`Input amount cannot be more than ${bridgeLimitData.data.maxBridgeLimitUI}.`}
        />
      );
    }
  }

  function renderError() {
    if (targetAssetData.error === errorTokenIsNotSupportedOnPolkachain) {
      return <HintMessage type="error" message={targetAssetData.error.message} />;
    } else if (targetAssetData.error) {
      return (
        <HintMessage
          type="error"
          message={
            <>
              Error happens on fetch destination token address.{' '}
              <A className={styleRetryLink} onClick={targetAssetData.retry}>
                Retry
              </A>
            </>
          }
        />
      );
    } else if (tokenPricesData.error) {
      return (
        <HintMessage
          type="error"
          message={
            <>
              Error happens on fetch token price.{' '}
              <A className={styleRetryLink} onClick={tokenPricesData.retry}>
                Retry
              </A>
            </>
          }
        />
      );
    } else if (providerFeeData.error) {
      // error in fetching coingecko prices or evm gas prices
      return (
        <HintMessage
          type="error"
          message={
            <>
              Error happens on relayer fees estimation.{' '}
              <A className={styleRetryLink} onClick={providerFeeData.retry}>
                Retry
              </A>
            </>
          }
        />
      );
    } else if (maxAmountData.error) {
      return (
        <HintMessage
          type="error"
          message={
            <>
              Error happens on loading max amount.{' '}
              <A
                className={styleRetryLink}
                onClick={() => {
                  onMaxAmountRetry();
                }}>
                Retry
              </A>
            </>
          }
        />
      );
    } else if (tokenError === errorTokenIsDisabled) {
      return (
        <HintMessage
          type="error"
          message="Selected token is temporarily disabled. Please select another token or contact us."
        />
      );
    }
  }

  return (
    <div className={cx(TokenSectionWrapper, className)}>
      <div className={FlexRow}>
        <div className={FontStyle}>Amount</div>
        {sourceToken?.uiAmount != null ? (
          <div className={balanceWrap}>
            <span className="balanceLabel">Balance:</span>
            <span className={FontStyle}>{formatAmount(sourceToken.uiAmount)}</span>
          </div>
        ) : null}
      </div>
      <div className={cx(TokenInputWrapper, disabled ? styleDisabled : undefined)}>
        <TokenSelectorButton
          disabled={disabled}
          enableWalletErrorTips={enableWalletErrorTips}
          sourceChainId={sourceChainId}
          sourceWallet={sourceWallet}
          sourceTokens={sourceTokens}
          sourceToken={sourceToken}
          onSearchToken={onSearchToken}
          onSelectToken={onSelectToken}
          onConnectToNetwork={onConnectToNetwork}
        />

        <AmountInput
          disabled={disabled}
          sourceToken={sourceToken}
          amountData={amountData}
          onAmountChanged={onAmountChanged}
        />

        <MaxAmountButton
          disabled={disabled}
          sourceToken={sourceToken}
          maxAmountData={maxAmountData}
          onAmountChanged={onAmountChanged}
        />
      </div>

      {renderRelayerMessage()}

      {renderAmountError()}

      {renderBridgeLimitError()}

      {renderError()}

      <div className={styleInfos}>
        <EstimatedFees bridgeFee={bridgeFee} providerFeeData={providerFeeData} isUsingRelayer={isUsingRelayer} />
        <EstimatedTime sourceChainId={sourceChainId} />
        <div className={AlignRight}>
          <EstimatedTotal sourceToken={sourceToken} amountData={amountData} providerFeeData={providerFeeData} />
        </div>
      </div>
    </div>
  );
};

const TokenSectionWrapper = css`
  display: flex;
  flex-direction: column;
  width: ${pxToPcVw(588)};
  border: ${pxToPcVw(2)} solid var(--color-border);
  border-radius: ${pxToPcVw(8)};
  padding: ${pxToPcVw(16)};
  gap: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    width: 100%;
    border: ${pxToMobileVw(2)} solid var(--color-border);
    border-radius: ${pxToMobileVw(8)};
    padding: ${pxToMobileVw(16)};
    gap: ${pxToMobileVw(16)};
  }
`;

const TokenInputWrapper = css`
  display: flex;
  align-items: center;
  background: var(--ant-primary-color);
  width: ${pxToPcVw(553)};
  height: ${pxToPcVw(64)};
  border-radius: ${pxToPcVw(8)};
  padding-inline: ${pxToPcVw(12)};

  @media (max-width: 1024px) {
    width: auto;
    height: ${pxToMobileVw(64)};
    border-radius: ${pxToMobileVw(8)};
    padding-inline: ${pxToMobileVw(12)};
  }
`;

const styleInfos = css`
  display: flex;

  @media (max-width: 1024px) {
    flex-wrap: wrap;
  }
`;

const AlignRight = css`
  margin-left: auto;

  @media (max-width: 1024px) {
    margin-left: 0;
  }
`;

const FontStyle = css`
  font-size: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(16)};
  }
`;

const FlexRow = css`
  display: flex;
  justify-content: space-between;
`;

const styleRetryLink = css`
  font-weight: 600;
`;

const balanceWrap = css`
  display: inline-flex;
  align-items: center;
  gap: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(8)};
  }

  .balanceLabel {
    font-size: ${pxToPcVw(14)};
    font-weight: 400;
    color: var(--color-text-3);

    @media (max-width: 1024px) {
      font-size: ${pxToMobileVw(14)};
    }
  }
`;
