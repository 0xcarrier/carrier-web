import React from 'react';

import { Logo } from './Logo';
import { getChainInfo } from '../../utils/web3Utils';
import TokenIconPlaceholder from '../../assets/icons/question-mark.svg';
import { CarrierChainId } from '../../utils/consts';

interface Props
  extends Omit<React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>, 'src'> {
  chainId?: CarrierChainId;
}

export const ChainLogo: React.SFC<Props> = ({ chainId, ...restProps }) => {
  return (
    <Logo
      {...restProps}
      src={(chainId ? getChainInfo(chainId).logo : undefined) || TokenIconPlaceholder}
      onError={({ currentTarget }) => {
        currentTarget.onerror = null;
        currentTarget.src = TokenIconPlaceholder;
      }}
    />
  );
};
