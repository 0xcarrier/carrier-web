import React, { useMemo } from 'react';
import { Link, NavLink, matchPath, useLocation, useNavigate } from 'react-router-dom';

import { css, cx } from '@linaria/core';

import CarrierLogo from '../../assets/svgs/carrier-logo.svg';
import { routes } from '../../utils/routes';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { SVGIcon, SVGIconName } from './SVGIcon';
import WalletsDropDown from '../WalletsDropDown/WalletsDropDown';
import { isEnableNFTMinting } from '../CooNFTMinting/cooHelper';
import { Dropdown } from './Dropdown';
import { Cluster, getCluster, setCluster } from '../../utils/env';
import { isEnableSwap } from '../Swap/Swap';
// import WalletsDropDown from './WalletsDropDown/WalletsDropDown';

const Navs: ({ label: string; icon: SVGIconName; to: string; matches: (keyof typeof routes)[] } | undefined)[] = [
  {
    label: `Bridge`,
    icon: 'bridge',
    to: routes.tokenBridge.getPath(),
    matches: ['tokenBridge', 'nftBridge'],
  },
  isEnableSwap
    ? {
        label: `Swap`,
        icon: 'swap-round',
        to: routes.swap.getPath(),
        matches: ['swap'],
      }
    : undefined,
  isEnableNFTMinting
    ? {
        label: `Coo NFT`,
        icon: 'feather',
        to: routes.cooNft.getPath(),
        matches: ['cooNft'],
      }
    : undefined,
];

export const Navbar: React.SFC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const activedKey = useMemo(() => {
    const matchedKey = Navs.find((tab) => {
      return (
        tab &&
        tab.matches.some((route) => {
          return matchPath({ path: routes[route].getRoute(), end: true }, location.pathname);
        })
      );
    });

    return matchedKey ? matchedKey.to : undefined;
  }, [location.pathname]);

  return (
    <div className={NavWrapper}>
      <div className={styleRightSide}>
        <NavLink className={BrandLogo} to={routes.tokenBridge.getPath()}>
          <img className={BrandLogoImage} src={CarrierLogo} />
        </NavLink>
        <div
          className={walletsRootContainer}
          onClick={(e) => {
            e.nativeEvent.stopPropagation();
          }}>
          <WalletsDropDown />
        </div>
      </div>
      <div className={styleLeftSide}>
        {Navs.map((nav) => {
          return nav ? (
            <Link
              className={cx(styleNav, activedKey === nav.to ? styleNavActived : undefined)}
              key={nav.to}
              to={nav.to}>
              <SVGIcon className={tabItemIcon} iconName={nav.icon} />
              {nav.label}
            </Link>
          ) : null;
        })}
      </div>
    </div>
  );
};

const NavWrapper = css`
  display: grid;
  grid-template-columns: 2fr 1fr;
  direction: rtl;
  align-items: center;
  width: 100%;
  max-width: ${pxToPcVw(1440)};
  padding: ${pxToPcVw(32)};
  margin-bottom: ${pxToPcVw(36)};
  margin-left: auto;
  margin-right: auto;

  @media (max-width: 1024px) {
    display: block;
    direction: ltr;
    padding: ${pxToMobileVw(12)};
    margin-bottom: ${pxToMobileVw(16)};
  }
`;

const BrandLogo = css`
  display: 'inline-block';
  margin-left: auto;
  margin-right: auto;

  &:hover {
    cursor: pointer;
  }

  @media (max-width: 1024px) {
    margin-left: 0;
    margin-right: auto;
  }
`;

const BrandLogoImage = css`
  height: ${pxToPcVw(30)};

  @media (max-width: 1024px) {
    height: ${pxToMobileVw(22)};
    width: auto;
  }
`;

const styleRightSide = css`
  display: grid;
  grid-template-columns: 1fr 1fr;
  direction: ltr;

  @media (max-width: 1024px) {
    display: flex;
    align-items: center;
  }
`;

const styleLeftSide = css`
  display: flex;
  align-items: center;
  direction: ltr;
  gap: ${pxToPcVw(20)};
`;

const styleNav = css`
  display: flex;
  align-items: center;
  font-weight: 500;
  color: var(--color-text-3);
  line-height: 1.3em;
  font-size: ${pxToPcVw(16)};
  padding-bottom: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    margin-top: ${pxToMobileVw(24)};
    font-size: ${pxToMobileVw(16)};
    padding-bottom: ${pxToMobileVw(8)};
  }
`;

const styleNavActived = css`
  color: #fff;
  border-bottom: solid ${pxToPcVw(2)} var(--ant-primary-4);

  @media (max-width: 1024px) {
    padding-bottom: ${pxToMobileVw(8)};
    border-bottom: solid ${pxToMobileVw(2)} var(--ant-primary-4);
  }
`;

const tabItemIcon = css`
  width: ${pxToPcVw(16)};
  height: ${pxToPcVw(16)};
  margin-right: ${pxToPcVw(8)};

  * {
    fill: var(--color-text-3);
  }

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(16)};
    height: ${pxToMobileVw(16)};
    margin-right: ${pxToPcVw(8)};
  }
`;

const walletsRootContainer = css`
  display: flex;
  align-items: center;
  margin-left: auto;
  gap: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(16)};
  }
`;

const walletsPill = css`
  appearance: none;
  background-color: transparent;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: 0.15s background-color ease-in;
  height: ${pxToPcVw(40)};
  gap: ${pxToPcVw(8)};
  padding: ${pxToPcVw(0)} ${pxToPcVw(13)} ${pxToPcVw(0)} ${pxToPcVw(15)};
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

const styleChevronDownIcon = css`
  width: ${pxToPcVw(10)};

  & > * {
    fill: #fff;
  }

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(10)};
  }
`;
