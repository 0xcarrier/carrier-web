import React from 'react';

import { css, cx } from '@linaria/core';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';

interface Props extends React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement> {
  src?: string;
  className?: string;
}

export const Logo: React.SFC<Props> = ({ src, className, ...restProps }) => {
  return <img {...restProps} className={cx(className, styleLogo)} src={src} />;
};

const styleLogo = css`
  flex-shrink: 0;
  object-fit: contain;
  height: ${pxToPcVw(32)};
  width: ${pxToPcVw(32)};

  @media (max-width: 1024px) {
    height: ${pxToMobileVw(32)};
    width: ${pxToMobileVw(32)};
  }
`;
