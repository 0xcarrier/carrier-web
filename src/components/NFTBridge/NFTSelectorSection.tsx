import { css, cx } from '@linaria/core';
import React from 'react';
import { DataResult } from '../../hooks/useData';
import { TokensData } from '../../hooks/useTokens';
import { Wallet } from '../../hooks/useWallet';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { TokenData } from '../../utils/tokenData/helper';
import { HintMessage } from '../common/HintMessage';
import { NFTSelectorButton } from './NFTSelectorButton';
import { EstimatedFees } from '../EstimatedFees/EstimatedFees';
import { EstimatedTime } from '../EstimatedFees/EstimatedTime';
import { BridgeFee } from './hooks/useBridgeFee';
import { TokenPrice } from '../../utils/tokenPrices';
import { A } from '../common/A';
import { TargetAsset } from '../../hooks/useTargetAsset';
import { CarrierChainId } from '../../utils/consts';
import { errorTokenIsDisabled } from '../../hooks/useTokenError';

interface Props {
  className?: string;
  disabled?: boolean;
  enableWalletErrorTips: boolean;
  bridgeFee: BridgeFee;
  sourceChainId?: CarrierChainId;
  tokenPricesData: DataResult<TokenPrice | undefined>;
  targetAssetData: DataResult<TargetAsset | undefined>;
  sourceWallet: Wallet;
  sourceTokens: TokensData;
  sourceToken?: TokenData;
  tokenError: Error | undefined;
  onSearchToken: (options: { tokenAddress: string; tokenId?: string }) => void;
  onSelectToken: (options: { tokenAddress: string; tokenId?: string }) => void;
  onConnectToNetwork: () => void;
}

export const NFTSelectorSection: React.SFC<Props> = ({
  className,
  disabled,
  enableWalletErrorTips,
  bridgeFee,
  sourceChainId,
  tokenPricesData,
  targetAssetData,
  sourceWallet,
  sourceTokens,
  sourceToken,
  tokenError,
  onSearchToken,
  onSelectToken,
  onConnectToNetwork,
}) => {
  function renderError() {
    if (targetAssetData.error) {
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
        <div className={FontStyle}>NFT</div>
      </div>
      <NFTSelectorButton
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

      {renderError()}

      <div className={styleInfos}>
        <EstimatedFees bridgeFee={bridgeFee} isUsingRelayer={false} />
        <EstimatedTime sourceChainId={sourceChainId} />
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

const styleInfos = css`
  display: flex;

  @media (max-width: 1024px) {
    flex-wrap: wrap;
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
