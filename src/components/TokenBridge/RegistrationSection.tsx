import React, { useEffect, useMemo, useState } from 'react';
import { AbstractWallet, TransactionStatus, WalletState } from '../../context/Wallet/types';
import { Button } from '../common/Button';
import { RegistrationData } from '../../hooks/useRegistrationData';
import { css } from '@linaria/core';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { WalletSelectorButton } from '../common/WalletSelector/WalletSelectorButton';
import { Wallet, errorIncorrectChain } from '../../hooks/useWallet';
import { DataResult } from '../../hooks/useData';
import { TargetAsset } from '../../hooks/useTargetAsset';
import { TargetWallet } from '../../hooks/useTargetWallet';
import { TokenData } from '../../utils/tokenData/helper';
import { CarrierChainId } from '../../utils/consts';

const descriptionInfo = {
  ATTEST_SWITCH_NETWORK_REQUIRED: `You need to switch to your token's origin chain to perform token attestation.`,
  ATTEST_REQUIRED: 'Token attestation required before you can proceed.',
  WAITING_ATTEST_VAA: `Getting attest vaa, may take a while, please be patient.`,
  REGISTER_SWITCH_NETWORK_REQUIRED: `You need to switch to destination chain to perform token register.`,
  REGISTER_REQUIRED: 'Attesting is complete, the token must now be registered on destination chain.',
  REGISTER_COMPLETE: `All tokens on destination chain have been registered! You may now enter the token amount and proceed.`,
};

interface Props {
  className?: string;
  sourceWallet: Wallet;
  targetWallet: TargetWallet;
  wallets: AbstractWallet[];
  sourceToken?: TokenData;
  targetAssetData: DataResult<TargetAsset | undefined>;
  registrationData: RegistrationData;
  onConnectToAttestationChain: (options: { chainId: CarrierChainId; walletName: string }) => void;
  onConnectToRegistrationChain: (options: { chainId: CarrierChainId; walletName: string }) => void;
  onAttestToken: (options: { originTokenAddress: string }) => void;
  onRegisterToken: (options: { signedVAA: Uint8Array }) => void;
  onRegisterTokenCompleted: () => void;
}

