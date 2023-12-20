import React, { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

import { css, cx } from '@linaria/core';
import { Button, Tabs, TabsProps } from 'antd';

import { routes } from '../../utils/routes';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { addressShortener } from '../../utils/web3Utils';
import WalletBalances from './WalletBalances';
import WalletTransactions from './WalletTransactions';
import { Dropdown } from '../common/Dropdown';
import { ChainInfo, CHAINS } from '../../utils/consts';
import { WalletIcon } from '../common/WalletIcon';
import { ChainLogo } from '../common/ChainLogo';
import { useWalletAdapter } from '../../context/Wallet/WalletProvider';
import { SVGIcon } from '../common/SVGIcon';
import { useRexContext } from '@jimengio/rex';
import { IStore } from '../../store';
import { editWalletCacheNickName, removeWalletCache } from '../../store/dispatcher';
import { copyContent } from '../../utils/copyToClipboard';
import uniq from 'lodash/uniq';
import {
  removePreviousConnectedSourceWalletFromLocal,
  removePreviousConnectedTargetWalletFromLocal,
} from '../../utils/chainCache';

const TAB_ITEMS: TabsProps['items'] = [
  {
    label: 'Transactions',
    key: 'transactions',
    children: '',
  },
  {
    label: 'Assets',
    key: 'assets',
    children: '',
  },
];

/**
 * display transactions and token balance for a specific wallet address
 */
export const WalletManagement = () => {
  const navigate = useNavigate();

  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [activeTabKey, setActiveTabKey] = useState(TAB_ITEMS[0].key);
  const { chainId, walletAddress } = useParams();
  const walletAdapter = useWalletAdapter();
  const { walletCache, walletDropdownSourceAddress, walletDropdownTargetAddress } = useRexContext(
    (store: IStore) => store,
  );
  const selectedWallet =
    chainId &&
    walletCache.find(
      (item) => item.address.toLowerCase() === walletAddress?.toLowerCase() && item.chainId === parseInt(chainId),
    );
  const sameAddressWalletOnDifferentChains = walletAddress
    ? walletCache.filter((item) => item.address.toLowerCase() === walletAddress.toLowerCase())
    : [];
  const sameAddressChains = uniq(
    sameAddressWalletOnDifferentChains.map((item) => CHAINS.find((chain) => chain.id === item.chainId)),
  ).filter((item) => item != null) as ChainInfo[];

  // --- Forget wallet ---
  const [shouldConfirmForget, setShouldConfirmForget] = useState<boolean>(false);
  const handleForgetWallet = useCallback(() => {
    if (!selectedWallet) return;

    if (selectedWallet.address.toLowerCase() === walletDropdownSourceAddress?.toLowerCase()) {
      removePreviousConnectedSourceWalletFromLocal();
    }

    if (selectedWallet.address.toLowerCase() === walletDropdownTargetAddress?.toLowerCase()) {
      removePreviousConnectedTargetWalletFromLocal();
    }

    removeWalletCache(selectedWallet);
    //return user to home page
    navigate(routes.tokenBridge.getPath());
  }, [navigate, selectedWallet, walletDropdownSourceAddress, walletDropdownTargetAddress]);
  const selectedAbstractWallet = selectedWallet
    ? walletAdapter.wallets.find((item) => item.walletName === selectedWallet.name)
    : undefined;

  return (
    <>
      {selectedWallet ? (
        <div className={WalletManagementWrapper}>
          {/* wallet info header */}
          <div className={TopSection}>
            <div className={WalletInfoWrapper}>
              <div className={styleNickNameWrapper}>
                <div className={styleWalletIconWrapper}>
                  <WalletIcon className={styleSelectedWalletIcon} icon={selectedAbstractWallet?.icon} />
                  <ChainLogo className={styleSelectedChainIcon} chainId={selectedWallet.chainId} />
                </div>
                {editingNickname ? (
                  <div className={EditNicknameWrapper}>
                    <div className={NicknameInputWrapper}>
                      <input
                        className={NicknameInput}
                        type="text"
                        maxLength={30}
                        onChange={(e) => setNicknameInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            setEditingNickname(false);
                            editWalletCacheNickName({ ...selectedWallet, nickname: nicknameInput });
                          }
                        }}
                        placeholder="Enter nickname..."
                      />
                    </div>
                    <div className="editingIcons" onClick={() => setEditingNickname(false)}>
                      <SVGIcon className={styleCancelIcon} iconName="close" />
                    </div>
                    <div
                      className="editingIcons editingIconsOk"
                      onClick={() => {
                        setEditingNickname(false);
                        editWalletCacheNickName({ ...selectedWallet, nickname: nicknameInput });
                      }}>
                      <SVGIcon className={styleDoneIcon} iconName="check" />
                    </div>
                  </div>
                ) : (
                  <div className={styleNameRow}>
                    <div className={styleNickname}>
                      <div className={styleNicknameText}>{selectedWallet.nickname || 'Nickname'}</div>
                      <SVGIcon
                        className={styleNicknameEditIcon}
                        iconName="edit"
                        onClick={() => setEditingNickname(true)}
                      />
                    </div>
                    <Dropdown
                      menu={{
                        items: sameAddressChains.map((item) => {
                          return {
                            key: item.id,
                            label: (
                              <>
                                <ChainLogo className={styleDropdownChainIcon} chainId={item.id} />
                                {item.name}
                              </>
                            ),
                            onClick: () => {
                              navigate(routes.wallets.getPath(item.id, selectedWallet.address));
                            },
                          };
                        }),
                      }}>
                      <div className={styleChainSelector}>
                        {sameAddressChains.find((item) => item.id === selectedWallet.chainId)?.name}
                        <SVGIcon className={styleIconChevronDown} iconName="chevron-down" />
                      </div>
                    </Dropdown>
                  </div>
                )}
              </div>
              <div className={CopyWrapper}>
                <div className="addressSection">{walletAddress && addressShortener(walletAddress)}</div>
                <div className="clipboardSection" onClick={() => copyContent(selectedWallet.address)}>
                  <SVGIcon className={styleClipboardIcon} iconName="clipboard" />
                  Copy
                </div>
              </div>
            </div>

            {/* we may no need this at all will leave this here */}
            <div className={walletActionButtonsWrap}>
              {shouldConfirmForget ? (
                <>
                  <Button
                    className={cx(ForgetWalletButton, FlexWidthForgetButton)}
                    type="primary"
                    onClick={() => setShouldConfirmForget(false)}
                    key="cancelForgetWalletConfirmation">
                    Cancel
                  </Button>
                  <Button
                    className={cx(ForgetWalletButton, FlexWidthForgetButton, ConfirmForgetButton)}
                    type="primary"
                    onClick={handleForgetWallet}
                    key="confirmForgetWalletConfirmation">
                    <SVGIcon className={styleDoneIcon} iconName="check" />
                    Confirm
                  </Button>
                </>
              ) : (
                <Button
                  className={ForgetWalletButton}
                  type="primary"
                  onClick={() => setShouldConfirmForget(true)}
                  key="triggerForgetWalletConfirmation">
                  Forget Wallet
                </Button>
              )}
            </div>
          </div>
          <Tabs
            className={TabsStyle}
            activeKey={activeTabKey}
            onChange={(key) => {
              setActiveTabKey(key);
            }}
            items={TAB_ITEMS}
          />
          <div className={styleLowerSectionWrapper}>
            <div
              className={cx(
                LowerSection,
                activeTabKey === TAB_ITEMS[0].key ? LowerSectionLeftMobile : LowerSectionRightMobile,
              )}>
              <WalletTransactions chainId={selectedWallet.chainId} walletAddress={selectedWallet.address} />
              <WalletBalances chainId={selectedWallet.chainId} walletAddress={selectedWallet.address} />
            </div>
          </div>
        </div>
      ) : (
        <div className={NoWallet}>Wallet has not been connected before</div>
      )}
    </>
  );
};

