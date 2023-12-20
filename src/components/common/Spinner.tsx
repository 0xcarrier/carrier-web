import React from 'react';

import { css, cx } from '@linaria/core';

import SpinnerIcon from '../../assets/pngs/spinner.png';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';

interface Props {
  className?: string;
}

export const Spinner: React.SFC<Props> = ({ className }) => {
  return <img className={cx(styleSpinner, className)} src={SpinnerIcon} />;
};

const styleSpinner = css`
  animation: spin 4s linear infinite;
  animation-fill-mode: backwards;
  transform-origin: center;
  width: ${pxToPcVw(20)};
  height: ${pxToPcVw(20)};

  @keyframes spin {
    0% {
      transform: rotate(360deg);
    }
    100% {
      transform: rotate(0deg);
    }
  }

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(20)};
    height: ${pxToMobileVw(20)};
  }
`;
