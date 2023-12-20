import React from 'react';

import { css, cx } from '@linaria/core';

interface Props extends React.AnchorHTMLAttributes<HTMLAnchorElement> {}

export const A: React.SFC<Props> = ({ className, ...restProps }) => {
  return <a {...restProps} className={cx(styleA, className)} />;
};

const styleA = css`
  transition: color 0.15s ease-in;
  text-decoration: none;
  color: var(--ant-primary-5);

  & * {
    transition: color 0.15s ease-in;
    fill: var(--ant-primary-5);
    stroke: var(--ant-primary-5);
  }

  &:visited {
    text-decoration: underline;
    color: var(--ant-primary-5);

    & * {
      fill: var(--ant-primary-5);
      stroke: var(--ant-primary-5);
    }
  }

  &:hover {
    text-decoration: none;
    color: var(--ant-primary-4);

    & * {
      fill: var(--ant-primary-4);
      stroke: var(--ant-primary-4);
    }
  }
`;
