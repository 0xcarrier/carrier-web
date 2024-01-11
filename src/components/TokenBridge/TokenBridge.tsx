import { CHAIN_ID_SOLANA } from '@certusone/wormhole-sdk';
import { css, cx } from '@linaria/core';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWalletAdapter } from '../../context/Wallet/WalletProvider';
import { useAllowance } from '../../hooks/useAllowance';
import { useTargetAsset } from '../../hooks/useTargetAsset';
import { useTokenPriceData } from '../../hooks/useTokenPrices';
import { useTokens } from '../../hooks/useTokens';
import { selectSourceChain, selectTargetChain, swapChain, useWallet, Wallet } from '../../hooks/useWallet';
import { routes } from '../../utils/routes';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { SourceWalletSelector } from '../common/SourceWalletSelector/SourceWalletSelector';
import { SwapChainButton } from '../common/SwapChainButton/SwapChainButton';
import { TargetWalletSelector } from '../common/TargetWalletSelector/TargetWalletSelector';
import { useAmountData } from '../../hooks/useAmountData';
import { SettingButton } from './SettingButton';
import { useMaxAmountData } from '../../hooks/useMaxAmoutData';
import { useRegistrationData } from '../../hooks/useRegistrationData';
import { useProviderFeeData } from '../../hooks/useProviderFeeData';
import { TokenSelectorSection } from './TokenSelectorSection';
import { RegistrationSection } from './RegistrationSection';
import { useBridgeFee } from './hooks/useBridgeFee';
import { InfoBanner } from '../common/InfoBanner';
import { CarrierChainId, TokenBridgeChains, getTokenBridgeAddressForChain } from '../../utils/consts';
import { useSourceTokenData } from './hooks/useSourceTokenData';
import { useTransferAmountString } from '../../hooks/useTransferAmountString';
import { setLocalStorageAdvanceOptions } from '../../utils/localStorageAdvanceOptions';
import {
  cacheSourceWalletNameToLocal,
  cacheTargetWalletNameAndAddressToLocal,
  getAvailableChainCache,
  removeSourceWalletNameFromLocal,
  removeTargetWalletNameAndAddressFromLocal,
} from '../../utils/chainCache';
import { useAutoConnection } from '../../hooks/useAutoConnection';
import { getTBTCAddressForChain, getTBTCGatewayForChain, isTBTCCanBeBridgeToTarget } from '../../utils/tbtc';
import { WalletError } from '../WalletError/WalletError';
import { setAppTouchedByUser } from '../../store/dispatcher';
import { useWalletChangedListener } from '../../hooks/useWalletChangedListener';
import { useTargetWallet } from '../../hooks/useTargetWallet';
import { SendOrApproveButton, SendTokenData } from './SendOrApproveButton';
import { useRexContext } from '@jimengio/rex';
import { IStore } from '../../store';
import { SolanaCreateAssociatedAccountSection } from './SolanaAssociatedAccountSection';
import { useAssociatedAccountData } from '../../hooks/useAssociatedAccountData';
import { CommandLinePanel } from '../CommandLinePanel/CommandLinePanel';
import { getCCTPNetworkConfigs, isUSDCCanBeBridgeByCCTP } from '../../utils/cctp';
import { useBridgeLimitData } from './hooks/useBridgeLimitData';
import { isCarrierPolkaChain } from '../../utils/web3Utils';
import { useRelayerSettings } from './hooks/useRelayerSettings';
import { errorNetworksIsDisabled, errorNetworksIsNotCompatible, useNetworkError } from '../../hooks/useNetworkError';
import { useRandomXCMFee } from './hooks/useRandomXCMFee';
import { useTokenError } from '../../hooks/useTokenError';
import { useWalletBlackList } from '../../hooks/useWalletBlackList';

interface IProps {}

