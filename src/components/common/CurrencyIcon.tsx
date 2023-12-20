import React from 'react';

import { Logo } from './Logo';
import TokenIconPlaceholder from '../../assets/icons/question-mark.svg';

interface Props extends React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement> {
  src?: string;
  symbol?: string;
}

export const CurrencyIcon: React.SFC<Props> = ({ src, symbol, ...restProps }) => {
  const staticSVGIconUrl = symbol
    ? `https://unpkg.com/cryptocurrency-icons@0.18.1/svg/icon/${encodeURI(symbol).toLowerCase()}.svg`
    : undefined;

  return (
    <Logo
      {...restProps}
      src={src || staticSVGIconUrl || TokenIconPlaceholder}
      onError={({ currentTarget }) => {
        if (symbol && staticSVGIconUrl && currentTarget.src !== staticSVGIconUrl) {
          currentTarget.src = staticSVGIconUrl;
        } else {
          currentTarget.src = TokenIconPlaceholder;
        }
      }}
    />
  );
};
