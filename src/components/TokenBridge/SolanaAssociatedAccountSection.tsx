import { AssociatedAccountData } from '../../hooks/useAssociatedAccountData';
import React, { useEffect, useState } from 'react';
import { Button } from '../common/Button';
import { css } from '@linaria/core';
import { TargetWallet } from '../../hooks/useTargetWallet';
import { CHAIN_ID_SOLANA } from '@certusone/wormhole-sdk';
import { WalletSelectorButton } from '../common/WalletSelector/WalletSelectorButton';
import { AbstractWallet, TransactionStatus, WalletState } from '../../context/Wallet/types';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { DataResult } from '../../hooks/useData';
import { TargetAsset } from '../../hooks/useTargetAsset';
import { CarrierChainId } from '../../utils/consts';

interface Props {
  className?: string;
  associatedAccountData: AssociatedAccountData;
  targetAssetData: DataResult<TargetAsset | undefined>;
  targetWallet: TargetWallet;
  wallets: AbstractWallet[];
  onConnectSolanaWallet: (options: { chainId: CarrierChainId; walletName: string }) => void;
  onCreateAssociatedAccount: () => void;
  onCreateAssociatedAccountCompleted: () => void;
}

export const SolanaCreateAssociatedAccountSection: React.SFC<Props> = ({
  className,
  associatedAccountData,
  targetAssetData,
  targetWallet,
  wallets,
  onConnectSolanaWallet,
  onCreateAssociatedAccount,
  onCreateAssociatedAccountCompleted,
}) => {
  const [visible, setVisible] = useState(false);

  // token must be attested and registered first before the token associated account can be created
  const isShowCreateAssociatedAccountSection =
    associatedAccountData.associatedAccountData.data?.isRequiredCreateAssociatedAccount &&
    targetAssetData &&
    targetAssetData.data?.targetAddress &&
    targetWallet.wallet?.chainId === CHAIN_ID_SOLANA;
  const sendingTransaction =
    associatedAccountData.createAssociatedAccountResult.loading ||
    (associatedAccountData.createAssociatedAccountResult.result?.txHash &&
    associatedAccountData.associatedAccountTxStatus == null
      ? true
      : false);
  const loadingAssociatedAccountData = associatedAccountData.associatedAccountData.loading;

  const isLoading = sendingTransaction || loadingAssociatedAccountData;

  const isButtonReady =
    targetAssetData &&
    targetAssetData.data?.targetAddress &&
    targetWallet &&
    targetWallet.wallet &&
    associatedAccountData.wallet.wallet &&
    associatedAccountData.wallet.wallet.chainId === CHAIN_ID_SOLANA &&
    !associatedAccountData.wallet.error &&
    associatedAccountData.wallet.state === WalletState.CONNECTED;

  const isDisabled = isLoading || !isButtonReady;

  const onSelectWallet = (walletName: string) => {
    onConnectSolanaWallet({
      chainId: CHAIN_ID_SOLANA,
      walletName: walletName,
    });
  };

  useEffect(() => {
    if (associatedAccountData.associatedAccountTxStatus.data === TransactionStatus.Successful) {
      // trigger create associated account complete function when associated account is created
      console.log('on create associated account complete');
      onCreateAssociatedAccountCompleted();
    }
  }, [associatedAccountData.associatedAccountTxStatus.data]);

  useEffect(() => {
    const targetAbstractWallet = wallets.find((item) => item.walletName === targetWallet.wallet?.walletName);
    const solanaAbstractWallet = wallets.find((item) => item.availableChainIds.includes(CHAIN_ID_SOLANA));
    const walletName = targetAbstractWallet
      ? targetAbstractWallet.walletName
      : solanaAbstractWallet
      ? solanaAbstractWallet.walletName
      : undefined;

    if (associatedAccountData.associatedAccountData.data?.isRequiredCreateAssociatedAccount && walletName) {
      onConnectSolanaWallet({
        chainId: CHAIN_ID_SOLANA,
        walletName,
      });
    }
  }, [
    targetWallet.wallet?.walletName,
    associatedAccountData.associatedAccountData.data?.isRequiredCreateAssociatedAccount,
  ]);

  return (
    <>
      {isShowCreateAssociatedAccountSection && (
        <div className={CreateAssociatedWrapper}>
          <div>This associated token account doesn't exist.</div>
          <div className={ButtonGroupWrapper}>
            <Button
              type="primary"
              className={CreateAssociatedButtonStyle}
              loading={isLoading}
              disabled={isDisabled}
              onClick={() => onCreateAssociatedAccount()}>
              {sendingTransaction
                ? 'Creating Associated Token Account...'
                : loadingAssociatedAccountData
                ? 'Loading Associated Token Account...'
                : 'Create Associated Token Account'}
            </Button>
            <WalletSelectorButton
              type="secondary"
              disabled={isLoading}
              chainId={CHAIN_ID_SOLANA}
              walletSelectorModalVisible={visible}
              wallets={wallets}
              onSelectWallet={({ walletName }) => {
                onSelectWallet(walletName);
              }}
              onWalletSelectorModalVisibleChange={setVisible}
            />
          </div>
        </div>
      )}
    </>
  );
};

const ButtonGroupWrapper = css`
  display: flex;
  gap: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(8)};
  }
`;

const CreateAssociatedWrapper = css`
  display: flex;
  flex-direction: column;
  width: ${pxToPcVw(588)};
  border-radius: ${pxToPcVw(8)};
  border: ${pxToPcVw(2)} solid var(--color-border);
  padding: ${pxToPcVw(16)};
  gap: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    width: 100%;
    border: ${pxToMobileVw(2)} solid var(--color-border);
    border-radius: ${pxToMobileVw(8)};
    padding: ${pxToMobileVw(16)};
    gap: ${pxToMobileVw(16)};
  }
`;

const CreateAssociatedButtonStyle = css`
  flex-grow: 1;
`;
