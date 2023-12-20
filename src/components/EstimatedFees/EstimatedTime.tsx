import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import Tooltip from '../common/Tooltip';
import { CHAIN_ID_ETH } from '@certusone/wormhole-sdk';
import { css } from '@linaria/core';
import React from 'react';
import { SVGIcon } from '../common/SVGIcon';
import { CarrierChainId } from '../../utils/consts';

interface EstimatedTimeMapping {
  [key: string]: { min: number; max: number };
}

const estimatedTimeMapping: EstimatedTimeMapping = {
  [CHAIN_ID_ETH]: { min: 25, max: 30 },
  //all other chains are approximately 5min
};

interface Props {
  sourceChainId?: CarrierChainId;
}

export const EstimatedTime: React.SFC<Props> = ({ sourceChainId }) => {
  return (
    <div className={FlexRow}>
      <Tooltip
        disableIcon={true}
        tooltipText={<div>Estimated time to complete the transaction.</div>}
        content={<SVGIcon className={styleEstimatedTimeIcon} iconName="estimated-time" />}
      />
      <div className={LightFont}>
        {sourceChainId === CHAIN_ID_ETH &&
          `${estimatedTimeMapping[sourceChainId].min}-${estimatedTimeMapping[sourceChainId].max} min`}
        {sourceChainId && sourceChainId !== CHAIN_ID_ETH && !estimatedTimeMapping[sourceChainId] && '3-5 min'}
      </div>
    </div>
  );
};

const FlexRow = css`
  display: flex;
  align-items: center;
  gap: ${pxToPcVw(12)};
  padding-inline: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(12)};
    padding-inline: ${pxToMobileVw(8)};
  }
`;

const styleEstimatedTimeIcon = css`
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
