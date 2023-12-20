import React from 'react';

import { Logo } from './Logo';
import TokenIconPlaceholder from '../../assets/icons/question-mark.svg';
import QuickswapIcon from '../../assets/pngs/dex-icons/quickswap.png';
import UniswapIcon from '../../assets/pngs/dex-icons/uniswap.png';
import { XSwapHopDexEnum } from '../../indexer-client';

interface Props
  extends Omit<React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>, 'src'> {
  dexName?: XSwapHopDexEnum;
}

export const DexIcon: React.SFC<Props> = ({ dexName, ...restProps }) => {
  const src =
    dexName === XSwapHopDexEnum.Quickswap ? QuickswapIcon : dexName === XSwapHopDexEnum.UniswapV2 ? UniswapIcon : '';

  return (
    <Logo
      {...restProps}
      src={src || TokenIconPlaceholder}
      onError={({ currentTarget }) => {
        currentTarget.src = TokenIconPlaceholder;
      }}
    />
  );
};
