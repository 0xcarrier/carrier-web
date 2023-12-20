import { css, cx } from '@linaria/core';
import React from 'react';
import { pxToMobileVw, pxToPcVw } from '../../../utils/style-evaluation';
import { SVGIcon } from '../SVGIcon';
import Tooltip from '../Tooltip';

interface Props {
  className?: string;
  disabled?: boolean;
  vertical?: boolean;
  onSwapChain(): void;
}

export const SwapChainButton: React.SFC<Props> = ({ className, disabled, vertical, onSwapChain }) => {
  return (
    <div
      className={cx(
        styleSwapButtonContainer,
        vertical ? styleSwapVertical : undefined,
        disabled ? styleDisabled : undefined,
      )}
      onClick={() => {
        onSwapChain();
      }}>
      <Tooltip
        disableIcon
        trigger={['hover']}
        tooltipText="Swap chain"
        content={
          <div className={styleSwapButton}>
            <SVGIcon className={styleSwapIcon} iconName="swap" />
          </div>
        }
      />
    </div>
  );
};

const styleSwapButtonContainer = css`
  z-index: 1;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  height: ${pxToPcVw(44)};
  width: ${pxToPcVw(44)};

  @media (max-width: 1024px) {
    position: relative;
    top: auto;
    left: auto;
    margin-left: auto;
    margin-right: auto;
    margin-top: ${pxToMobileVw(-14)};
    margin-bottom: ${pxToMobileVw(-14)};
    transform: rotate(90deg);
    height: ${pxToMobileVw(44)};
    width: ${pxToMobileVw(44)};
  }
`;

const styleSwapButton = css`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  border-radius: 50%;
  background: #1a1a4e;
  border: ${pxToPcVw(2)} solid var(--color-border);

  &:hover {
    cursor: pointer;
  }

  @media (max-width: 1024px) {
    border: ${pxToMobileVw(2)} solid var(--color-border);
  }
`;

const styleSwapVertical = css`
  transform: translate(-50%, -50%) rotate(90deg);

  @media (max-width: 1024px) {
    transform: rotate(90deg);
  }
`;

const styleSwapIcon = css`
  width: ${pxToPcVw(16)};
  height: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(16)};
    height: ${pxToMobileVw(16)};
  }
`;

const styleDisabled = css`
  & > * {
    opacity: 0.35;
  }

  pointer-events: none;
`;
