import React from 'react';
import { EstimatedFees } from '../EstimatedFees/EstimatedFees';
import { BridgeFee } from './hooks/useBridgeFee';
import { EstimatedTime } from '../EstimatedFees/EstimatedTime';
import { css } from '@linaria/core';
import { pxToPcVw } from '../../utils/style-evaluation';
import { SlippageTolerance } from './SlippageTolerance';
import { SlippageToleranceData } from './hooks/useSlippageTolerance';
import { MinValue } from './MinValue';
import { CarrierChainId } from '../../utils/consts';

interface Props {
  sourceChainId: CarrierChainId;
  bridgeFee: BridgeFee;
  slippageTolerance: SlippageToleranceData;
}

export const InfomationBar: React.SFC<Props> = ({ sourceChainId, bridgeFee, slippageTolerance }) => {
  return (
    <div className={styleInfos}>
      <div className={styleLeftColumn}>
        <EstimatedFees bridgeFee={bridgeFee} isUsingRelayer={false} />
        <EstimatedTime sourceChainId={sourceChainId} />
        <SlippageTolerance slippageTolerance={slippageTolerance} />
      </div>
      <div className={styleRightColumn}>
        <MinValue />
      </div>
    </div>
  );
};

const styleInfos = css`
  display: flex;
  align-items: center;

  @media (max-width: 1024px) {
    flex-direction: column;
    align-items: flex-start;
    gap: ${pxToPcVw(24)};
  }
`;

const styleLeftColumn = css`
  display: flex;
  align-items: center;
`;

const styleRightColumn = css`
  margin-left: auto;

  @media (max-width: 1024px) {
    margin-left: 0;
  }
`;