const WalletManagementWrapper = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  max-width: ${pxToPcVw(1440)};
  gap: ${pxToPcVw(24)};

  @media (max-width: 1024px) {
    max-width: none;
    margin: 0;
    gap: ${pxToMobileVw(24)};
    padding-inline: ${pxToMobileVw(12)};
  }
`;

const TopSection = css`
  display: flex;
  flex-direction: row;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  // 120 - 32 Navbar
  padding-inline: ${pxToPcVw(88)};

  @media (max-width: 1024px) {
    flex-direction: column;
    align-items: stretch;
    gap: ${pxToMobileVw(16)};
    padding-inline: 0;
  }
`;

const WalletInfoWrapper = css`
  display: flex;
  align-items: center;
  gap: ${pxToPcVw(24)};

  @media (max-width: 1024px) {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
    gap: ${pxToMobileVw(24)};
  }
`;

const styleNickNameWrapper = css`
  display: flex;
  align-items: center;
`;

const styleNicknameText = css`
  font-weight: 500;
  color: #ffffff;
  line-height: 1.1em;
  font-size: ${pxToPcVw(20)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(20)};
  }
`;

const EditNicknameWrapper = css`
  display: flex;
  gap: ${pxToPcVw(12)};
  margin-left: ${pxToPcVw(12)};

  .editingIcons {
    flex-shrink: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    width: ${pxToPcVw(44)};
    height: ${pxToPcVw(44)};
    border: ${pxToPcVw(2)} solid var(--color-border);
    border-radius: ${pxToPcVw(8)};

    &.editingIconsOk {
      background: var(--ant-primary-4);
      border-color: var(--ant-primary-4);
    }

    &:hover {
      cursor: pointer;
      background: var(--ant-primary-4);
      border-color: var(--ant-primary-4);
    }
  }

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(12)};
    margin-left: ${pxToMobileVw(12)};

    .editingIcons {
      width: ${pxToMobileVw(44)};
      height: ${pxToMobileVw(44)};
      border: ${pxToMobileVw(2)} solid var(--color-border);
      border-radius: ${pxToMobileVw(8)};
    }
  }
