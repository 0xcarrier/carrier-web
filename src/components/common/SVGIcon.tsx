import React from 'react';
import { HTMLAttributes, SVGProps } from 'react';

import { css, cx } from '@linaria/core';

import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { useData } from '../../hooks/useData';

interface Props extends Pick<HTMLAttributes<HTMLElement>, 'className'> {
  iconName: SVGIconName;
  className?: string;
  onClick?: () => void;
}

export const SVGIcon = ({ className, iconName, onClick }: Props) => {
  const { data, error, loading } = useData(async () => {
    const data = await import(`../../assets/icons/${iconName}.svg?inline`);

    return { Icon: data.default };
  }, [iconName]);

  if (error || loading || !data) {
    return <span className={stylePlaceholder} />;
  }

  return <data.Icon className={cx(svgIcon, className)} onClick={onClick} />;
};

const svgIcon = css`
  width: ${pxToPcVw(20)};
  height: ${pxToPcVw(20)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(20)};
    height: ${pxToMobileVw(20)};
  }
`;

const stylePlaceholder = css`
  display: inline-block;
  width: ${pxToPcVw(20)};
  height: ${pxToPcVw(20)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(20)};
    height: ${pxToMobileVw(20)};
  }
`;

export type SVGIconName =
  | 'arrow-left'
  | 'arrow-right'
  | 'arrow-path'
  | 'arrow-up-right'
  | 'arrow-up-tray'
  | 'arrow-uturn-right'
  | 'arrows-up-down'
  | 'arrow-right-zigzag'
  | 'chain-unlink'
  | 'check-circle'
  | 'chevron-down'
  | 'document-duplicate'
  | 'document-text'
  | 'exclaimation-circle'
  | 'exclaimation-triangle-outline'
  | 'info-circle'
  | 'info-circle-outline'
  | 'slippage'
  | 'search'
  | 'check'
  | 'close'
  | 'settings'
  | 'exclaimation-triangle'
  | 'swap'
  | 'swap-failed'
  | 'swap-round'
  | 'maximize-icon'
  | 'estimated-gas'
  | 'estimated-gas-total'
  | 'estimated-time'
  | 'dotted-circle'
  | 'arch-right-arrow'
  | 'bridge'
  | 'bridge-failed'
  | 'clipboard'
  | 'edit'
  | 'add'
  | 'house'
  | 'pigeon'
  | 'min-amount'
  | 'external-link'
  | 'eye'
  | 'wallet'
  | 'feather'
  | 'view-coo'
  | 'bird'
  | 'money'
  | 'money-total';
