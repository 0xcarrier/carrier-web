import { css, cx } from '@linaria/core';
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAbstractWalletByChainIdAndName } from '../../../context/Wallet/helpers/ethereum';
import { AbstractWallet } from '../../../context/Wallet/types';
import { TargetWallet } from '../../../hooks/useTargetWallet';
import { routes } from '../../../utils/routes';
import { pxToMobileVw, pxToPcVw } from '../../../utils/style-evaluation';
import { addressShortener } from '../../../utils/web3Utils';
import { Dropdown } from '../Dropdown';
import { SVGIcon } from '../SVGIcon';
import { WalletIcon } from '../WalletIcon';
import { styleDisabled } from '../../../utils/styles';

interface Props {
  className?: string;
  disabled?: boolean;
  abstractWallets: AbstractWallet[];
  targetWallet: TargetWallet;
  onDisconnect(): void;
  onChangeWallet(): void;
}

export const TargetWalletSelectorDropdown: React.SFC<Props> = ({
  className,
  disabled,
  abstractWallets,
  targetWallet,
  onDisconnect,
  onChangeWallet,
}) => {
  const navigate = useNavigate();
  const targetAbstractWallet = useMemo(() => {
    return getAbstractWalletByChainIdAndName(
      abstractWallets,
      targetWallet.wallet?.chainId,
      targetWallet.wallet?.walletName,
    );
  }, [abstractWallets, targetWallet.wallet?.walletName, targetWallet.wallet?.chainId]);

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
              onDisconnect();
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
              if (targetWallet.wallet) {
                navigate(routes.wallets.getPath(targetWallet.wallet.chainId, targetWallet.wallet.walletAddress));
              }
            },
          },
        ],
      }}>
      <div className={cx(styleAddress, disabled ? styleDisabled : undefined, className)}>
        <div className={styleRow}>
          {targetAbstractWallet ? <WalletIcon className={WalletIconStyle} icon={targetAbstractWallet.icon} /> : null}
          {targetWallet.wallet ? (
            <span className={truncatedWalletAddress}>{addressShortener(targetWallet.wallet?.walletAddress)}</span>
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
