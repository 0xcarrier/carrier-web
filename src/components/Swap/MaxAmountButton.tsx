import React from 'react';
import { css } from '@linaria/core';
import { Button } from 'antd';
import { DataResult } from '../../hooks/useData';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { MaxAmountData } from '../../hooks/useMaxAmoutData';
import { Loading } from '../common/Loading';
import { toFixed } from '../../utils/web3Utils';
import { TokenData } from '../../utils/tokenData/helper';

interface Props {
  className?: string;
  disabled?: boolean;
  token?: TokenData;
  maxAmountData: DataResult<MaxAmountData | undefined>;
  onAmountChanged: (amountString: string) => void;
}

export const MaxAmountButton: React.SFC<Props> = ({ className, disabled, token, maxAmountData, onAmountChanged }) => {
  return (
    <div className={styleMaxButtonContainer}>
      <Loading
        options={maxAmountData}
        render={(maxAmountData) => {
          return (
            <Button
              className={MaxButton}
              type="primary"
              disabled={!maxAmountData || disabled}
              onClick={() => {
                if (maxAmountData && token) {
                  onAmountChanged(toFixed(maxAmountData.maxAmount, token.decimals));
                }
              }}>
              Max
            </Button>
          );
        }}
      />
    </div>
  );
};

const styleMaxButtonContainer = css`
  margin-left: auto;
`;

const MaxButton = css`
  display: flex;
  align-items: center;
  font-weight: 500;
  color: var(--ant-primary-5);
  height: ${pxToPcVw(40)};
  padding-inline: ${pxToPcVw(8)};
  font-size: ${pxToPcVw(16)};
  box-shadow: none;
  &:hover,
  &:focus {
    color: var(--ant-primary-5);
  }

  &:hover {
    opacity: 0.5;
  }

  &:disabled {
    background-color: transparent;

    &:hover,
    &:focus {
      background-color: transparent;
      opacity: 1;
    }
  }

  @media (max-width: 1024px) {
    height: ${pxToMobileVw(40)};
    padding-inline: ${pxToMobileVw(12)};
    font-size: ${pxToMobileVw(16)};
  }
`;
