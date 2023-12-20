import React, { useEffect, useState } from 'react';
import { css } from '@linaria/core';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { AmountData } from '../../hooks/useAmountData';
import { TokenData } from '../../utils/tokenData/helper';
import { useDebouncedCallback } from 'use-debounce';

interface Props {
  disabled?: boolean;
  token?: TokenData;
  amountData: AmountData;
  onAmountChanged: (amountString: string) => void;
}

export const AmountInput: React.SFC<Props> = ({ token, disabled, amountData, onAmountChanged }) => {
  const [inputValue, setInputValue] = useState(amountData.transferAmountString);
  const onAmountChangedWithDebounce = useDebouncedCallback(onAmountChanged, 1000);

  useEffect(() => {
    setInputValue(amountData.transferAmountString);
  }, [amountData.transferAmountString]);

  return (
    <div className={styleAmountWrapper}>
      <input
        className={TokenAmount}
        type="text"
        placeholder="0.00"
        value={inputValue || ''}
        disabled={!token || disabled}
        onChange={(event) => {
          if (token) {
            const input = validateTokenInput(amountData.transferAmountString, event.target.value, token.decimals);

            setInputValue(input);

            onAmountChangedWithDebounce(input);
          }
        }}
      />
    </div>
  );
};

const getInputDecimals = (input: string) => {
  const index = input.indexOf('.');
  return input.slice(index + 1).length;
};

const truncatedAmount = (input: string, tokenDecimals: number) => {
  const index = input.indexOf('.');
  return input.slice(0, index + 1 + tokenDecimals);
};

const validateTokenInput = (prevInput: string, input: string, tokenDecimals: number) => {
  //this validation only allows digits and a single dot. Dot must not be first occurence.
  if (!input || input === '.') {
    return '';
  }
  if (!input.match(/^[0-9]*\.?[0-9]*$/g)) {
    return prevInput;
  }
  if (getInputDecimals(input) > tokenDecimals) {
    return truncatedAmount(input, tokenDecimals);
  }
  if (getInputDecimals(input) <= tokenDecimals) {
    return input;
  }
  return '';
};

const styleAmountWrapper = css`
  flex-grow: 1;
  flex-shrink: 1;
  background: var(--ant-primary-color);
  height: ${pxToPcVw(40)};
  margin-left: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    height: ${pxToMobileVw(40)};
    margin-left: ${pxToMobileVw(8)};
  }
`;

const TokenAmount = css`
  width: 100%;
  height: 100%;
  border: none;
  font-size: ${pxToPcVw(24)};
  font-weight: 600;
  background-color: transparent;
  padding: 0;
  letter-spacing: 0.033em;

  &:focus {
    outline: none;
  }

  ::-moz-selection {
    /* Code for Firefox */
    background: var(--ant-primary-1);
  }

  ::selection {
    background: var(--ant-primary-1);
  }

  ::placeholder {
    /* Chrome, Firefox, Opera, Safari 10.1+ */
    color: var(--color-text-secondary);
    opacity: 1; /* Firefox */
  }

  :ms-input-placeholder {
    /* Internet Explorer 10-11 */
    color: var(--color-text-secondary);
  }

  ::ms-input-placeholder {
    /* Microsoft Edge */
    color: var(--color-text-secondary);
  }

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(24)};
  }
`;
