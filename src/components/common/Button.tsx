import React from 'react';

import { Button as AntdButton, ButtonProps } from 'antd';
import { css, cx } from '@linaria/core';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';

interface Props extends Omit<ButtonProps, 'type'> {
  type: 'primary' | 'secondary' | 'tertiary';
}

export const Button: React.SFC<Props> = ({ className, type, ...restProps }) => {
  return (
    <AntdButton
      {...restProps}
      className={cx(
        styleButton,
        type === 'primary'
          ? styleButtonPrimary
          : type === 'secondary'
          ? styleButtonSecondary
          : type === 'tertiary'
          ? styleButtonTertiary
          : undefined,
        className,
      )}
    />
  );
};

const styleButton = css`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  color: #ffffff;
  font-weight: 600;
  gap: ${pxToPcVw(8)};
  height: ${pxToPcVw(56)};
  border-radius: ${pxToPcVw(8)};
  font-size: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(8)};
    height: ${pxToMobileVw(56)};
    border-radius: ${pxToMobileVw(8)};
    font-size: ${pxToMobileVw(16)};
  }
`;

const styleButtonPrimary = css`
  color: #fff;
  background-color: var(--ant-primary-4);
  border: solid ${pxToPcVw(2)} var(--ant-primary-4);

  &:focus,
  &:active {
    color: #fff;
    background-color: var(--ant-primary-4);
    border-color: var(--ant-primary-5);
  }

  &:hover {
    color: #fff;
    background-color: #357aff;
    border-color: #357aff;
  }

  &:disabled,
  &:disabled:hover {
    color: var(--ant-background);
    background-color: var(--ant-primary-color);
    border-color: var(--ant-primary-color);
    cursor: not-allowed;
    opacity: 1;

    & svg * {
      fill: var(--ant-background);
    }
  }

  &.ant-btn::before {
    // remove antd loading status background overlay
    display: none;
  }

  @media (max-width: 1024px) {
    border-width: ${pxToMobileVw(2)};
  }
`;

const styleButtonSecondary = css`
  color: #fff;
  background-color: var(--ant-primary-1);
  border: solid ${pxToPcVw(2)} var(--ant-primary-4);

  &:hover {
    color: #fff;
    background-color: var(--ant-primary-1);
    border-color: var(--ant-primary-5);
  }

  &:focus,
  &:active {
    color: #fff;
    background-color: var(--ant-background);
    border-color: var(--ant-primary-5);
  }

  &:disabled,
  &:disabled:hover {
    cursor: not-allowed;
    background-color: transparent;
    color: var(--color-border);
    border-color: var(--color-border);
  }

  @media (max-width: 1024px) {
    border-width: ${pxToMobileVw(2)};
  }
`;

const styleButtonTertiary = css`
  color: #fff;
  background-color: transparent;
  border: solid ${pxToPcVw(2)} var(--color-border);

  &:hover {
    color: #fff;
    background-color: transparent;
    border-color: var(--ant-primary-5);
  }

  &:focus,
  &:active {
    color: #fff;
    background-color: transparent;
    border-color: var(--ant-primary-5);
  }

  &:disabled,
  &:disabled:hover {
    cursor: not-allowed;
    background-color: transparent;
    color: var(--color-border);
    border-color: var(--color-border);
  }

  @media (max-width: 1024px) {
    border-width: ${pxToMobileVw(2)};
  }
`;