`;

const NicknameInputWrapper = css`
  width: ${pxToPcVw(260)};
  height: ${pxToPcVw(44)};

  @media (max-width: 1024px) {
    width: auto;
    flex-grow: 1;
    height: ${pxToMobileVw(44)};
  }
`;

const NicknameInput = css`
  font-weight: 500;
  background: transparent;
  height: 100%;
  width: 100%;
  border: ${pxToPcVw(2)} solid var(--color-border);
  font-size: ${pxToPcVw(14)};
  border-radius: ${pxToPcVw(8)};
  padding: ${pxToPcVw(13)} ${pxToPcVw(16)};

  /* Chrome, Firefox, Opera, Safari 10.1+ */
  ::placeholder {
    color: var(--color-text-3);
    opacity: 1; /* Firefox */
  }

  &:focus {
    outline: none;
    border: ${pxToPcVw(2)} solid var(--ant-primary-5);
  }

  @media (max-width: 1024px) {
    border: ${pxToMobileVw(2)} solid var(--color-border);
    font-size: ${pxToMobileVw(14)};
    border-radius: ${pxToMobileVw(8)};
    padding: ${pxToMobileVw(13)} ${pxToMobileVw(16)};

    &:focus {
      border: ${pxToMobileVw(2)} solid var(--ant-primary-5);
    }
  }
`;

const CopyWrapper = css`
  display: flex;
  border: ${pxToPcVw(2)} solid var(--color-border);
  height: ${pxToPcVw(56)};
  border-radius: ${pxToPcVw(8)};

  .addressSection {
    display: flex;
    align-items: center;
    border-right: ${pxToPcVw(2)} solid var(--color-border);
    padding: 0 ${pxToPcVw(24)};
    font-weight: 400;
    font-size: ${pxToPcVw(16)};
    color: #ffffff;
  }

  .clipboardSection {
    display: flex;
    align-items: center;
    gap: ${pxToPcVw(15)};
    padding: ${pxToPcVw(12)} ${pxToPcVw(24)};
    font-size: ${pxToPcVw(16)};
    color: var(--ant-primary-5);

    &:hover {
      cursor: pointer;
      opacity: 0.5;
    }
  }

  @media (max-width: 1024px) {
    border: ${pxToMobileVw(2)} solid var(--color-border);
    height: ${pxToMobileVw(56)};
    border-radius: ${pxToMobileVw(8)};

    .addressSection {
      flex-grow: 1;
      justify-content: center;
      border-right: ${pxToMobileVw(2)} solid var(--color-border);
      padding: 0 ${pxToMobileVw(24)};
      font-size: ${pxToMobileVw(16)};
    }

    .clipboardSection {
      gap: ${pxToMobileVw(15)};
      padding: ${pxToMobileVw(12)} ${pxToMobileVw(24)};
      font-size: ${pxToMobileVw(16)};
    }
  }