export const TokenBridge: React.SFC<IProps> = () => {
  const navigate = useNavigate();
  const { walletCache, addingWallet } = useRexContext((store: IStore) => store);

  const chainAndWalletCache = getAvailableChainCache(TokenBridgeChains);

  // use wallet chain instead of sourceChainId directly
  // because when the sourceChainId is changed, the wallet still needs to wait until it was connected.
  // at this time, sourceChainId may not match the wallet address (like CHAIN_ID_SOLANA and wallet address still remaining to 0x...) and cause some errors.
  // only use sourceChainId on wallet selector section
  const [sourceWalletModalVisible, setSourceWalletModalVisible] = useState(false);
  const [sourceWalletAccountModalVisible, setSourceWalletAccountModalVisible] = useState(false);
  const [targetWalletModalVisible, setTargetWalletModalVisible] = useState(false);
  const [sourceChainId, setSourceChainId] = useState(chainAndWalletCache.sourceChainId);
  const [targetChainId, setTargetChainId] = useState(chainAndWalletCache.targetChainId);
  const [waitingTransferTxHash, setWaitingTransferTxHash] = useState(false);
  const [commandlineVisible, setCommandlineVisible] = useState(false);
  const [accountList, setAccountList] = useState<{ walletName: string; accounts: string[] } | undefined>();

  const { wallets } = useWalletAdapter();
  // TODO: disable error detect/reconnection when creating associated account
  const [enableWalletErrorTips, setEnableWalletErrorTips] = useState(true);
  const sourceWallet = useWallet();
  const targetWallet = useTargetWallet();
  const networkError = useNetworkError({ sourceChainId: sourceWallet.expectedChainId, targetChainId });
  const walletBlacklist = useWalletBlackList({ walletAddress: sourceWallet.wallet?.walletAddress });
  const sourceTokens = useTokens({
    chainId: sourceWallet.wallet?.chainId,
    walletAddress: sourceWallet.wallet?.walletAddress,
    isNFT: false,
  });
  const sourceTokenData = useSourceTokenData({ sourceTokens, sourceWallet });
  const { transferAmountString, setTransferAmountString } = useTransferAmountString({
    sourceToken: sourceTokenData.sourceToken,
    isCommandlineVisible: commandlineVisible,
  });
  const tokenError = useTokenError({
    sourceChainId: sourceWallet.expectedChainId,
    targetChainId,
    tokenAddress: sourceTokenData.sourceToken?.tokenAddress,
  });

  // NOTICE: only need to refresh with retry when token registed, because it may delay when register is finished
  const targetAssetData = useTargetAsset({
    sourceChainId: sourceWallet.expectedChainId,
    sourceToken: sourceTokenData.sourceToken,
    targetChainId,
    isNFT: false,
  });

  // we want to fetch token price when the source token changed
  // to keep the token price as accurate as possible
  const tokenPricesData = useTokenPriceData(!!sourceTokenData.sourceToken, [sourceTokenData.sourceToken?.tokenAddress]);
  const relayerSettingsData = useRelayerSettings({
    sourceChainId: sourceWallet.expectedChainId,
    targetChainId,
  });
  const providerFeeData = useProviderFeeData({
    sourceChainId: sourceWallet.expectedChainId,
    sourceToken: sourceTokenData.sourceToken,
    targetAssetData,
    targetChainId,
    tokenPricesData,
    transferAmountString,
    isUsingRelayer: relayerSettingsData.isUsingRelayer,
  });
  const maxAmountData = useMaxAmountData({
    sourceChainId: sourceWallet.expectedChainId,
    sourceToken: sourceTokenData.sourceToken,
    providerFeeData,
  });
  const randomXCMFee = useRandomXCMFee({ sourceChainId, targetChainId, transferAmountString });
  const amountData = useAmountData({
    transferAmountString,
    sourceChainId: sourceWallet.expectedChainId,
    targetChainId,
    walletAddress: sourceWallet.wallet?.walletAddress,
    targetWalletAddress: targetWallet.wallet?.walletAddress,
    sourceToken: sourceTokenData.sourceToken,
    providerFeeData,
    maxAmountData,
    targetAssetData,
    randomXCMFee,
  });
  const allowanceData = useAllowance({
    sourceChainId: sourceWallet.expectedChainId,
    targetChainId,
    sourceWallet,
    sourceToken: sourceTokenData.sourceToken,
    amountData,
    providerFeeData,
  });
  const registrantionData = useRegistrationData({ targetChainId, targetAssetData });
  const bridgeFee = useBridgeFee({
    sourceChainId: sourceWallet.expectedChainId,
    targetChainId,
    tokenPricesData,
    sourceToken: sourceTokenData.sourceToken,
    allowanceData,
    providerFeeData,
    isUsingRelayer: relayerSettingsData.isUsingRelayer,
  });
  const bridgeLimitData = useBridgeLimitData({
    amountData,
    sourceChainId: sourceWallet.expectedChainId,
    sourceToken: sourceTokenData.sourceToken,
  });

  const associatedAccountData = useAssociatedAccountData({ targetAssetData, targetWallet });
  const shouldDisableUI = useMemo(() => {
    return (
      registrantionData.wallet.wallet?.registerTokenResult.loading ||
      registrantionData.wallet.wallet?.attestTokenResult.loading ||
      associatedAccountData.createAssociatedAccountResult.loading ||
      sourceWallet.wallet?.approveTokenResult.loading ||
      sourceWallet.wallet?.transferNativeResult.loading ||
      sourceWallet.wallet?.transferTokenResult.loading ||
      sourceWallet.wallet?.transferUSDCResult.loading ||
      sourceWallet.wallet?.transferTBTCResult.loading ||
      sourceWallet.wallet?.transferNativeByMRLResult.loading ||
      sourceWallet.wallet?.transferTokenByMRLResult.loading
    );
  }, [
    registrantionData.wallet.wallet?.registerTokenResult.loading,
    registrantionData.wallet.wallet?.attestTokenResult.loading,
    associatedAccountData.createAssociatedAccountResult.loading,
    sourceWallet.wallet?.approveTokenResult.loading,
    sourceWallet.wallet?.transferNativeResult.loading,
    sourceWallet.wallet?.transferTokenResult.loading,
    sourceWallet.wallet?.transferUSDCResult.loading,
    sourceWallet.wallet?.transferTBTCResult.loading,
    sourceWallet.wallet?.transferNativeByMRLResult.loading,
    sourceWallet.wallet?.transferTokenByMRLResult.loading,
  ]);

  useAutoConnection({ sourceWallet, targetWallet, chainAndWalletCache });
  useWalletChangedListener({ sourceWallet, targetWallet });

  useEffect(() => {
    setEnableWalletErrorTips(addingWallet ? false : true);
  }, [addingWallet, setEnableWalletErrorTips]);

  useEffect(() => {
    if (waitingTransferTxHash) {
      const txHash =
        sourceWallet.wallet?.transferNativeResult?.result?.txHash ||
        sourceWallet.wallet?.transferTokenResult?.result?.txHash ||
        sourceWallet.wallet?.transferUSDCResult?.result?.txHash ||
        sourceWallet.wallet?.transferTBTCResult?.result?.txHash ||
        sourceWallet.wallet?.transferNativeByMRLResult?.result?.txHash ||
        sourceWallet.wallet?.transferTokenByMRLResult?.result?.txHash;

      const chainId = sourceWallet.expectedChainId;
      const error =
        sourceWallet.wallet?.transferNativeResult?.error ||
        sourceWallet.wallet?.transferTokenResult?.error ||
        sourceWallet.wallet?.transferUSDCResult?.error ||
        sourceWallet.wallet?.transferTBTCResult?.error ||
        sourceWallet.wallet?.transferNativeByMRLResult?.error ||
        sourceWallet.wallet?.transferTokenByMRLResult?.error;

      console.log('waitingTransferTxHash', txHash, chainId, error);
      if (error) {
        setWaitingTransferTxHash(false);
      } else if (chainId && txHash) {
        setWaitingTransferTxHash(false);

        navigate(routes.progress.getPath({ chainId, txHash }, { isUsingRelayer: relayerSettingsData.isUsingRelayer }));
      }
    }
  }, [
    waitingTransferTxHash,
    sourceWallet.wallet?.transferNativeResult,
    sourceWallet.wallet?.transferTokenResult,
    sourceWallet.wallet?.transferUSDCResult,
    sourceWallet.wallet?.transferTBTCResult,
    sourceWallet.wallet?.transferNativeByMRLResult,
    sourceWallet.wallet?.transferTokenByMRLResult,
    relayerSettingsData.isUsingRelayer,
  ]);

  const handleSelectSourceChain = useCallback(
    (options: { chainId: CarrierChainId }) => {
      const { chainId } = options;
      if (chainId === targetChainId) {
        swapChain({
          wallets,
          sourceChainId: chainId,
          currentSourceWallet: sourceWallet,
          targetChainId: sourceChainId,
          currentTargetWallet: targetWallet,
          setSourceChainId,
          setTargetChainId,
        });
      } else {
        selectSourceChain({
          wallets,
          sourceChainId: chainId,
          currentSourceWallet: sourceWallet,
          setSourceChainId,
        });
      }

      setEnableWalletErrorTips(true);
    },
    [wallets, sourceWallet, sourceChainId, targetWallet, setSourceChainId, setTargetChainId, setEnableWalletErrorTips],
  );

  const handleSelectTargetChain = useCallback(
    (options: { chainId: CarrierChainId }) => {
      const { chainId } = options;
      if (chainId === sourceChainId) {
        swapChain({
          wallets,
          sourceChainId: targetChainId,
          currentSourceWallet: sourceWallet,
          targetChainId: chainId,
          currentTargetWallet: targetWallet,
          setSourceChainId,
          setTargetChainId,
        });
      } else {
        selectTargetChain({
          targetChainId: chainId,
          currentSourceWallet: sourceWallet,
          currentTargetWallet: targetWallet,
          setTargetChainId,
        });
      }

      setEnableWalletErrorTips(true);
    },
    [wallets, targetChainId, sourceWallet, targetWallet, setSourceChainId, setTargetChainId, setEnableWalletErrorTips],
  );

  const handleSelectToken = useCallback(
    (options: { tokenAddress: string }) => {
      const { tokenAddress } = options;
      sourceTokenData.setSourceTokenAddress(tokenAddress);
      setAppTouchedByUser();
    },
    [sourceTokenData.setSourceTokenAddress],
  );

  const handleAmountChanged = useCallback(
    (amountString: string) => {
      setTransferAmountString(amountString);
    },
    [setTransferAmountString],
  );

  return (
    <div className={styleContainer}>
      <CommandLinePanel
        visible={commandlineVisible}
        isNFT={false}
        sourceChainId={sourceChainId}
        targetChainId={targetChainId}
        sourceWallet={sourceWallet}
        sourceTokens={sourceTokens}
        sourceToken={sourceTokenData.sourceToken}
        transferAmountString={transferAmountString}
        onSelectSourceChain={handleSelectSourceChain}
        onSelectTargetChain={handleSelectTargetChain}
        onSelectToken={handleSelectToken}
        onTransferAmountChanged={handleAmountChanged}
        onSourceWalletModalChanged={setSourceWalletModalVisible}
        onVisibleChanged={setCommandlineVisible}
      />
      <div className={BridgeWrapper}>
        <div className={ConfigWrapper}>
          <Link className={cx(styleNav, styleNavActived)} to={routes.tokenBridge.getPath()}>
            Token
          </Link>
          <Link className={cx(styleNav)} to={routes.nftBridge.getPath()}>
            NFT
          </Link>
          <div className={commandLineHintMessage}>“/” for text shortcuts</div>
          <SettingButton
            className={settingsNav}
            isUsingRelayer={relayerSettingsData.isUsingRelayer}
            isRelayerSettingDisabled={relayerSettingsData.isRelayerSettingDisabled}
            onSetIsUsingRelayer={(isUsingRelayer) => {
              relayerSettingsData.setIsUsingRelayer(isUsingRelayer);
              setLocalStorageAdvanceOptions({ isUsingRelayer });
            }}
          />
        </div>
        {!relayerSettingsData.isUsingRelayer && providerFeeData.data?.relayable ? (
          <InfoBanner
            className={{ container: styleInfoBanner }}
            message='Relayer available for this token. Enable "Auto Relay" in Settings to have a better experience for a small fee.'
            closable
          />
        ) : null}

        <WalletError
          sourceWallet={sourceWallet}
          targetWallet={targetWallet}
          enableWalletErrorTips={enableWalletErrorTips}
        />

        {networkError ? (
          <InfoBanner
            className={{ container: styleInfoBanner }}
            type="warning"
            message={
              networkError === errorNetworksIsNotCompatible
                ? 'Source and destination networks are not compatible'
                : networkError === errorNetworksIsDisabled
                ? 'Source and destination networks are disabled'
                : 'Unknown network error'
            }
          />
        ) : null}

        {walletBlacklist.data ? (
          <InfoBanner className={{ container: styleInfoBanner }} type="error" message="Your wallet is blocked!" />
        ) : null}

        <div className={styleChainSelectContainer}>
          <div className={styleBlock}>
            <SourceWalletSelector
              disabled={shouldDisableUI}
              sourceChainId={sourceChainId}
              sourceWalletSelectorModalVisible={sourceWalletModalVisible}
              sourceWalletAccountSelectorModalVisible={sourceWalletAccountModalVisible}
              chains={TokenBridgeChains}
              sourceWallet={sourceWallet}
              wallets={wallets}
              accountList={accountList}
              onSelectChain={handleSelectSourceChain}
              onSelectWallet={async ({ walletName }) => {
                const accounts = await sourceWallet.getAccountList({ chainId: sourceChainId, walletName });

                if (accounts && accounts.length > 1) {
                  setAccountList({ walletName, accounts });
                  setSourceWalletAccountModalVisible(true);
                } else {
                  sourceWallet.connect({
                    chainId: sourceChainId,
                    walletName,
                    selectedAccount: accounts ? accounts[0] : undefined,
                  });

                  cacheSourceWalletNameToLocal(sourceChainId, walletName);
                  setAppTouchedByUser();
                }
              }}
              onSelectAccount={async ({ walletName, account }) => {
                sourceWallet.connect({ chainId: sourceChainId, walletName, selectedAccount: account });

                setAccountList(undefined);
                cacheSourceWalletNameToLocal(sourceChainId, walletName, account);
                setAppTouchedByUser();
              }}
              onDisconnect={({ walletName }) => {
                sourceWallet.disconnect({ chainId: sourceChainId, walletName });
                removeSourceWalletNameFromLocal(sourceChainId);
                setAppTouchedByUser();
              }}
              onSourceWalletSelectorModalVisibleChanged={setSourceWalletModalVisible}
              onSourceWalletAccountSelectorModalVisibleChanged={setSourceWalletAccountModalVisible}
            />
          </div>

          <SwapChainButton
            disabled={shouldDisableUI}
            onSwapChain={() => {
              swapChain({
                wallets,
                sourceChainId: targetChainId,
                currentSourceWallet: sourceWallet,
                targetChainId: sourceChainId,
                currentTargetWallet: targetWallet,
                setSourceChainId,
                setTargetChainId,
              });

              setEnableWalletErrorTips(true);
            }}
          />
          <div className={styleBlock}>
            <TargetWalletSelector
              disabled={shouldDisableUI}
              chains={TokenBridgeChains}
              targetWalletSelectorModalVisible={targetWalletModalVisible}
              targetChainId={targetChainId}
              targetWallet={targetWallet}
              abstractWallets={wallets}
              walletCache={walletCache}
              sourceWallet={sourceWallet}
              onSelectChain={handleSelectTargetChain}
              onSelectWallet={({ chainId, walletName, walletAddress }) => {
                targetWallet.connect({
                  walletAddress,
                  walletName,
                  chainId,
                });

                if (walletName) {
                  cacheTargetWalletNameAndAddressToLocal(chainId, walletName, walletAddress);
                } else {
                  removeTargetWalletNameAndAddressFromLocal(chainId);
                }

                setAppTouchedByUser();
              }}
              onDisconnect={() => {
                targetWallet.disconnect();
                removeTargetWalletNameAndAddressFromLocal(targetChainId);
                setAppTouchedByUser();
              }}
              onTargetWalletSelectorModalVisibleChanged={setTargetWalletModalVisible}
            />
          </div>
        </div>
        <TokenSelectorSection
          disabled={shouldDisableUI}
          enableWalletErrorTips={enableWalletErrorTips}
          sourceChainId={sourceWallet.expectedChainId}
          providerFeeData={providerFeeData}
          sourceWallet={sourceWallet}
          sourceTokens={sourceTokens}
          sourceToken={sourceTokenData.sourceToken}
          amountData={amountData}
          maxAmountData={maxAmountData}
          bridgeFee={bridgeFee}
          bridgeLimitData={bridgeLimitData}
          targetAssetData={targetAssetData}
          tokenPricesData={tokenPricesData}
          isUsingRelayer={relayerSettingsData.isUsingRelayer}
          tokenError={tokenError}
          onSearchToken={({ tokenAddress }) => {
            sourceTokens.searchToken(tokenAddress);
          }}
          onSelectToken={({ tokenAddress }) => {
            sourceTokenData.setSourceTokenAddress(tokenAddress);
            setAppTouchedByUser();
            setEnableWalletErrorTips(true);
          }}
          onConnectToNetwork={() => {
            if (sourceWallet.expectedChainId && sourceWallet.expectedWalletName) {
              sourceWallet.connect({
                chainId: sourceWallet.expectedChainId,
                walletName: sourceWallet.expectedWalletName,
              });

              setAppTouchedByUser();
            }
          }}
          onAmountChanged={(amountString) => {
            setTransferAmountString(amountString);
          }}
          onMaxAmountRetry={() => {
            maxAmountData.retry();
          }}
        />
        <RegistrationSection
          sourceWallet={sourceWallet}
          targetWallet={targetWallet}
          wallets={wallets}
          sourceToken={sourceTokenData.sourceToken}
          targetAssetData={targetAssetData}
          registrationData={registrantionData}
          onConnectToAttestationChain={({ chainId, walletName }) => {
            setEnableWalletErrorTips(false);
            registrantionData.wallet.connect({ chainId, walletName });
          }}
          onConnectToRegistrationChain={({ chainId, walletName }) => {
            setEnableWalletErrorTips(false);
            registrantionData.wallet.connect({ chainId, walletName });
          }}
          onAttestToken={({ originTokenAddress }) => {
            if (registrantionData.wallet.wallet) {
              registrantionData.wallet.wallet.attestToken({ tokenAddress: originTokenAddress });
            }
          }}
          onRegisterToken={({ signedVAA }) => {
            if (registrantionData.wallet.wallet) {
              registrantionData.wallet.wallet.registerToken({ signedVAA });
            }
          }}
          onRegisterTokenCompleted={() => {
            // switch source wallt back to source chain
            setEnableWalletErrorTips(true);

            targetAssetData.refresh();

            if (registrantionData.wallet.wallet) {
              registrantionData.wallet.wallet.clearAttestTokenResult();
              registrantionData.wallet.wallet.clearRegisterTokenResult();
              registrantionData.wallet.disconnect({
                chainId: registrantionData.wallet.wallet.chainId,
                walletName: registrantionData.wallet.wallet.walletName,
              });
            }

            // switch source wallt back to source chain
            if (sourceWallet.expectedChainId && sourceWallet.expectedWalletName) {
              sourceWallet.connect({
                chainId: sourceWallet.expectedChainId,
                walletName: sourceWallet.expectedWalletName,
              });
            }
          }}
        />
        <SolanaCreateAssociatedAccountSection
          associatedAccountData={associatedAccountData}
          targetAssetData={targetAssetData}
          targetWallet={targetWallet}
          wallets={wallets}
          onConnectSolanaWallet={({ chainId, walletName }) => {
            setEnableWalletErrorTips(false);
            associatedAccountData.wallet.connect({ chainId, walletName });
          }}
          onCreateAssociatedAccount={() => {
            associatedAccountData.createAssociatedAccount();
          }}
          onCreateAssociatedAccountCompleted={() => {
            // enable chain id detection
            setEnableWalletErrorTips(true);

            if (associatedAccountData.wallet.wallet) {
              associatedAccountData.wallet.wallet.clearSendTransactionResult();
              associatedAccountData.wallet.disconnect({
                chainId: associatedAccountData.wallet.wallet.chainId,
                walletName: associatedAccountData.wallet.wallet.walletName,
              });
            }

            // switch source wallt back to source chain
            if (sourceWallet.expectedChainId && sourceWallet.expectedWalletName) {
              sourceWallet.connect({
                chainId: sourceWallet.expectedChainId,
                walletName: sourceWallet.expectedWalletName,
              });
            }
          }}
        />
        <SendOrApproveButton
          providerFeeData={providerFeeData}
          allowanceData={allowanceData}
          sourceWallet={sourceWallet}
          sourceToken={sourceTokenData.sourceToken}
          targetAssetData={targetAssetData}
          targetChainId={targetChainId}
          targetWallet={targetWallet}
          amountData={amountData}
          bridgeLimitData={bridgeLimitData}
          isUsingRelayer={relayerSettingsData.isUsingRelayer}
          networkError={networkError}
          tokenError={tokenError}
          isWalletBlocked={walletBlacklist.data}
          onApproveAmount={(amount) => {
            if (sourceWallet.wallet && sourceTokenData.sourceToken && sourceWallet.expectedChainId) {
              const cctpNetworkConfigs = getCCTPNetworkConfigs({ sourceChainId, targetChainId });
              const TBTCGateway = getTBTCGatewayForChain(sourceChainId);
              const spenderAddress =
                cctpNetworkConfigs &&
                cctpNetworkConfigs.cctpSourceNetworkConfigs.usdcContractAddress.toLowerCase() ===
                  sourceTokenData.sourceToken.tokenAddress.toLowerCase()
                  ? cctpNetworkConfigs.cctpSourceNetworkConfigs.cctpMessengerContractAddress
                  : TBTCGateway &&
                    getTBTCAddressForChain(sourceChainId).toLowerCase() ===
                      sourceTokenData.sourceToken.tokenAddress.toLowerCase()
                  ? TBTCGateway
                  : getTokenBridgeAddressForChain(sourceWallet.expectedChainId);

              console.log('onApproveAmount', {
                tokenAddress: sourceTokenData.sourceToken.tokenAddress,
                amount: amount.toString(),
                spenderAddress,
              });

              sourceWallet.wallet.approveToken({
                tokenAddress: sourceTokenData.sourceToken.tokenAddress,
                amount,
                spenderAddress,
              });
            }
          }}
          onTransferData={(transferData) => {
            transferToken({ sourceWallet, transferData, randomXCMFee });
            setWaitingTransferTxHash(true);
          }}
        />
      </div>
    </div>
  );
};

