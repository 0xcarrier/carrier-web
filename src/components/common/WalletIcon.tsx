import React from 'react';
import questionMark from '../../assets/icons/question-mark.svg';
import { css, cx } from '@linaria/core';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';

type Props = {
  className?: string;
  icon?: string;
};

export const WalletIcon = ({ className, icon }: Props) => {
  return <img className={cx(styleIcon, className)} src={icon || questionMark} />;
};

const styleIcon = css`
  width: ${pxToPcVw(26)};
  height: ${pxToPcVw(26)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(26)};
    height: ${pxToMobileVw(26)};
  }
`;