`;

const styleClipboardIcon = css`
  width: ${pxToPcVw(17)};
  height: ${pxToPcVw(20)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(17)};
    height: ${pxToMobileVw(20)};
  }
`;

const walletActionButtonsWrap = css`
  display: flex;
  flex-direction: row;
  gap: ${pxToPcVw(12)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(12)};
  }
`;

const ForgetWalletButton = css`
  display: flex;
  justify-content: center;
  align-items: center;
  background: transparent;
  font-style: normal;
  font-weight: 600;
  text-align: center;
  color: #ffffff;
  font-size: ${pxToPcVw(14)};
  line-height: ${pxToPcVw(24)};
  border: ${pxToPcVw(2)} solid var(--ant-primary-color);
  border-radius: ${pxToPcVw(8)};
  width: ${pxToPcVw(142)};
  height: ${pxToPcVw(44)};

  &:hover {
    background: var(--ant-primary-color);
  }

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(14)};
    line-height: ${pxToMobileVw(24)};
    border: ${pxToMobileVw(2)} solid var(--ant-primary-color);
    border-radius: ${pxToMobileVw(8)};
    width: 100%;
    height: ${pxToMobileVw(44)};
  }
`;

const FlexWidthForgetButton = css`
  width: auto;
  padding-inline: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    padding-inline: ${pxToMobileVw(16)};
    flex: 1;
  }
`;

const ConfirmForgetButton = css`
  background: #357aff;
  gap: ${pxToPcVw(8)};
  border: 0;

  &:hover {
    background: #357aff;
  }

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(8)};
  }
`;

const LowerSection = css`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: ${pxToPcVw(24)};

  // 120 - 32 Navbar
  padding-inline: ${pxToPcVw(88)};

  @media (max-width: 1024px) {
    transition: transform 0.2s;
    gap: 0;
    padding-inline: 0;
  }
`;

const LowerSectionLeftMobile = css`
  @media (max-width: 1024px) {
    transform: translateX(0);
  }
`;

const LowerSectionRightMobile = css`
  @media (max-width: 1024px) {
    transform: translateX(-100%);
  }
`;

const styleLowerSectionWrapper = css`
  width: 100%;
  overflow: hidden;
`;

export const SectionHeader = css`
  display: flex;
  align-items: center;
  font-style: normal;
  font-weight: 600;
  font-size: ${pxToPcVw(24)};
  line-height: ${pxToPcVw(29)};
  color: #ffffff;

  @media (max-width: 1024px) {
    justify-content: space-between;
    font-size: ${pxToMobileVw(24)};
    line-height: ${pxToMobileVw(29)};
  }
`;

export const SearchWrapper = css`
  display: flex;
  align-items: center;
  height: ${pxToPcVw(56)};
  border: ${pxToPcVw(2)} solid var(--color-border);
  padding-inline: ${pxToPcVw(16)};
  gap: ${pxToPcVw(16)};
  border-radius: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    height: ${pxToMobileVw(56)};
    border: ${pxToMobileVw(2)} solid var(--color-border);
    padding-inline: ${pxToMobileVw(16)};
    gap: ${pxToMobileVw(16)};
    border-radius: ${pxToMobileVw(8)};
  }
`;

export const InputStyle = css`
  width: 100%;
  background: none;
  border: none;
  font-weight: 500;
  height: ${pxToPcVw(24)};
  font-size: ${pxToPcVw(16)};

  /* Chrome, Firefox, Opera, Safari 10.1+ */
  ::placeholder {
    color: var(--color-text-3);
    opacity: 1; /* Firefox */
  }

  &:focus {
    outline: none;
  }

  @media (max-width: 1024px) {
    height: ${pxToMobileVw(24)};
    font-size: ${pxToMobileVw(16)};
  }