function transferToken(data: { sourceWallet: Wallet; transferData: SendTokenData; randomXCMFee?: number }) {
  const { sourceWallet, transferData, randomXCMFee } = data;
  const { sourceToken, amount, targetChainId, targetWallet, targetAsset, providerFee } = transferData;

  if (sourceWallet.expectedChainId && sourceWallet.wallet && targetWallet.wallet && sourceToken && targetAsset) {
    sourceWallet.wallet.clearTransferNativeResult();
    sourceWallet.wallet.clearTransferTokenResult();
    sourceWallet.wallet.clearTransferUSDCResult();
    sourceWallet.wallet.clearTransferTBTCResult();
    sourceWallet.wallet.clearTransferNativeByMRLResult();
    sourceWallet.wallet.clearTransferTokenByMRLResult();

    const { tokenAddress, decimals, isNativeAsset } = sourceToken;
    const isTbtcBridge = isTBTCCanBeBridgeToTarget({
      sourceChainId: sourceWallet.expectedChainId,
      tokenAddress,
      targetChainId,
      originAddress: targetAsset.originAddress,
      originChainId: targetAsset.originChainId,
    });
    const isUSDCBridge = isUSDCCanBeBridgeByCCTP({
      sourceChainId: sourceWallet.expectedChainId,
      targetChainId,
      tokenAddress,
    });
    const isMRLBridge = isCarrierPolkaChain(sourceWallet.expectedChainId) || isCarrierPolkaChain(targetChainId);
    const targetAddress =
      targetChainId === CHAIN_ID_SOLANA && !isTbtcBridge
        ? targetWallet.wallet.extraData?.associatedAccountAddress
        : targetWallet.wallet.walletAddress;

    if (isMRLBridge) {
      if (isNativeAsset) {
        sourceWallet.wallet.transferNativeByMRL({
          decimals,
          amount,
          recipientChain: targetChainId,
          recipientAddress: targetAddress,
          relayerFeeParsed: providerFee,
          randomXCMFee,
        });
      } else {
        sourceWallet.wallet.transferTokenByMRL({
          tokenAddress,
          decimals,
          amount,
          recipientChain: targetChainId,
          recipientAddress: targetAddress,
          originChain: targetAsset.originChainId,
          originAddress: targetAsset.originAddress,
          relayerFeeParsed: providerFee,
          randomXCMFee,
        });
      }
    } else if (isUSDCBridge) {
      sourceWallet.wallet.transferUSDC({
        tokenAddress,
        amount,
        decimals,
        recipientChain: targetChainId,
        recipientAddress: targetAddress,
      });
    } else if (isNativeAsset) {
      sourceWallet.wallet.transferNative({
        decimals,
        amount,
        recipientChain: targetChainId,
        recipientAddress: targetAddress,
        relayerFee: providerFee,
      });
    } else if (isTbtcBridge) {
      sourceWallet.wallet.transferTBTC({
        decimals,
        amount,
        recipientChain: targetChainId,
        recipientAddress: targetAddress,
        tokenAddress,
      });
    } else {
      sourceWallet.wallet.transferToken({
        tokenAddress,
        originChain: targetAsset.originChainId,
        originAddress: targetAsset.originAddress,
        decimals,
        amount,
        recipientChain: targetChainId,
        recipientAddress: targetAddress,
        relayerFee: providerFee,
      });
    }
  }
}