export const RegistrationSection: React.SFC<Props> = ({
  className,
  sourceWallet,
  targetWallet,
  wallets,
  sourceToken,
  targetAssetData,
  registrationData,
  onConnectToAttestationChain,
  onConnectToRegistrationChain,
  onAttestToken,
  onRegisterToken,
  onRegisterTokenCompleted,
}) => {
  const [visible, setVisible] = useState(false);

  const isTargetAssetAvailable = targetAssetData.data && !targetAssetData.loading && !targetAssetData.error;

  const isAttestTxnReady = useMemo(() => {
    return !!(
      registrationData.registrationData.data?.attestationResult?.result?.txHash &&
      registrationData.attestationTxStatus.data === TransactionStatus.Successful
    );
  }, [registrationData.registrationData, registrationData.attestationTxStatus]);

  const isAttestVaaReady = useMemo(() => {
    return (
      registrationData.attestationSignedVaa.data &&
      'vaaBytes' in registrationData.attestationSignedVaa.data &&
      !!registrationData.attestationSignedVaa.data.vaaBytes
    );
  }, [registrationData.attestationSignedVaa]);

  const isRegisterTxnReady = useMemo(() => {
    return !!(
      registrationData &&
      registrationData.registrationData.data?.registrationResult?.result?.txHash &&
      registrationData.registrationTxStatus.data === TransactionStatus.Successful
    );
  }, [registrationData.registrationData, registrationData.registrationTxStatus]);

  const isCorrectOriginNetwork =
    registrationData.wallet.wallet != null &&
    registrationData.wallet.wallet?.chainId ===
      (targetAssetData && targetAssetData.data && targetAssetData.data.originChainId) &&
    !registrationData.wallet.error;

  const isCorrectDestNetwork =
    registrationData.wallet.wallet != null &&
    registrationData.wallet.wallet?.chainId ===
      (targetAssetData && targetAssetData.data && targetAssetData.data.targetChainId) &&
    !registrationData.wallet.error;

  const isShowWalletButton = useMemo(() => {
    if (!isAttestTxnReady) {
      return true;
    } else if (isAttestVaaReady && !isRegisterTxnReady) {
      return true;
    }
    return false;
  }, [isAttestTxnReady, isAttestVaaReady, isRegisterTxnReady]);

  const steps = useMemo(() => {
    return registrationData.registrationData.data?.registrationResult?.result?.txHash &&
      registrationData.registrationTxStatus.data === TransactionStatus.Successful
      ? 2
      : registrationData.registrationData.data?.attestationResult?.result?.txHash &&
        registrationData.attestationSignedVaa.data &&
        registrationData.attestationTxStatus.data === TransactionStatus.Successful
      ? 1
      : 0;
  }, [registrationData]);

  const description = useMemo(() => {
    if (!isAttestTxnReady) {
      if (isCorrectOriginNetwork) {
        return descriptionInfo.ATTEST_REQUIRED;
      } else {
        return descriptionInfo.ATTEST_SWITCH_NETWORK_REQUIRED;
      }
    } else if (isAttestTxnReady && !isAttestVaaReady) {
      return descriptionInfo.WAITING_ATTEST_VAA;
    } else if (isAttestTxnReady && isAttestVaaReady && !isRegisterTxnReady) {
      if (isCorrectDestNetwork) {
        return descriptionInfo.REGISTER_REQUIRED;
      } else {
        return descriptionInfo.REGISTER_SWITCH_NETWORK_REQUIRED;
      }
    } else if (isAttestTxnReady && isAttestVaaReady && isRegisterTxnReady) {
      return descriptionInfo.REGISTER_COMPLETE;
    }

    return '';
  }, [registrationData]);

  const isAttestButtonDisabled = useMemo(() => {
    return (
      registrationData.wallet.state === WalletState.DISCONNECTED ||
      !registrationData.wallet.wallet ||
      registrationData.wallet.error != null ||
      !targetAssetData.data ||
      registrationData.wallet.wallet.chainId !== targetAssetData.data.originChainId
    );
  }, [registrationData.wallet, targetAssetData.data]);

  const isRegistrationButtonDisabled = useMemo(() => {
    return (
      registrationData.wallet.state === WalletState.DISCONNECTED ||
      !registrationData.wallet.wallet ||
      registrationData.wallet.error != null ||
      !targetAssetData.data ||
      registrationData.wallet.wallet.chainId !== targetAssetData.data.targetChainId
    );
  }, [registrationData.wallet, targetAssetData.data]);

  useEffect(() => {
    if (registrationData.registrationTxStatus.data === TransactionStatus.Successful) {
      // trigger register token complete function when registration is completed
      console.log('on register token complete');
      onRegisterTokenCompleted();
    }
  }, [registrationData.registrationTxStatus.data]);

  useEffect(() => {
    if (
      !isAttestTxnReady &&
      targetAssetData.data?.originChainId &&
      registrationData.registrationData.data?.registerRequired &&
      (registrationData.wallet.expectedChainId !== targetAssetData.data.originChainId ||
        registrationData.wallet.error === errorIncorrectChain) &&
      sourceWallet.wallet?.availableChainIds.includes(targetAssetData.data.originChainId) &&
      sourceWallet.expectedWalletName
    ) {
      onConnectToAttestationChain({
        chainId: targetAssetData.data.originChainId,
        walletName: sourceWallet.expectedWalletName,
      });
    }
  }, [
    isAttestTxnReady,
    registrationData.wallet.expectedChainId,
    registrationData.wallet.error,
    registrationData.registrationData.data?.registerRequired,
    sourceWallet.wallet,
    sourceWallet.expectedWalletName,
    targetAssetData.data?.originChainId,
  ]);

  useEffect(() => {
    const targetAbstractWallet = wallets.find((item) => item.walletName === targetWallet.wallet?.walletName);

    if (
      isAttestTxnReady &&
      isAttestVaaReady &&
      !isRegisterTxnReady &&
      targetAssetData.data?.targetChainId &&
      registrationData.registrationData.data?.registerRequired &&
      targetAbstractWallet &&
      targetAbstractWallet.availableChainIds.includes(targetAssetData.data.targetChainId)
    ) {
      onConnectToRegistrationChain({
        chainId: targetAssetData.data.targetChainId,
        walletName: targetAbstractWallet.walletName,
      });
    }
  }, [
    isAttestTxnReady,
    isAttestVaaReady,
    isRegisterTxnReady,
    targetWallet.wallet?.walletName,
    targetAssetData.data?.targetChainId,
    registrationData.registrationData.data?.registerRequired,
  ]);

  function onSelectWallet(walletName: string) {
    if (targetAssetData && targetAssetData.data) {
      if (!isAttestTxnReady) {
        onConnectToAttestationChain({ chainId: targetAssetData.data.originChainId, walletName });
      } else if (!isRegisterTxnReady) {
        onConnectToRegistrationChain({ chainId: targetAssetData.data.targetChainId, walletName });
      }
    }
  }

  return sourceToken && isTargetAssetAvailable && registrationData.registrationData.data?.registerRequired ? (
    <div className={RegistrationWrapper}>
      <div>Confirmations needed {`(${steps}/2)`}</div>
      <div className={DescriptionWrapper}>
        <div>{description}</div>
        <Button
          className={LearnMoreButtonStyle}
          type="secondary"
          href="https://book.wormhole.com/technical/typescript/attestingToken.html"
          target="_blank"
          rel="noopener noreferrer">
          Learn More
        </Button>
      </div>
      <div className={ButtonsGroupWrapper}>
        {!isAttestTxnReady || !isAttestVaaReady ? (
          <AttestButton
            disabled={isAttestButtonDisabled}
            registrationData={registrationData}
            targetAssetData={targetAssetData}
            onAttestToken={onAttestToken}
          />
        ) : !isRegisterTxnReady ? (
          <RegisterButton
            disabled={isRegistrationButtonDisabled}
            registrationData={registrationData}
            onRegisterToken={onRegisterToken}
          />
        ) : null}
        {isShowWalletButton && (
          <WalletSelectorButton
            type="secondary"
            disabled={!targetAssetData.data}
            chainId={
              !isAttestTxnReady
                ? targetAssetData.data?.originChainId
                : !isRegisterTxnReady
                ? targetAssetData.data?.targetChainId
                : undefined
            }
            walletSelectorModalVisible={visible}
            wallets={wallets}
            onSelectWallet={({ walletName }) => {
              onSelectWallet(walletName);
            }}
            onWalletSelectorModalVisibleChange={setVisible}
          />
        )}
      </div>
    </div>
  ) : null;
};

