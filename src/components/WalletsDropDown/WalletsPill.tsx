import React, { useMemo } from 'react';

import { css } from '@linaria/core';
import uniqby from 'lodash/unionBy';

import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { SVGIcon } from '../common/SVGIcon';
import { ChainLogo } from '../common/ChainLogo';
import { useRexContext } from '@jimengio/rex';
import { IStore } from '../../store';

type Props = {
  onClick: () => void;
};

export const WalletsPill = ({ onClick }: Props) => {
  const { walletCache } = useRexContext((store: IStore) => store);
  const uniqueCachedWallets = uniqby(walletCache, 'address');

  const lastTwoUniqueWallets = useMemo(() => {
    const reversedUniqueWallets = uniqby(walletCache, 'chainId');

    return reversedUniqueWallets.slice(0, 2);
  }, [walletCache]);

  return (
    <button className={walletsPill} onClick={onClick}>
      {lastTwoUniqueWallets.length ? (
        <span className={walletsLastTwoIcons}>
          {lastTwoUniqueWallets.map((wallet, i) => (
            <span key={`walletIcon_${i}`}>
              <ChainLogo className={styleLogo} chainId={wallet.chainId} />
            </span>
          ))}
        </span>
      ) : null}
      <span className={styleWalletsPillText}>Wallets ({uniqueCachedWallets.length})</span>
      <SVGIcon className={styleChevronDownIcon} iconName="chevron-down" />
    </button>
  );
};

const walletsPill = css`
  appearance: none;
  background-color: transparent;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: 0.15s background-color ease-in;
  height: ${pxToPcVw(40)};
  gap: ${pxToPcVw(8)};
  padding: ${pxToPcVw(0)} ${pxToPcVw(13)} ${pxToPcVw(0)} ${pxToPcVw(10)};
  border-radius: ${pxToPcVw(20)};
  border: ${pxToPcVw(2)} solid var(--color-border);

  &:hover {
    background-color: rgba(45, 65, 167, 0.3);
    cursor: pointer;
  }

  @media (max-width: 1024px) {
    height: ${pxToMobileVw(40)};
    gap: ${pxToMobileVw(8)};
    padding: ${pxToMobileVw(0)} ${pxToMobileVw(13)} ${pxToMobileVw(0)} ${pxToMobileVw(10)};
    border-radius: ${pxToMobileVw(20)};
    border: ${pxToMobileVw(2)} solid var(--color-border);
  }
`;

const walletsLastTwoIcons = css`
  display: flex;
  flex-direction: row;

  > span {
    width: ${pxToPcVw(24)};
    height: ${pxToPcVw(24)};
    display: inline-flex;
    flex: 0 0 auto;
    overflow: hidden;

    &:not(:first-child) {
      margin-left: ${pxToPcVw(-8)};
    }
  }

  @media (max-width: 1024px) {
    > span {
      width: ${pxToMobileVw(24)};
      height: ${pxToMobileVw(24)};

      &:not(:first-child) {
        margin-left: ${pxToMobileVw(-8)};
      }
    }
  }
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

const styleLogo = css`
  width: 100%;
  height: 100%;
  background: var(--ant-background-3);
  border-radius: 50%;
`;

const styleWalletsPillText = css`
  flex-shrink: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
