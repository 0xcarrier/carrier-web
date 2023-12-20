import React, { PropsWithChildren, useMemo } from 'react';
import { matchPath, useLocation } from 'react-router-dom';

import { css } from '@linaria/core';

import { routes } from '../../utils/routes';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { Footer } from './Footer';
import { Navbar } from './Navbar';
import cloudPNG from '../../assets/clouds.png';

type Props = PropsWithChildren<unknown>;

const routeWithNavbar = [
  routes.tokenBridge.getRoute(),
  routes.nftBridge.getRoute(),
  routes.swap.getRoute(),
  routes.recovery.getRoute(),
  routes.wallets.getRoute(),
  routes.allTransactions.getRoute(),
  routes.transactionDetail.getRoute(),
  routes.progress.getRoute(),
  routes.cooNft.getRoute(),
  routes.syncTransaction.getRoute(),
];

export const Layout = ({ children }: Props) => {
  const location = useLocation();

  // Use location path name to determine whether the page includes navbar or not.
  // TODO: Recondition this memo when we have decided on how the final app structure should be.
  const hasNavbar = useMemo(() => {
    return routeWithNavbar.some((item) => matchPath(item, location.pathname));
  }, [location.pathname]);

  return (
    <>
      <div className={MainWrapper}>
        {hasNavbar && <Navbar />}
        {children}
      </div>
      <Footer />
    </>
  );
};

const MainWrapper = css`
  background-color: #141741;
  background: url(${cloudPNG}) 99.9% 99.9% no-repeat,
    radial-gradient(circle, rgba(31, 34, 92, 1) 0%, rgba(20, 23, 65, 1) 35%, rgba(10, 13, 42, 1) 100%);
  min-height: auto;
  padding-bottom: ${pxToPcVw(320)};

  @media (max-width: 1024px) {
    padding-bottom: ${pxToMobileVw(320)};
  }
`;