interface AttestButtonProps {
  disabled: boolean;
  registrationData: RegistrationData;
  targetAssetData: DataResult<TargetAsset | undefined>;
  onAttestToken: (options: { originTokenAddress: string }) => void;
}

export const AttestButton: React.SFC<AttestButtonProps> = ({
  disabled,
  registrationData,
  targetAssetData,
  onAttestToken,
}) => {
  const isButtonReady = !!(targetAssetData && targetAssetData.data?.originAddress);
  const isLoading =
    registrationData.registrationData.data?.attestationResult?.loading ||
    registrationData.attestationSignedVaa.loading ||
    (registrationData.registrationData.data?.attestationResult?.result?.txHash &&
    registrationData.attestationTxStatus.data == null
      ? true
      : false);
  const isDisabled = isLoading || !isButtonReady || disabled;

  const originTokenAddress =
    targetAssetData && targetAssetData.data && targetAssetData.data.originAddress
      ? targetAssetData.data.originAddress
      : undefined;

  return (
    <Button
      className={AttestButtonStyle}
      type="primary"
      loading={isLoading}
      disabled={isDisabled}
      onClick={() => (originTokenAddress ? onAttestToken({ originTokenAddress }) : void undefined)}>
      {registrationData.attestationSignedVaa.loading ? 'Attest Token (pending wormhole verification)' : 'Attest Token'}
    </Button>
  );
};

interface RegisterButtonProps {
  disabled: boolean;
  registrationData: RegistrationData;
  onRegisterToken: (options: { signedVAA: Uint8Array }) => void;
}

export const RegisterButton: React.SFC<RegisterButtonProps> = ({ disabled, registrationData, onRegisterToken }) => {
  const isButtonReady = !!(
    registrationData &&
    registrationData.attestationSignedVaa.data &&
    !registrationData.attestationSignedVaa.error
  );
  const isLoading =
    registrationData.registrationData.data?.registrationResult?.loading ||
    (registrationData.registrationData.data?.registrationResult?.result?.txHash &&
    registrationData.registrationTxStatus.data == null
      ? true
      : false);
  const isDisabled = isLoading || !isButtonReady || disabled;

  const signedVAA =
    registrationData.attestationSignedVaa.data && 'vaaBytes' in registrationData.attestationSignedVaa.data
      ? registrationData.attestationSignedVaa.data.vaaBytes
      : undefined;

  return (
    <Button
      className={AttestButtonStyle}
      type="primary"
      loading={isLoading}
      disabled={isDisabled}
      onClick={() => {
        if (signedVAA) {
          onRegisterToken({ signedVAA });
        }
      }}>
      Register Token
    </Button>
  );
};

const AttestButtonStyle = css`
  flex-grow: 1;
`;

const ButtonsGroupWrapper = css`
  display: flex;
  gap: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(8)};
  }
`;

const DescriptionWrapper = css`
  display: flex;
  justify-content: space-between;
  font-weight: 400;
  font-size: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(16)};
  }
`;

const LearnMoreButtonStyle = css`
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--color-text);
  font-weight: 600;
  background: transparent;
  border: solid ${pxToPcVw(2)} var(--color-border);
  padding: 0 ${pxToPcVw(12)} !important;
  height: ${pxToPcVw(44)};
  border-radius: ${pxToPcVw(8)};
  line-height: ${pxToPcVw(44)};
  font-size: ${pxToPcVw(14)};

  &:hover {
    background: transparent;
    color: var(--color-border);
    border: solid ${pxToPcVw(2)} var(--color-border);
  }

  @media (max-width: 1024px) {
    padding: 0 ${pxToMobileVw(12)} !important;
    border: solid ${pxToMobileVw(2)} var(--color-border);
    height: ${pxToMobileVw(44)};
    border-radius: ${pxToMobileVw(8)};
    line-height: ${pxToMobileVw(44)};
    font-size: ${pxToMobileVw(14)};
  }
`;

const RegistrationWrapper = css`
  display: flex;
  flex-direction: column;
  width: ${pxToPcVw(588)};
  border-radius: ${pxToPcVw(8)};
  border: ${pxToPcVw(2)} solid var(--color-border);
  padding: ${pxToPcVw(16)};
  gap: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    width: 100%;
    border-radius: ${pxToMobileVw(8)};
    border: ${pxToMobileVw(2)} solid var(--color-border);
    padding: ${pxToMobileVw(16)};
    gap: ${pxToMobileVw(16)};
  }
`;
