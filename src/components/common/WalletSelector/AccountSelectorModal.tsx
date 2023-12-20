import { css } from '@linaria/core';
import React, { useMemo, useState } from 'react';
import { pxToMobileVw, pxToPcVw } from '../../../utils/style-evaluation';
import { SelectionModal } from '../SelectionModal';
import { WalletIcon } from '../WalletIcon';
import { addressShortener } from '../../../utils/web3Utils';

interface Props {
  modalTitle?: string;
  isVisible?: boolean;
  accounts: string[];
  walletName: string;
  walletIcon: string;
  onSelectAccount(options: { walletName: string; account: string }): void;
  onVisibleChanged(visible: boolean): void;
}

export const AccountSelectorModal: React.SFC<Props> = ({
  modalTitle = 'Select account',
  isVisible,
  accounts,
  walletIcon,
  walletName,
  onSelectAccount,
  onVisibleChanged,
}) => {
  const [accountFilter, setAccountFilter] = useState<string>();

  const filteredAccounts = useMemo(() => {
    return accounts.filter((item) => {
      return accountFilter ? item.toLowerCase().includes(accountFilter.toLowerCase()) : true;
    });
  }, [accounts, accountFilter]);

  return (
    <SelectionModal
      visible={isVisible || false}
      title={modalTitle}
      searchPlaceHolder="Search account address"
      onVisibleChanged={onVisibleChanged}
      onSearch={setAccountFilter}>
      <div className={styleList}>
        {filteredAccounts.length ? (
          filteredAccounts.map((account) => {
            return (
              <div
                key={account}
                className={ListItemWrapper}
                onClick={() => {
                  onSelectAccount({ walletName, account });
                  onVisibleChanged(false);
                }}>
                <WalletIcon className={ListItemLogo} icon={walletIcon} />
                <div>{addressShortener(account)}</div>
              </div>
            );
          })
        ) : (
          <div className={styleTips}>You don't have any accounts</div>
        )}
      </div>
    </SelectionModal>
  );
};

const styleList = css`
  display: flex;
  flex-direction: column;
`;

const ListItemWrapper = css`
  display: flex;
  align-items: center;
  font-weight: 500;
  color: #fff;
  padding: ${pxToPcVw(13)} ${pxToPcVw(16)};
  gap: ${pxToPcVw(21)};
  font-size: ${pxToPcVw(20)};

  &:hover {
    cursor: pointer;
    background: var(--ant-primary-color);
    color: #fff;
  }

  @media (max-width: 1024px) {
    padding: ${pxToMobileVw(13)} ${pxToMobileVw(16)};
    gap: ${pxToMobileVw(21)};
    font-size: ${pxToMobileVw(20)};
  }
`;

const ListItemLogo = css`
  height: ${pxToPcVw(48)};
  width: ${pxToPcVw(48)};

  @media (max-width: 1024px) {
    height: ${pxToMobileVw(48)};
    width: ${pxToMobileVw(48)};
  }
`;

const styleTips = css`
  line-height: 1.1em;
  text-align: center;
`;
