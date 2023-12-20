import React from 'react';

import { css, cx } from '@linaria/core';
import { Radio as AntRadio, RadioGroupProps, RadioProps } from 'antd';

import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';

interface Props extends RadioProps {
  className?: string;
}

export const Radio: React.SFC<Props> = ({ className, ...restProps }) => {
  return <AntRadio {...restProps} className={cx(className, styleRadio)} />;
};

interface GroupProps extends RadioGroupProps {
  className?: string;
}

export const RadioGroup: React.SFC<GroupProps> = ({ className, ...restProps }) => {
  return <AntRadio.Group {...restProps} className={cx(className, styleRadio)} />;
};

const styleRadio = css`
  display: flex;
  gap: ${pxToPcVw(16)};

  .ant-radio-wrapper {
    display: flex;
    align-items: center;
    font-weight: 400;
    margin-right: 0;
    font-size: ${pxToPcVw(14)};

    &:hover {
      .ant-radio {
        border: solid ${pxToPcVw(2)} var(--ant-primary-5);

        .ant-radio-inner {
          &::after {
            background-color: var(--ant-primary-5);
          }
        }

        &.ant-radio-disabled {
          border: solid ${pxToPcVw(2)} var(--color-border);

          .ant-radio-inner {
            &::after {
              background-color: var(--color-border);
            }
          }
        }
      }
    }

    .ant-radio {
      border-radius: 50%;
      top: auto;
      transition: border 0.5s;
      border: solid ${pxToPcVw(2)} var(--color-border);
      height: ${pxToPcVw(20)};
      width: ${pxToPcVw(20)};

      & + * {
        color: var(--color-text-3);
        transition: color 0.5s;
        padding: 0;
        margin-left: ${pxToPcVw(8)};
      }

      &.ant-radio-checked + * {
        color: #fff;
      }

      .ant-radio-inner {
        background-color: transparent;
        border: none;
        width: 100%;
        height: 100%;

        &::after {
          border-radius: 50%;
          margin: 0;
          background-color: var(--color-border);
          transition: background-color 0.5s;
          transform: translateX(-50%) translateY(-50%);
          height: ${pxToPcVw(10)};
          width: ${pxToPcVw(10)};
        }
      }

      &.ant-radio-disabled {
        & + * {
          color: var(--color-text-3);
        }

        &.ant-radio-checked + * {
          color: #fff;
        }

        .ant-radio-inner {
          &::after {
            background-color: var(--color-border);
          }
        }
      }
    }
  }

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(16)};

    .ant-radio-wrapper {
      font-size: ${pxToMobileVw(14)};

      .ant-radio {
        height: ${pxToMobileVw(20)};
        width: ${pxToMobileVw(20)};
        border: solid ${pxToMobileVw(2)} var(--color-border);

        & + * {
          margin-left: ${pxToMobileVw(8)};
        }

        .ant-radio-inner {
          &::after {
            height: ${pxToMobileVw(10)};
            width: ${pxToMobileVw(10)};
          }
        }
      }
    }
  }
`;
