import { css, cx } from '@linaria/core';
import React from 'react';
import { DataResult } from '../../hooks/useData';
import { formatAmount } from '../../utils/format-amount';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { TokenData } from '../../utils/tokenData/helper';
import { AmountInput } from './AmountInput';
import { AmountData } from '../../hooks/useAmountData';
import { MaxAmountData } from '../../hooks/useMaxAmoutData';
import { MaxAmountButton } from './MaxAmountButton';
import { styleDisabled } from '../../utils/styles';
import { TokenSelectorButton } from './TokenSelectorButton';
import { Wallet } from '../../hooks/useWallet';
import { TokensData } from '../../hooks/useTokens';

interface Props {
  className?: string;
  enableWalletErrorTips?: boolean;
  disabled?: boolean;
  sourceWallet?: Wallet;
  tokens: TokensData;
  token?: TokenData;
  amountData: AmountData;
  maxAmountData: DataResult<MaxAmountData | undefined>;
  onAmountChanged: (amountString: string) => void;
  onSearchToken: (options: { tokenAddress: string }) => void;
  onSelectToken: (options: { tokenAddress: string }) => void;
  onConnectToNetwork?: () => void;
}

export const TokenSelectorSection: React.SFC<Props> = ({
  className,
  enableWalletErrorTips,
  disabled,
  sourceWallet,
  tokens,
  token,
  amountData,
  maxAmountData,
  onAmountChanged,
  onSearchToken,
  onSelectToken,
  onConnectToNetwork,
}) => {
  return (
    <div className={cx(TokenSectionWrapper, className)}>
      <div className={FlexRow}>
        <div className={FontStyle}>Amount</div>
        {token?.uiAmount != null ? (
          <div className={balanceWrap}>
            <span className="balanceLabel">Balance:</span>
            <span className={FontStyle}>{formatAmount(token.uiAmount)}</span>
          </div>
        ) : null}
      </div>
      <div className={cx(TokenInputWrapper, disabled ? styleDisabled : undefined)}>
        <TokenSelectorButton
          disabled={disabled}
          enableWalletErrorTips={enableWalletErrorTips}
          sourceWallet={sourceWallet}
          token={token}
          tokens={tokens}
          onSearchToken={onSearchToken}
          onSelectToken={onSelectToken}
          onConnectToNetwork={onConnectToNetwork}
        />
        <AmountInput disabled={disabled} token={token} amountData={amountData} onAmountChanged={onAmountChanged} />
        <MaxAmountButton
          disabled={disabled}
          token={token}
          maxAmountData={maxAmountData}
          onAmountChanged={onAmountChanged}
        />
      </div>
    </div>
  );
};

const TokenSectionWrapper = css`
  display: flex;
  flex-direction: column;
  gap: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    width: 100%;
    gap: ${pxToMobileVw(16)};
  }
`;

const TokenInputWrapper = css`
  display: flex;
  align-items: center;
  background: var(--ant-primary-color);
  height: ${pxToPcVw(56)};
  border-radius: ${pxToPcVw(8)};
  padding-inline: ${pxToPcVw(12)};

  @media (max-width: 1024px) {
    height: ${pxToMobileVw(56)};
    border-radius: ${pxToMobileVw(8)};
    padding-inline: ${pxToMobileVw(12)};
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
