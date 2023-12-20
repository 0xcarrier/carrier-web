import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import Tooltip from '../common/Tooltip';
import { css } from '@linaria/core';
import React from 'react';
import { SVGIcon } from '../common/SVGIcon';

interface Props {}

export const MinValue: React.SFC<Props> = ({}) => {
  return (
    <div className={FlexRow}>
      <Tooltip
        disableIcon={true}
        tooltipText={<div>Minimum value you will receive</div>}
        content={<SVGIcon className={styleIcon} iconName="min-amount" />}
      />
      <div className={LightFont}>-</div>
    </div>
  );
};

const FlexRow = css`
  display: flex;
  align-items: center;
  gap: ${pxToPcVw(12)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(12)};
  }
`;

const styleIcon = css`
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
