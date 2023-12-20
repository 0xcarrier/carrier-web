import { css, cx } from '@linaria/core';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { WalletState } from '../../../context/Wallet/types';
import { Wallet } from '../../../hooks/useWallet';
import { routes } from '../../../utils/routes';
import { pxToMobileVw, pxToPcVw } from '../../../utils/style-evaluation';
import { addressShortener } from '../../../utils/web3Utils';
import { Dropdown } from '../Dropdown';
import { SVGIcon } from '../SVGIcon';
import { WalletIcon } from '../WalletIcon';
import { styleDisabled } from '../../../utils/styles';
import { CarrierChainId } from '../../../utils/consts';

interface Props {
  className?: string;
  disabled?: boolean;
  sourceWallet: Wallet;
  onDisconnect(options: { chainId: CarrierChainId; walletName: string }): void;
  onChangeWallet(): void;
}

export const SourceWalletSelectorDropdown: React.SFC<Props> = ({
  className,
  disabled,
  sourceWallet,
  onDisconnect,
  onChangeWallet,
}) => {
  const navigate = useNavigate();

  return (
    <Dropdown
      trigger={disabled ? [] : undefined}
      placement="bottomRight"
      menu={{
        items: [
          {
            key: 'change',
            label: (
              <div className={styleRow}>
                <SVGIcon className={styleArrowPathIcon} iconName="arrow-path" />
                Change
              </div>
            ),
            onClick: () => {
              onChangeWallet();
            },
          },
          {
            key: 'disconnect',
            label: (
              <div className={styleRow}>
                <SVGIcon className={styleChainUnlinkIcon} iconName="chain-unlink" />
                Disconnect
              </div>
            ),
            onClick: () => {
              if (sourceWallet.wallet) {
                onDisconnect({ chainId: sourceWallet.wallet.chainId, walletName: sourceWallet.wallet.walletName });
              }
            },
          },
          {
            key: 'viewDetails',
            label: (
              <div className={styleRow}>
                <SVGIcon className={styleDocumentTextIcon} iconName="document-text" />
                View details
              </div>
            ),
            onClick: () => {
              if (sourceWallet.wallet && sourceWallet.expectedChainId) {
                navigate(routes.wallets.getPath(sourceWallet.expectedChainId, sourceWallet.wallet.walletAddress));
              }
            },
          },
        ],
      }}>
      <div className={cx(styleAddress, disabled ? styleDisabled : undefined, className)}>
        <div className={styleRow}>
          {sourceWallet.state !== WalletState.DISCONNECTED && sourceWallet.wallet ? (
            <WalletIcon className={WalletIconStyle} icon={sourceWallet.wallet.icon} />
          ) : null}
          {sourceWallet.state !== WalletState.DISCONNECTED && sourceWallet.wallet ? (
            <span className={truncatedWalletAddress}>{addressShortener(sourceWallet.wallet?.walletAddress)}</span>
          ) : null}
          <SVGIcon className={styleChevronDownIcon} iconName="chevron-down" />
        </div>
      </div>
    </Dropdown>
  );
};

const styleRow = css`
  display: flex;
  gap: ${pxToPcVw(5)};
  align-items: center;

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(5)};
  }
`;

const styleArrowPathIcon = css`
  & > * {
    fill: var(--color-text-3);
  }
`;

const styleChainUnlinkIcon = css`
  & > * {
    fill: var(--color-text-3);
  }
`;

const styleDocumentTextIcon = css`
  & > * {
    fill: var(--color-text-3);
  }
`;

const styleAddress = css`
  height: ${pxToPcVw(22)};
  appearance: none;
  cursor: pointer;
  background: none;
  border: 0;
  padding: 0;

  @media (max-width: 1024px) {
    height: ${pxToMobileVw(22)};
  }
`;

const WalletIconStyle = css`
  width: ${pxToPcVw(22)};
  height: ${pxToPcVw(22)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(22)};
    height: ${pxToMobileVw(22)};
  }
`;

const truncatedWalletAddress = css`
  color: var(--color-text-3);
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
