import React, { ReactNode } from 'react';

import { css, cx } from '@linaria/core';
import { Tooltip as AntdTooltip } from 'antd';
import { TooltipPropsWithOverlay } from 'antd/lib/tooltip';

import InfoCircle from '../../assets/icons/info-circle-outline.svg?inline';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';

interface Props extends Omit<TooltipPropsWithOverlay, 'children'> {
  className?: string;
  tooltipText: string | ReactNode;
  disableIcon?: boolean;
  content?: ReactNode;
}

function Tooltip({ className, overlayClassName, tooltipText, disableIcon, content, trigger, ...restProps }: Props) {
  return (
    <AntdTooltip
      overlayClassName={cx(styleOverlay, overlayClassName)}
      trigger={trigger || ['hover', 'click']}
      title={tooltipText}
      {...restProps}>
      {!disableIcon && <InfoCircle className={cx(styleIcon, className)} />}
      {content && <>{content}</>}
    </AntdTooltip>
  );
}

const styleOverlay = css`
  --tooltip-border-color: #0085ff;

  .ant-tooltip-inner {
    background-color: var(--ant-primary-color);
    padding: ${pxToPcVw(16)};
    border-radius: ${pxToPcVw(8)};
    border: solid ${pxToPcVw(2)} var(--tooltip-border-color);
  }

  .ant-tooltip-arrow {
    bottom: ${pxToPcVw(2)};

    .ant-tooltip-arrow-content {
      box-shadow: ${pxToPcVw(1)} ${pxToPcVw(1)} 0 ${pxToPcVw(1.5)} var(--tooltip-border-color);

      &::before {
        background: var(--ant-primary-color);
      }
    }
  }

  @media (max-width: 1024px) {
    .ant-tooltip-inner {
      padding: ${pxToMobileVw(16)};
      border-radius: ${pxToMobileVw(8)};
      border-width: ${pxToMobileVw(2)};
    }

    .ant-tooltip-arrow {
      bottom: ${pxToMobileVw(2)};

      .ant-tooltip-arrow-content {
        box-shadow: ${pxToMobileVw(1)} ${pxToMobileVw(1)} 0 ${pxToMobileVw(1.5)} var(--tooltip-border-color);
      }
    }
  }
`;

const styleIcon = css`
  vertical-align: middle;
  width: ${pxToPcVw(20)};
  height: ${pxToPcVw(20)};
  cursor: pointer;

  & > * {
    fill: var(--ant-primary-4);
  }

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(20)};
    height: ${pxToMobileVw(20)};
  }
`;

export default Tooltip;
