import { useRexContext } from '@jimengio/rex';
import React, { useMemo } from 'react';
import { WalletState } from '../../context/Wallet/types';
import { TargetWallet } from '../../hooks/useTargetWallet';
import { errorIncorrectChain, errorIncorrectWallet, Wallet } from '../../hooks/useWallet';
import { IStore } from '../../store';
import { CHAINS_BY_ID, wormholeChainToEvmChain } from '../../utils/consts';
import { InfoBanner } from '../common/InfoBanner';
import { css } from '@linaria/core';
import { pxToPcVw } from '../../utils/style-evaluation';

interface IProps {
  sourceWallet: Wallet;
  targetWallet: TargetWallet;
  enableWalletErrorTips: boolean;
}

export const WalletError: React.SFC<IProps> = ({ sourceWallet, targetWallet, enableWalletErrorTips }) => {
  const { appTouchedByUser } = useRexContext((store: IStore) => store);
  const errorMessage = useMemo(() => {
    return sourceWallet.state === WalletState.DISCONNECTED
      ? 'Source wallet is not connected'
      : sourceWallet.error && enableWalletErrorTips
      ? sourceWallet.error === errorIncorrectChain && sourceWallet.expectedChainId
        ? `Source wallet is not connected to expected network: ${
            CHAINS_BY_ID[sourceWallet.expectedChainId].name
          } (Chain ID: ${wormholeChainToEvmChain[sourceWallet.expectedChainId]})`
        : sourceWallet.error === errorIncorrectWallet && sourceWallet.expectedWalletName
        ? `Source wallet is not connected to expected wallet: ${sourceWallet.expectedWalletName}`
        : 'The error happens on connecting the source wallet'
      : !targetWallet.wallet
      ? 'Destination wallet is not connected'
      : undefined;
  }, [
    sourceWallet.state,
    sourceWallet.error,
    enableWalletErrorTips,
    sourceWallet.expectedChainId,
    sourceWallet.expectedWalletName,
    targetWallet.wallet,
  ]);

  return errorMessage && appTouchedByUser ? (
    <InfoBanner className={{ container: styleInfoBanner }} type="warning" message={errorMessage} />
  ) : null;
};

const styleInfoBanner = css`
  width: ${pxToPcVw(588)};

  @media (max-width: 1024px) {
    width: 100%;
  }
`;
