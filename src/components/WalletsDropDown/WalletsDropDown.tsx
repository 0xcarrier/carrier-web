import { routes } from '../../utils/routes';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { addressShortener } from '../../utils/web3Utils';
import { SVGIcon } from '../common/SVGIcon';
import { AddWallet } from './AddWallet';
import { WalletDropDownTransactionHistory } from './WalletDropDownTransactionHistory';
import { WalletsPill } from './WalletsPill';
import { css } from '@linaria/core';
import { Tabs, TabsProps } from 'antd';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChainInfo, CHAINS } from '../../utils/consts';
import { WalletIcon } from '../common/WalletIcon';
import { ChainLogo } from '../common/ChainLogo';
import { CacheWallet } from '../../store/walletCache';
import { useRexContext } from '@jimengio/rex';
import { IStore } from '../../store';
import { getAbstractWalletByChainIdAndName } from '../../context/Wallet/helpers/ethereum';
import { useWalletAdapter } from '../../context/Wallet/WalletProvider';
import uniq from 'lodash/uniq';

const TAB_ITEMS: TabsProps['items'] = [
  {
    label: `Wallets`,
    key: 'wallets',
    children: '',
  },
  {
    label: `Transactions`,
    key: 'transactions',
    children: '',
  },
];

interface UniqueWallet {
  [key: string]: CacheWallet[];
}

const WalletsDropDown = () => {
  const { wallets } = useWalletAdapter();
  const { walletCache, walletDropdownSourceAddress, walletDropdownTargetAddress } = useRexContext(
    (store: IStore) => store,
  );

  const [tab, setTab] = useState<string>('wallets');

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    function dropdownVisibleListener() {
      setIsDropdownOpen(false);
    }

    document.addEventListener('click', dropdownVisibleListener);

    return () => {
      document.removeEventListener('click', dropdownVisibleListener);
    };
  }, []);

  const toggleDropdownOpen = () => {
    setIsDropdownOpen((prev) => !prev);
    setTab(TAB_ITEMS[0].key);
  };

  const handleTabChange = (tabKey: string) => {
    setTab(tabKey);
  };

  const onCloseDropdown = () => {
    setIsDropdownOpen(false);
    setTab(TAB_ITEMS[0].key);
  };

  function renderWalletView(cachedWallets: CacheWallet[]) {
    const chainIds = uniq(cachedWallets.map((item) => item.chainId));
    const firstWallet = cachedWallets[0];
    const { name, nickname, address, chainId } = firstWallet;
    const walletChains = chainIds
      .map((chainId) => {
        return CHAINS.find((item) => item.id === chainId);
      })
      .filter((item) => item != null) as ChainInfo[];
    const abstractWallet = getAbstractWalletByChainIdAndName(wallets, chainId, name);

    return (
      <Link
        className={listItemWrapper}
        to={routes.wallets.getPath(chainId, address)}
        key={`${chainId}-${address}`}
        onClick={() => {
          setIsDropdownOpen(false);
        }}>
        <WalletIcon className={listItemIcon} icon={abstractWallet?.icon} />
        <div className={walletNickname}>{!nickname ? addressShortener(address) : nickname}</div>
        {walletDropdownSourceAddress?.toLowerCase() === address.toLowerCase() ? (
          <div className={styleTag}>SRC</div>
        ) : null}
        {walletDropdownTargetAddress?.toLowerCase() === address.toLowerCase() ? (
          <div className={styleTag}>DEST</div>
        ) : null}
        <div className={styleChains}>
          <div className={chainIcons}>
            {walletChains.slice(0, 3).map((item) => {
              return <ChainLogo key={item.id} className={chainIcon} chainId={item.id} />;
            })}
          </div>
          {walletChains.length > 3 ? <div className={styleRestChainsNumber}>+{walletChains.length - 3}</div> : null}
        </div>
      </Link>
    );
  }

  function renderWalletsView(allWallets: CacheWallet[]) {
    const uniqueWalletByAddress: UniqueWallet = {};

    allWallets.forEach((wallet) => {
      const sameAddressWalletes = uniqueWalletByAddress[wallet.address.toLowerCase()] || [];
      uniqueWalletByAddress[wallet.address.toLowerCase()] = sameAddressWalletes.concat(wallet);
    });

    return (
      <>
        <AddWallet />

        <div className={WalletDropdownList}>
          {Object.keys(uniqueWalletByAddress).map((walletAddress, i) => {
            return renderWalletView(uniqueWalletByAddress[walletAddress]);
          })}
        </div>
      </>
    );
  }

  function renderTransactionsView() {
    return (
      <WalletDropDownTransactionHistory
        onDropdownClose={() => {
          onCloseDropdown();
        }}
      />
    );
  }

  function renderTabView() {
    return tab === 'wallets' ? renderWalletsView(walletCache) : renderTransactionsView();
  }

  return (
    <div
      className={walletsRootContainer}
      onClick={(e) => {
        e.nativeEvent.stopPropagation();
      }}>
      <WalletsPill onClick={toggleDropdownOpen} />

      {isDropdownOpen && (
        <div className={WalletDropdown}>
          <div className={TabsSection}>
            <Tabs className={TabsStyle} defaultActiveKey="wallets" onChange={handleTabChange} items={TAB_ITEMS} />
            <div className={CloseIconStyle} onClick={() => onCloseDropdown()}>
              <SVGIcon className={styleCloseIcon} iconName="close" />
            </div>
          </div>
          {renderTabView()}
        </div>
      )}
    </div>
  );
};

