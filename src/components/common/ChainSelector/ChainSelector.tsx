import { css, cx } from '@linaria/core';
import React, { useState } from 'react';
import { CarrierChainId, ChainInfo } from '../../../utils/consts';
import { pxToMobileVw, pxToPcVw } from '../../../utils/style-evaluation';
import { ChainLogo } from '../ChainLogo';
import { SVGIcon } from '../SVGIcon';
import { ChainSelectorModal } from './ChainSelectorModal';
import { styleDisabled } from '../../../utils/styles';

interface Props {
  className?: string;
  disabled?: boolean;
  chainId: CarrierChainId;
  chains: ChainInfo[];
  onSelectChain: (options: { chainId: CarrierChainId }) => void;
}

export const ChainSelector: React.SFC<Props> = ({ className, disabled, chains, chainId, onSelectChain }) => {
  const [isVisible, setIsVisible] = useState(false);
  const selectedChain = chains.find((item) => item.id === chainId, [chainId, chains]);

  return (
    <>
      <div
        className={cx(styleChainSelectorButton, disabled ? styleDisabled : undefined, className)}
        onClick={() => setIsVisible(true)}>
        {chainId ? (
          <ChainLogo className={styleChainLogo} chainId={chainId} />
        ) : (
          <div className={RoundDiv}>
            <SVGIcon className={styleDottedCircleIcon} iconName="dotted-circle" />
          </div>
        )}
        <div>{selectedChain ? selectedChain.name : 'Select Network'}</div>
        <div className={styleArrowDownIconContainer}>
          <SVGIcon className={styleChevronDownIcon} iconName="chevron-down" />
        </div>
      </div>
      <ChainSelectorModal
        isVisible={isVisible}
        chains={chains}
        onSelectChain={onSelectChain}
        onVisibleChanged={setIsVisible}
      />
    </>
  );
};

const styleChainSelectorButton = css`
  display: flex;
  align-items: center;
  width: 100%;
  height: ${pxToPcVw(56)};
  border-radius: ${pxToPcVw(8)};
  padding-inline: ${pxToPcVw(12)};
  background: var(--ant-primary-color);
  gap: ${pxToPcVw(8)};

  &:hover {
    cursor: pointer;
  }

  @media (max-width: 1024px) {
    height: ${pxToMobileVw(56)};
    border-radius: ${pxToMobileVw(8)};
    padding-inline: ${pxToMobileVw(12)};
    gap: ${pxToMobileVw(8)};
  }
`;

const styleChainLogo = css`
  width: ${pxToPcVw(32)};
  height: ${pxToPcVw(32)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(32)};
    height: ${pxToMobileVw(32)};
  }
`;

const RoundDiv = css`
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  width: ${pxToPcVw(32)};
  height: ${pxToPcVw(32)};
  border-radius: 50%;
  background: var(--ant-primary-1);

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(32)};
    height: ${pxToMobileVw(32)};
  }
`;

const styleDottedCircleIcon = css`
  height: 100%;
  width: 100%;
`;

const styleArrowDownIconContainer = css`
  margin-left: auto;
`;

const styleChevronDownIcon = css`
  width: ${pxToPcVw(10)};

  & > * {
    fill: #fff;
  }

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(10)};
  }
`;