const styleContainer = css`
  display: flex;
  align-items: flex-start;
  justify-content: center;
  margin-left: auto;
  margin-right: auto;
  width: 100%;
  padding-left: ${pxToPcVw(32)};
  padding-right: ${pxToPcVw(32)};
  max-width: ${pxToPcVw(1220)};

  @media (max-width: 1024px) {
    padding-left: 0;
    padding-right: 0;
    max-width: none;
  }
`;

const settingsNav = css`
  margin-left: auto;
`;

const styleNav = css`
  display: flex;
  align-items: center;
  height: ${pxToPcVw(36)};
  border-radius: ${pxToPcVw(18)};
  padding-inline: ${pxToPcVw(12)};
  transition: 0.3s;
  font-size: ${pxToPcVw(16)};
  font-weight: 500;
  color: #fff;

  &:hover {
    color: #fff;
    cursor: pointer;
  }

  @media (max-width: 1024px) {
    height: ${pxToMobileVw(36)};
    border-radius: ${pxToMobileVw(18)};
    padding-inline: ${pxToMobileVw(12)};
    font-size: ${pxToMobileVw(16)};
  }
`;

const styleNavActived = css`
  background: var(--ant-primary-color);
`;

const BridgeWrapper = css`
  display: flex;
  flex-direction: column;
  width: ${pxToPcVw(588)};
  margin: 0 auto;
  gap: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    width: 100%;
    margin: 0;
    gap: ${pxToPcVw(24)};
    padding-inline: ${pxToMobileVw(12)};
  }
`;

const ConfigWrapper = css`
  position: relative;
  display: flex;
  align-items: center;
  height: ${pxToPcVw(44)};

  @media (max-width: 1024px) {
    height: ${pxToMobileVw(44)};
  }
`;

const styleChainSelectContainer = css`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  position: relative;
  width: ${pxToPcVw(588)};
  grid-gap: ${pxToPcVw(24)};

  @media (max-width: 1024px) {
    display: block;
    width: 100%;
  }
`;

const commandLineHintMessage = css`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translateX(-50%) translateY(-50%);
  font-weight: 400;
  font-size: ${pxToPcVw(14)};
  line-height: calc(14 / 17);
  color: var(--color-text-3);

  @media (max-width: 1024px) {
    display: none;
  }
`;

const styleBlock = css`
  border: ${pxToPcVw(2)} solid var(--color-border);
  border-radius: ${pxToPcVw(8)};
  padding: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    border: ${pxToMobileVw(2)} solid var(--color-border);
    border-radius: ${pxToMobileVw(8)};
    padding: ${pxToMobileVw(16)};
  }
`;

const styleInfoBanner = css`
  width: ${pxToPcVw(588)};

  @media (max-width: 1024px) {
    width: 100%;
  }
`;
