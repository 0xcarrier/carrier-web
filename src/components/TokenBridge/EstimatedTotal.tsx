import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import Tooltip from '../common/Tooltip';
import { css } from '@linaria/core';
import BigNumber from 'bignumber.js';
import React from 'react';
import { formatAmount } from '../../utils/format-amount';
import { ethers } from 'ethers';
import { parseAmount } from '../../utils/web3Utils';
import { SVGIcon } from '../common/SVGIcon';
import { DataResult } from '../../hooks/useData';
import { AmountData } from '../../hooks/useAmountData';
import { TokenData } from '../../utils/tokenData/helper';
import { Loading } from '../common/Loading';
import { ProviderFeeData } from '../../hooks/useProviderFeeData';

interface Props {
  sourceToken?: TokenData;
  amountData: AmountData;
  providerFeeData: DataResult<ProviderFeeData | undefined>;
}

const EstimatedTotal: React.SFC<Props> = ({ sourceToken, providerFeeData, amountData }) => {
  return (
    <div className={FlexRow}>
      <Loading
        loading={amountData.amountValidationInfo.loading || providerFeeData.loading}
        render={() => {
          const feeParsed =
            providerFeeData.data?.hasFees && providerFeeData.data.totalFeeParsed
              ? providerFeeData.data.totalFeeParsed
              : ethers.BigNumber.from(0);
          const transferAmountParsedInWei = amountData.amountValidationInfo.data?.transferAmountParsed
            ? amountData.amountValidationInfo.data.transferAmountParsed.add(feeParsed)
            : undefined;
          const transferAmountParsed =
            transferAmountParsedInWei && sourceToken
              ? ethers.utils.formatUnits(transferAmountParsedInWei, sourceToken.decimals)
              : undefined;

          return (
            <>
              <div className={LightFont}>Total</div>
              <Tooltip
                disableIcon={true}
                tooltipText={<div>Total estimated value to bridge on source chain</div>}
                content={<SVGIcon className={styleEstimatedMinIcon} iconName="min-amount" />}
              />
              <div className={LightFont}>
                {transferAmountParsed && sourceToken
                  ? `${formatAmount(BigNumber(transferAmountParsed.toString()))} ${sourceToken.symbol}`
                  : '-'}
              </div>
            </>
          );
        }}
      />
    </div>
  );
};

export default EstimatedTotal;

const FlexRow = css`
  display: flex;
  align-items: center;
  padding-left: ${pxToPcVw(8)};
  gap: ${pxToPcVw(12)};

  @media (max-width: 1024px) {
    padding-left: ${pxToMobileVw(8)};
    gap: ${pxToMobileVw(12)};
  }
`;

const styleEstimatedMinIcon = css`
  width: ${pxToPcVw(18)};
  height: ${pxToPcVw(18)};

  & > * {
    fill: var(--ant-primary-4);
  }

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(18)};
    height: ${pxToMobileVw(18)};
  }
`;

const LightFont = css`
  font-weight: 400;
`;