`;

const NoWallet = css`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 80vh;
  font-size: ${pxToPcVw(24)};
`;

const styleWalletIconWrapper = css`
  display: flex;
  align-items: flex-end;
`;

const styleSelectedWalletIcon = css`
  width: ${pxToPcVw(56)};
  height: ${pxToPcVw(56)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(56)};
    height: ${pxToMobileVw(56)};
  }
`;

const styleSelectedChainIcon = css`
  margin-left: ${pxToPcVw(-20)};
  width: ${pxToPcVw(24)};
  height: ${pxToPcVw(24)};

  @media (max-width: 1024px) {
    margin-left: ${pxToMobileVw(-20)};
    width: ${pxToMobileVw(24)};
    height: ${pxToMobileVw(24)};
  }
`;

const styleNickname = css`
  display: flex;
  align-items: center;
  gap: ${pxToPcVw(10)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(10)};
  }
`;

const styleCancelIcon = css`
  width: ${pxToPcVw(10)};
  height: ${pxToPcVw(10)};

  & > * {
    fill: #fff;
  }

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(10)};
    height: ${pxToMobileVw(10)};
  }
`;

const styleDoneIcon = css`
  width: ${pxToPcVw(20)};
  height: ${pxToPcVw(20)};
  fill: #fff;

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(20)};
    height: ${pxToMobileVw(20)};
  }
`;

const styleNicknameEditIcon = css`
  width: ${pxToPcVw(16)};
  height: ${pxToPcVw(16)};
  flex-shrink: 0;

  &:hover {
    cursor: pointer;
    opacity: 0.5;
  }

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(16)};
    height: ${pxToMobileVw(16)};
  }
`;

const TabsStyle = css`
  display: none;
  width: ${pxToPcVw(298)};

  .ant-tabs-nav {
    margin: 0;
    margin-left: auto;
  }

  .ant-tabs-tab {
    & + .ant-tabs-tab {
      margin-right: 0;
      margin-left: ${pxToPcVw(24)};
    }

    padding: 0 0 ${pxToPcVw(10)} 0;
  }

  .ant-tabs-tab-btn {
    font-size: ${pxToPcVw(16)};
    line-height: 1.21em;
    color: var(--color-text-3);
  }

  .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn {
    color: var(--color-text);
  }

  .ant-tabs-ink-bar {
    background: var(--ant-primary-4);
    height: ${pxToPcVw(3)} !important;
  }

  @media (max-width: 1024px) {
    display: flex;
    width: auto;
    align-self: flex-start;

    .ant-tabs-tab {
      & + .ant-tabs-tab {
        margin-left: ${pxToMobileVw(24)};
      }

      padding: 0 0 ${pxToMobileVw(10)} 0;
    }

    .ant-tabs-tab-btn {
      font-size: ${pxToMobileVw(16)};
    }

    .ant-tabs-ink-bar {
      height: ${pxToMobileVw(3)} !important;
    }
  }
`;

const styleNameRow = css`
  display: flex;
  flex-direction: column;
  margin-left: ${pxToPcVw(16)};
  gap: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    margin-left: ${pxToMobileVw(16)};
    gap: ${pxToMobileVw(8)};
  }
`;

const styleIconChevronDown = css`
  width: ${pxToPcVw(10)};

  & > * {
    fill: var(--color-text-3);
  }

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(10)};
  }
`;

const styleChainSelector = css`
  cursor: pointer;
  display: flex;
  align-items: center;
  font-weight: 400;
  line-height: 1.1em;
  color: var(--color-text-3);
  gap: ${pxToPcVw(8)};
  font-size: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(8)};
    font-size: ${pxToMobileVw(16)};
  }
`;

const styleDropdownChainIcon = css`
  width: ${pxToPcVw(18)};
  height: ${pxToPcVw(18)};
  margin-right: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(18)};
    height: ${pxToMobileVw(18)};
    margin-right: ${pxToMobileVw(8)};
  }
`;