export default WalletsDropDown;

const walletsRootContainer = css`
  position: relative;
`;

const WalletDropdown = css`
  position: absolute;
  right: 0;
  background: var(--ant-background-3);
  z-index: 2;
  width: ${pxToPcVw(424)};
  border: ${pxToPcVw(2)} solid var(--color-border);
  border-radius: ${pxToPcVw(8)};
  margin-top: ${pxToPcVw(24)};
  box-shadow: ${pxToPcVw(0)} ${pxToPcVw(0)} ${pxToPcVw(15)} ${pxToPcVw(0)} rgba(0, 0, 0, 0.65);

  @media (max-width: 1024px) {
    display: flex;
    flex-direction: column;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    top: 0;
    width: auto;
    border: none;
    border-radius: 0;
    margin-top: 0;
    box-shadow: none;
  }
`;

const TabsSection = css`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  box-shadow: inset 0 ${pxToPcVw(-2)} 0 var(--color-border);
  padding-right: ${pxToPcVw(24)};

  @media (max-width: 1024px) {
    box-shadow: inset 0 ${pxToMobileVw(-2)} 0 var(--color-border);
    padding-right: ${pxToMobileVw(24)};
  }
`;

const TabsStyle = css`
  .ant-tabs-nav {
    margin: 0;
  }

  .ant-tabs-tab {
    padding: ${pxToPcVw(24)};

    + .ant-tabs-tab {
      margin-right: 0;
      margin-left: 0;
    }

    &.ant-tabs-tab-active > .ant-tabs-tab-btn {
      color: #fff;
    }
  }

  .ant-tabs-tab-btn {
    font-size: ${pxToPcVw(20)};
    font-weight: 400;
    color: var(--color-text-3);
    line-height: ${pxToPcVw(24)};
  }

  .ant-tabs-ink-bar {
    background: var(--ant-primary-4);
    height: ${pxToPcVw(4)} !important;
  }

  @media (max-width: 1024px) {
    .ant-tabs-tab {
      padding: ${pxToMobileVw(24)};
    }

    .ant-tabs-tab-btn {
      font-size: ${pxToMobileVw(20)};
      line-height: ${pxToMobileVw(24)};
    }

    .ant-tabs-ink-bar {
      height: ${pxToMobileVw(4)} !important;
    }
  }
`;

const CloseIconStyle = css`
  margin-left: auto;

  &:hover {
    cursor: pointer;
    opacity: 0.5;
  }
`;

const WalletDropdownList = css`
  display: flex;
  flex-direction: column;
  height: ${pxToPcVw(328)};
  overflow-y: auto;

  @media (max-width: 1024px) {
    height: auto;
    flex-grow: 1;
  }
`;

const listItemWrapper = css`
  display: flex;
  align-items: center;
  color: unset;
  padding: ${pxToPcVw(16)};
  gap: ${pxToPcVw(12)};
  font-size: ${pxToPcVw(16)};
  border-bottom: ${pxToPcVw(2)} solid var(--color-border);

  &:hover {
    color: unset;
    cursor: pointer;
    background: var(--ant-primary-color);
  }

  &:last-child {
    border-bottom: 0;
  }

  @media (max-width: 1024px) {
    padding: ${pxToMobileVw(16)};
    gap: ${pxToMobileVw(12)};
    font-size: ${pxToMobileVw(16)};
    border-bottom: ${pxToMobileVw(2)} solid var(--color-border);
  }
`;

const listItemIcon = css`
  width: ${pxToPcVw(32)};
  height: ${pxToPcVw(32)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(32)};
    height: ${pxToMobileVw(32)};
  }
`;

const walletNickname = css`
  font-weight: 600;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: ${pxToPcVw(16)};
  line-height: ${pxToPcVw(22)};
  margin-right: auto;

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(16)};
    line-height: ${pxToMobileVw(22)};
  }
`;

const styleCloseIcon = css`
  width: ${pxToPcVw(18)};
  height: ${pxToPcVw(18)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(18)};
    height: ${pxToMobileVw(18)};
  }
`;

const chainIcons = css`
  display: flex;
  align-items: center;
`;

const chainIcon = css`
  width: ${pxToPcVw(32)};
  height: ${pxToPcVw(32)};

  &:not(:first-child) {
    margin-left: ${pxToPcVw(-8)};
  }

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(32)};
    height: ${pxToMobileVw(32)};

    &:not(:first-child) {
      margin-left: ${pxToMobileVw(-8)};
    }
  }
`;

const styleRestChainsNumber = css`
  font-weight: 600;
  margin-left: ${pxToPcVw(8)};
  font-size: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    margin-left: ${pxToMobileVw(8)};
    font-size: ${pxToMobileVw(16)};
  }
`;

const styleChains = css`
  display: flex;
  align-items: center;
`;

const styleTag = css`
  display: flex;
  align-items: center;
  height: ${pxToPcVw(18)};
  line-height: 1.1em;
  border: solid ${pxToPcVw(2)} var(--ant-primary-4);
  border-radius: ${pxToPcVw(10)};
  font-size: ${pxToPcVw(10)};
  color: var(--ant-primary-4);
  padding: 0 ${pxToPcVw(4)};
`;
