import React, { useEffect } from 'react';
import { render } from 'react-dom';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { css } from '@linaria/core';
import { notification } from 'antd';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

import './utils/styles';

import { routes } from './utils/routes';
import { pxToMobileVw, pxToPcVw } from './utils/style-evaluation';
import { SVGIcon } from './components/common/SVGIcon';
import { Layout } from './components/common/Layout';
import { RexProvider } from '@jimengio/rex';
import { globalStore } from './store';
import { TokenBridge } from './components/TokenBridge/TokenBridge';
import { WalletAdapterProvider } from './context/Wallet/WalletProvider';
import { WalletManagement } from './components/WalletManagement/WalletManagement';
import { AllTransactions } from './components/AllTransactions/AllTransactions';
import { RecoverySetup } from './components/RecoverySetup/RecoverySetup';
import { TransactionDetails } from './components/TransactionDetail/TransactionDetails';
import { BridgeProgress } from './components/BridgeProgress/BridgeProgress';
import { NFTBridge } from './components/NFTBridge/NFTBridge';
import { isEnableNFTMinting } from './components/CooNFTMinting/cooHelper';
import { CooNFTMinting } from './components/CooNFTMinting/CooNFTMinting';
import { Swap, isEnableSwap } from './components/Swap/Swap';
import { Disclaimer } from './components/Disclaimer/Disclaimer';
import '@polkadot/api-augment';
import { SyncTransaction } from './components/SyncTransaction/SyncTransaction';

dayjs.extend(duration);

const Main: React.FC = () => {
  useEffect(() => {
    notification.config({
      closeIcon: <SVGIcon className={styleCloseIcon} iconName="close" />,
      placement: 'bottomLeft',
      duration: 10,
    });
  }, []);

  return (
    <RexProvider value={globalStore}>
      <WalletAdapterProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path={routes.tokenBridge.getRoute()} element={<TokenBridge />} />
              <Route path={routes.nftBridge.getRoute()} element={<NFTBridge />} />
              <Route path={routes.progress.getRoute()} element={<BridgeProgress />} />
              <Route path={routes.wallets.getRoute()} element={<WalletManagement />} />
              {isEnableSwap && <Route path={routes.swap.getRoute()} element={<Swap />} />}
              <Route path={routes.recovery.getRoute()} element={<RecoverySetup />} />
              <Route path={routes.allTransactions.getRoute()} element={<AllTransactions />} />
              <Route path={routes.syncTransaction.getRoute()} element={<SyncTransaction />} />
              <Route path={routes.transactionDetail.getRoute()} element={<TransactionDetails />} />
              {isEnableNFTMinting && <Route path={routes.cooNft.getRoute()} element={<CooNFTMinting />} />}
            </Routes>
            <Disclaimer />
          </Layout>
        </BrowserRouter>
      </WalletAdapterProvider>
    </RexProvider>
  );
};

const styleCloseIcon = css`
  width: ${pxToPcVw(10)};
  height: ${pxToPcVw(10)};

  & > * {
    fill: rgba(255, 255, 255, 0.5);
  }

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(10)};
    height: ${pxToMobileVw(10)};
  }
`;

function init() {
  const rootElement = document.getElementById('container');

  render(<Main />, rootElement);
}

init();
