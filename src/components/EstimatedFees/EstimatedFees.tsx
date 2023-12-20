import { css } from '@linaria/core';
import React from 'react';
import { DataResult } from '../../hooks/useData';
import { roundOffFees } from '../../utils/fees';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { Loading } from '../common/Loading';
import { SVGIcon } from '../common/SVGIcon';
import Tooltip from '../common/Tooltip';
import { BridgeFee } from '../TokenBridge/hooks/useBridgeFee';
import { ProviderFeeData } from '../../hooks/useProviderFeeData';

interface Props {
  isUsingRelayer: boolean;
  bridgeFee: BridgeFee;
  providerFeeData?: DataResult<ProviderFeeData | undefined>;
}

export const EstimatedFees: React.SFC<Props> = ({
  isUsingRelayer,
  bridgeFee: { feeData, totalFees },
  providerFeeData,
}) => {
  return (
    <div className={FlexRow}>
      <Loading
        loading={feeData.loading || (providerFeeData ? providerFeeData.loading : false)}
        error={feeData.error || (providerFeeData ? providerFeeData.error : undefined)}
        renderError={() => {
          return <div className={LightFont}>-</div>;
        }}
        render={() => {
          return (
            <>
              <Tooltip
                disableIcon={true}
                tooltipText={
                  <>
                    <div className={FlexRow}>
                      <div>${feeData.data?.sourceFee ? `${roundOffFees(feeData.data.sourceFee)}` : '0.00'}</div> Source
                      fee
                    </div>
                    <div className={FlexRow}>
                      <div>${feeData.data?.targetFee ? `${roundOffFees(feeData.data.targetFee)}` : '0.00'}</div>{' '}
                      Destination fee
                    </div>
                    {isUsingRelayer ? (
                      <div className={FlexRow}>
                        <div>${providerFeeData?.data?.relayerUsdString || '0.00'}</div> Relayer fee
                      </div>
                    ) : null}
                    {providerFeeData?.data?.isUsingMRL ? (
                      <div className={FlexRow}>
                        <div>${providerFeeData.data.MRLUsdString || '0.00'}</div> XCM Message fee
                      </div>
                    ) : null}
                  </>
                }
                content={<SVGIcon className={styleEstimatedGasIcon} iconName="estimated-gas" />}
              />
              <div className={LightFont}>{totalFees ? `$${roundOffFees(totalFees)}` : '-'}</div>
            </>
          );
        }}
      />
    </div>
  );
};

const FlexRow = css`
  display: flex;
  align-items: center;
  gap: ${pxToPcVw(12)};
  padding-right: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(12)};
    padding-right: ${pxToMobileVw(8)};
  }
`;

const styleEstimatedGasIcon = css`
  width: ${pxToPcVw(15)};
  height: ${pxToPcVw(18)};

  & > * {
    fill: var(--ant-primary-4);
  }

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(15)};
    height: ${pxToMobileVw(18)};
  }
`;

const LightFont = css`
  font-weight: 400;
`;
