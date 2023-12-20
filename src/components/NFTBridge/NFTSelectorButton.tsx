import { css, cx } from '@linaria/core';
import React, { useState } from 'react';
import { TokensData } from '../../hooks/useTokens';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { NFTData } from '../../utils/tokenData/helper';
import { Wallet, errorIncorrectChain, errorIncorrectWallet } from '../../hooks/useWallet';
import { WalletState } from '../../context/Wallet/types';
import { SVGIcon } from '../common/SVGIcon';
import { NFTSelectorModal } from './NFTSelectorModal';
import { NFTPreview } from './NFTPreview';
import { renderNFTName } from '../../utils/web3Utils';
import { styleDisabled } from '../../utils/styles';
import { CarrierChainId } from '../../utils/consts';

interface Props {
  disabled?: boolean;
  enableWalletErrorTips: boolean;
  sourceChainId?: CarrierChainId;
  sourceWallet: Wallet;
  sourceTokens: TokensData;
  sourceToken?: NFTData;
  onSearchToken: (options: { tokenAddress: string; tokenid?: string }) => void;
  onSelectToken: (options: { tokenAddress: string; tokenid?: string }) => void;
  onConnectToNetwork: () => void;
}

export const NFTSelectorButton: React.SFC<Props> = ({
  disabled: outerDisabled,
  enableWalletErrorTips,
  sourceChainId,
  sourceWallet,
  sourceTokens,
  sourceToken,
  onSearchToken,
  onSelectToken,
  onConnectToNetwork,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const needToConnectNetwork =
    sourceWallet.state === WalletState.CONNECTED &&
    sourceWallet.wallet &&
    sourceWallet.error &&
    (sourceWallet.error === errorIncorrectChain || sourceWallet.error === errorIncorrectWallet) &&
    enableWalletErrorTips;
  const innerDisabled =
    sourceWallet.state !== WalletState.CONNECTED ||
    !sourceWallet.wallet ||
    (sourceWallet.error && sourceWallet.error !== errorIncorrectChain && sourceWallet.error !== errorIncorrectWallet);
  const disabled = innerDisabled || outerDisabled;

  return (
    <div className={NFTSelectorWrapper}>
      <div className={cx(styleNFTPreviewWrapper, disabled ? styleDisabled : undefined)}>
        <NFTPreview sourceToken={sourceToken} />
      </div>
      <div
        className={cx(styleTokenSelectorButton, disabled ? styleDisabled : undefined)}
        onClick={() => {
          if (needToConnectNetwork) {
            onConnectToNetwork();
          } else if (!disabled) {
            setModalVisible(true);
          }
        }}>
        {needToConnectNetwork ? (
          'Switch Network'
        ) : !sourceToken ? (
          <>
            Select NFT
            <SVGIcon className={styleChevronDownIcon} iconName="chevron-down" />
          </>
        ) : sourceToken ? (
          sourceToken.uiAmount > 0 ? (
            <>
              {renderNFTName(sourceToken)}
              <SVGIcon className={cx(styleChevronDownIcon, iconGap)} iconName="chevron-down" />
            </>
          ) : (
            "You don't own this token"
          )
        ) : null}
      </div>
      <NFTSelectorModal
        visible={modalVisible}
        sourceChainId={sourceChainId}
        sourceTokens={sourceTokens}
        onSearchToken={onSearchToken}
        onSelectToken={onSelectToken}
        onVisibleChanged={(visible) => {
          setModalVisible(visible);
        }}
      />
    </div>
  );
};

const NFTSelectorWrapper = css`
  display: flex;
  align-self: stretch;
  gap: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(16)};
  }
`;

const styleTokenSelectorButton = css`
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--color-border);
  cursor: pointer;
  padding: 0 ${pxToPcVw(16)};
  border-radius: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    padding: 0 ${pxToMobileVw(16)};
    border-radius: ${pxToMobileVw(8)};
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

const iconGap = css`
  margin-left: auto;
`;

const styleNFTPreviewWrapper = css`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-border);
  width: ${pxToPcVw(64)};
  height: ${pxToPcVw(64)};
  border-radius: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(64)};
    height: ${pxToMobileVw(64)};
    border-radius: ${pxToMobileVw(8)};
  }
`;
