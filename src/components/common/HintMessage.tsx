import React, { ReactNode } from 'react';

import { css, cx } from '@linaria/core';

import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { SVGIcon } from './SVGIcon';

type Props = {
  className?: Partial<Record<'wrapper' | 'icon' | 'message', string>>;
  message: ReactNode | string | undefined;
  type: 'error' | 'tips';
};

export const HintMessage = ({ className, type, message }: Props) => {
  if (!message) {
    return null;
  }

  return (
    <div className={cx(messageWrapper, className?.wrapper)}>
      <SVGIcon
        className={cx(messageIcon, type === 'error' ? errorIcon : hintIcon, className?.icon)}
        iconName={type === 'error' ? 'exclaimation-circle' : 'info-circle'}
      />
      <div className={cx(messageText, type === 'error' ? errorMessage : tipsMessage, className?.message)}>
        {message}
      </div>
    </div>
  );
};

const messageWrapper = css`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  font-weight: 400;
  line-height: 1.25;
  gap: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(8)};
  }

  > svg {
    flex-shrink: 0;
    margin-top: ${pxToPcVw(-3)};

    @media (max-width: 1024px) {
      margin-top: ${pxToMobileVw(-3)};
    }
  }
`;

const messageText = css`
  font-size: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(16)};
  }
`;

const errorMessage = css`
  color: var(--color-error);
`;

const tipsMessage = css`
  color: var(--color-text-3);
`;

const messageIcon = css`
  width: ${pxToPcVw(24)};
  height: ${pxToPcVw(24)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(24)};
    height: ${pxToMobileVw(24)};
  }
`;

const errorIcon = css`
  & > * {
    fill: var(--color-error);
  }
`;

const hintIcon = css`
  & > * {
    fill: var(--color-text-3);
  }
`;
