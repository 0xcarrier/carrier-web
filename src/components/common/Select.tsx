import React from 'react';

import { css, cx } from '@linaria/core';
import { Select as AntSelect, SelectProps } from 'antd';
import { DefaultOptionType } from 'antd/lib/select';

import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';

interface Props extends SelectProps<any, DefaultOptionType> {
  className?: string;
}

export const Select: React.SFC<Props> = ({ className, ...restProps }) => {
  return <AntSelect {...restProps} className={cx(className, styleSelect)} />;
};

const styleSelect = css`
  height: ${pxToPcVw(40)};

  @media (max-width: 1024px) {
    height: ${pxToMobileVw(40)};
  }
`;
