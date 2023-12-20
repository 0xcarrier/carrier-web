import React, { ReactNode, useState } from 'react';

import { css, cx } from '@linaria/core';

import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { SVGIcon } from './SVGIcon';

type Props = {
  className?: Partial<Record<'container' | 'icon' | 'text', string>>;
  type?: 'warning' | 'info' | 'error' | 'success';
  closable?: boolean;
  message: ReactNode;
};

export const InfoBanner = ({ className, type = 'info', closable = false, message }: Props) => {
  const [visible, setVisible] = useState(true);

  return visible ? (
    <div
      className={cx(
        infoBannerContainer,
        type === 'info'
          ? styleInfo
          : type === 'warning'
          ? styleWarning
          : type === 'error'
          ? styleError
          : type === 'success'
          ? styleSuccess
          : undefined,
        className?.container,
      )}>
      <SVGIcon className={cx(infoIcon, className?.icon)} iconName="info-circle-outline" />
      <div className={cx(infoText, className?.text)}>{message}</div>
      {closable ? (
        <SVGIcon
          className={cx(styleCloseIcon)}
          iconName="close"
          onClick={() => {
            setVisible(false);
          }}
        />
      ) : null}
    </div>
  ) : null;
};

const infoBannerContainer = css`
  display: flex;
  flex-direction: row;
  align-items: center;
  background-color: #2d41a780;
  gap: ${pxToPcVw(12)};
  padding: ${pxToPcVw(12)} ${pxToPcVw(16)};
  border: ${pxToPcVw(2)} solid var(--ant-primary-color);
  border-radius: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(8)};
    padding: ${pxToMobileVw(8)} ${pxToMobileVw(12)};
    border-width: ${pxToMobileVw(2)};
    border-radius: ${pxToMobileVw(8)};
  }
`;

const infoIcon = css`
  width: ${pxToPcVw(22)};
  height: ${pxToPcVw(22)};
  flex-shrink: 0;

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(22)};
    height: ${pxToMobileVw(22)};
  }
`;

const infoText = css`
  font-weight: 400;
  font-size: ${pxToPcVw(14)};
  letter-spacing: 0.01em;
  line-height: 1.2em;

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(14)};
  }
`;

const styleCloseIcon = css`
  margin-left: auto;
  cursor: pointer;
  width: ${pxToPcVw(14)};
  height: ${pxToPcVw(14)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(14)};
    height: ${pxToMobileVw(14)};
  }
`;

const styleInfo = css`
  border-color: var(--ant-primary-color);
  background-color: #2d41a780;
  color: var(--color-text-3);

  & > * {
    fill: var(--ant-primary-4);
  }
`;

const styleWarning = css`
  border-color: #978800;
  background-color: #554d00;
  color: rgba(255, 255, 255, 0.8);

  & > * {
    fill: #978800;
  }
`;

const styleError = css`
  border-color: var(--color-error);
  background-color: #4f0909;
  color: #fff;

  & > * {
    fill: var(--color-error);
  }
`;

const styleSuccess = css`
  border-color: var(--color-success);
  background-color: #014206;
  color: #fff;

  & > * {
    fill: var(--color-success);
  }
`;
