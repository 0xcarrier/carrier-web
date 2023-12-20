import { css } from '@linaria/core';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWalletAdapter } from '../../context/Wallet/WalletProvider';
import { useTokenPriceData } from '../../hooks/useTokenPrices';
import { useTokens } from '../../hooks/useTokens';
import { selectSourceChain, selectTargetChain, swapChain, useWallet, Wallet } from '../../hooks/useWallet';
import { routes } from '../../utils/routes';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { SourceWalletSelector } from '../common/SourceWalletSelector/SourceWalletSelector';
import { SwapChainButton } from '../common/SwapChainButton/SwapChainButton';
import { TargetWalletSelector } from '../common/TargetWalletSelector/TargetWalletSelector';
import { useAmountData } from '../../hooks/useAmountData';
import { useMaxAmountData } from '../../hooks/useMaxAmoutData';
import { useProviderFeeData } from './hooks/useProviderFeeData';
import { useBridgeFee } from './hooks/useBridgeFee';
import {
  CarrierChainId,
  SwapChains,
  getDefaultNativeCurrencyAddress,
  getTokenBridgeAddressForChain,
} from '../../utils/consts';
import { getLocalStorageAdvanceOptions, setLocalStorageAdvanceOptions } from '../../utils/localStorageAdvanceOptions';
import {
  cacheSourceWalletNameToLocal,
  cacheTargetWalletNameAndAddressToLocal,
  getAvailableChainCache,
  removeSourceWalletNameFromLocal,
  removeTargetWalletNameAndAddressFromLocal,
} from '../../utils/chainCache';
import { useAutoConnection } from '../../hooks/useAutoConnection';
import { WalletError } from '../WalletError/WalletError';
import { setAppTouchedByUser } from '../../store/dispatcher';
import { useWalletChangedListener } from '../../hooks/useWalletChangedListener';
import { useTargetWallet } from '../../hooks/useTargetWallet';
import { CHAIN_ID_SOLANA } from '@certusone/wormhole-sdk';
import { SendOrApproveButton, SendTokenData } from './SendOrApproveButton';
import { useRexContext } from '@jimengio/rex';
import { IStore } from '../../store';
import { useAllowance } from '../../hooks/useAllowance';
import { SettingButton } from './SettingButton';
import { TokenSelectorSection } from './TokenSelectorSection';
import { useTokenData } from './hooks/useTokenData';
import { useTargetAmountData } from './hooks/useTargetAmountData';
import { useSlippageTolerance } from './hooks/useSlippageTolerance';
import { InfomationBar } from './InfomationBar';
import { RouteSettingsButton } from './RouteSettingsButton';
import { useRouteSettings } from './hooks/useRouteSettings';
import { useMaxTargetAmountData } from './hooks/useMaxTargetAmoutData';
import { useTransferAmountString } from './hooks/useTransferAmountString';
import { tryCarrierNativeToUint8Array } from '../../utils/web3Utils';

export const isEnableSwap = process.env.ENABLE_SWAP === 'true';

interface IProps {}

export const Swap: React.SFC<IProps> = () => {
  const navigate = useNavigate();
  const { walletCache, addingWallet } = useRexContext((store: IStore) => store);

  const chainAndWalletCache = getAvailableChainCache(SwapChains);
  const advanceOptions = getLocalStorageAdvanceOptions();

  // use wallet chain instead of sourceChainId directly
  // because when the sourceChainId is changed, the wallet still needs to wait until it was connected.
  // at this time, sourceChainId may not match the wallet address (like CHAIN_ID_SOLANA and wallet address still remaining to 0x...) and cause some errors.
  // only use sourceChainId on wallet selector section
  const [sourceWalletModalVisible, setSourceWalletModalVisible] = useState(false);
  const [targetWalletModalVisible, setTargetWalletModalVisible] = useState(false);
  const [sourceChainId, setSourceChainId] = useState(chainAndWalletCache.sourceChainId);
  const [targetChainId, setTargetChainId] = useState(chainAndWalletCache.targetChainId);
  const [isUsingRelayer, setIsUsingRelayer] = useState(advanceOptions?.isUsingRelayer || false);
  const [waitingTransferTxHash, setWaitingTransferTxHash] = useState(false);
  const [commandlineVisible, setCommandlineVisible] = useState(false);
  const [selectedRouterIndex, setSelectedRouterIndex] = useState(0);

  const { wallets } = useWalletAdapter();
  // TODO: disable error detect/reconnection when creating associated account
  const [enableWalletErrorTips, setEnableWalletErrorTips] = useState(true);
  const sourceWallet = useWallet();
  const targetWallet = useTargetWallet();

  const includeSourceTokens = useMemo(() => {
    return sourceWallet.expectedChainId
      ? [{ contractAddress: getDefaultNativeCurrencyAddress(sourceWallet.expectedChainId) }]
      : undefined;
  }, [sourceWallet.expectedChainId]);
  const sourceTokens = useTokens({
    chainId: sourceWallet.wallet?.chainId,
    walletAddress: sourceWallet.wallet?.walletAddress,
    isNFT: false,
    includeTokens: includeSourceTokens,
  });
  const sourceTokenData = useTokenData({ chainId: sourceWallet.expectedChainId, tokens: sourceTokens });
  const { amountString, setAmountString } = useTransferAmountString({
    sourceToken: sourceTokenData.token,
    isCommandlineVisible: commandlineVisible,
  });
  const tokenPricesData = useTokenPriceData(!!sourceTokenData.token, [sourceTokenData.token?.tokenAddress]);
  const providerFeeData = useProviderFeeData({
    sourceChainId: sourceWallet.expectedChainId,
    sourceToken: sourceTokenData.token,
    targetChainId: targetChainId,
    tokenPricesData,
    transferAmountString: amountString.sourceAmount,
  });
  const maxSourceAmountData = useMaxAmountData({
    sourceChainId: sourceWallet.expectedChainId,
    sourceToken: sourceTokenData.token,
    providerFeeData,
  });
  const sourceAmountData = useAmountData({
    transferAmountString: amountString.sourceAmount,
    sourceChainId: sourceWallet.expectedChainId,
    walletAddress: sourceWallet.wallet?.walletAddress,
    sourceToken: sourceTokenData.token,
    providerFeeData,
    maxAmountData: maxSourceAmountData,
  });
  const includeTargetTokens = useMemo(() => {
    return targetWallet.wallet?.chainId
      ? [{ contractAddress: getDefaultNativeCurrencyAddress(targetWallet.wallet.chainId) }]
      : undefined;
  }, [targetWallet.wallet?.chainId]);
  const targetTokens = useTokens({
    chainId: targetWallet.wallet?.chainId,
    walletAddress: targetWallet.wallet?.walletAddress,
    isNFT: false,
    includeTokens: includeTargetTokens,
  });
  const targetTokenData = useTokenData({ chainId: targetWallet.wallet?.chainId, tokens: targetTokens });
  const maxTargetAmountData = useMaxTargetAmountData({
    sourceChainId: sourceWallet.expectedChainId,
    sourceToken: sourceTokenData.token,
    targetChainId,
    targetToken: targetTokenData.token,
    maxSourceAmountData,
    selectedRouterIndex,
  });
  const targetAmountData = useTargetAmountData({
    transferAmountString: amountString.targetAmount,
    sourceToken: targetTokenData.token,
    maxTargetAmountData: maxTargetAmountData,
  });

  // we want to fetch token price when the source token changed
  // to keep the token price as accurate as possible
  const allowanceData = useAllowance({
    sourceChainId: sourceWallet.expectedChainId,
    targetChainId,
    sourceWallet,
    sourceToken: sourceTokenData.token,
    amountData: sourceAmountData,
    providerFeeData,
  });

  // TODO: refactor fee calculation, including source fee, dest fee
  const bridgeFeeData = useBridgeFee({
    sourceChainId: sourceWallet.expectedChainId,
    targetChainId,
    tokenPricesData,
    sourceToken: sourceTokenData.token,
    allowanceData,
    providerFeeData,
    isUsingRelayer,
  });

  const slippageToleranceData = useSlippageTolerance();

  const routeSettings = useRouteSettings({
    sourceWallet,
    sourceChainId: sourceWallet.expectedChainId,
    sourceToken: sourceTokenData.token,
    targetChainId,
    targetToken: targetTokenData.token,
    sourceTokenAmount: sourceAmountData,
    targetTokenAmount: targetAmountData,
    tokenPricesData,
    transferAmount: { amountString, setAmountString },
    selectedRouterIndex: selectedRouterIndex,
  });

  const shouldDisableUI = useMemo(
    () => {
      // TODO: sourceWallet.wallet?.swapNativeResult.loading
      return false;
    },
    [
      // TODO: sourceWallet.wallet?.swapNativeResult.loading
    ],
  );

  useAutoConnection({ sourceWallet, targetWallet, chainAndWalletCache });
  useWalletChangedListener({ sourceWallet, targetWallet });

  useEffect(() => {
    setEnableWalletErrorTips(addingWallet ? false : true);
  }, [addingWallet, setEnableWalletErrorTips]);

  useEffect(() => {
    if (waitingTransferTxHash) {
      // TODO: error and tx hash
      const txHash = '';
      // const txHash =
      //   sourceWallet.wallet?.swapNativeResult?.result?.txHash ||
      //   sourceWallet.wallet?.swapTokenResult?.result?.txHash;
      const chainId = sourceWallet.expectedChainId;
      // const error = sourceWallet.wallet?.swapNativeResult?.error || sourceWallet.wallet?.swapTokenResult?.error;
      const error = null;

      console.log('waitingTransferTxHash', txHash, chainId, error);
      if (error) {
        setWaitingTransferTxHash(false);
      } else if (chainId && txHash) {
        setWaitingTransferTxHash(false);

        navigate(routes.progress.getPath({ chainId, txHash }, { isUsingRelayer }));
      }
    }
  }, [
    waitingTransferTxHash,
    // sourceWallet.wallet?.swapNativeResult,
    // sourceWallet.wallet?.swapTokenResult,
    isUsingRelayer,
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

  return (
    <div className={styleContainer}>
      <div className={BridgeWrapper}>
        <div className={ConfigWrapper}>
          <SettingButton
            isUsingRelayer={isUsingRelayer}
            onSetIsUsingRelayer={(isUsingRelayer) => {
              setIsUsingRelayer(isUsingRelayer);
              setLocalStorageAdvanceOptions({ isUsingRelayer });
            }}
          />
          <RouteSettingsButton
            selectedRouterIndex={selectedRouterIndex}
            routeSettings={routeSettings}
            sourceToken={sourceTokenData.token}
            targetToken={targetTokenData.token}
          />
        </div>

        <WalletError
          sourceWallet={sourceWallet}
          targetWallet={targetWallet}
          enableWalletErrorTips={enableWalletErrorTips}
        />

        <div className={styleChainSelectContainer}>
          <div className={styleBlock}>
            <SourceWalletSelector
              className={styleChildBlock}
              disabled={shouldDisableUI}
              sourceChainId={sourceChainId}
              sourceWalletSelectorModalVisible={sourceWalletModalVisible}
              chains={SwapChains}
              sourceWallet={sourceWallet}
              wallets={wallets}
              onSelectChain={handleSelectSourceChain}
              onSelectWallet={({ walletName }) => {
                sourceWallet.connect({ chainId: sourceChainId, walletName });
                cacheSourceWalletNameToLocal(sourceChainId, walletName);
                setAppTouchedByUser();
              }}
              onDisconnect={({ walletName }) => {
                sourceWallet.disconnect({ chainId: sourceChainId, walletName });
                removeSourceWalletNameFromLocal(sourceChainId);
                setAppTouchedByUser();
              }}
              onSourceWalletSelectorModalVisibleChanged={setSourceWalletModalVisible}
            />
            <TokenSelectorSection
              className={styleChildBlock}
              disabled={shouldDisableUI}
              enableWalletErrorTips={enableWalletErrorTips}
              sourceWallet={sourceWallet}
              tokens={sourceTokens}
              token={sourceTokenData.token}
              amountData={sourceAmountData}
              maxAmountData={maxSourceAmountData}
              onAmountChanged={(amountString) => {
                setAmountString({ sourceAmount: amountString, targetAmount: '' });
              }}
              onSearchToken={({ tokenAddress }) => {
                sourceTokens.searchToken(tokenAddress);
              }}
              onSelectToken={({ tokenAddress }) => {
                // sourceTokenData.setSourceTokenAddress(tokenAddress);
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
            />
          </div>
          <SwapChainButton
            vertical
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
              className={styleChildBlock}
              disabled={shouldDisableUI}
              chains={SwapChains}
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
            <TokenSelectorSection
              className={styleChildBlock}
              disabled={shouldDisableUI}
              token={targetTokenData.token}
              tokens={targetTokens}
              amountData={targetAmountData}
              maxAmountData={maxTargetAmountData}
              onAmountChanged={(amountString) => {
                setAmountString({ sourceAmount: '', targetAmount: amountString });
              }}
              onSearchToken={({ tokenAddress }) => {
                targetTokens.searchToken(tokenAddress);
              }}
              onSelectToken={({ tokenAddress }) => {
                // targetTokenData.setSourceTokenAddress(tokenAddress);
                setAppTouchedByUser();
                setEnableWalletErrorTips(true);
              }}
            />
          </div>
        </div>
        <InfomationBar
          sourceChainId={sourceChainId}
          bridgeFee={bridgeFeeData}
          slippageTolerance={slippageToleranceData}
        />
        <SendOrApproveButton
          providerFeeData={providerFeeData}
          allowanceData={allowanceData}
          sourceWallet={sourceWallet}
          sourceToken={sourceTokenData.token}
          targetChainId={targetChainId}
          targetWallet={targetWallet}
          amountData={sourceAmountData}
          isUsingRelayer={isUsingRelayer}
          onApproveAmount={(amount) => {
            if (sourceWallet.wallet && sourceTokenData.token && sourceWallet.expectedChainId) {
              sourceWallet.wallet.approveToken({
                tokenAddress: sourceTokenData.token.tokenAddress,
                amount,
                spenderAddress: getTokenBridgeAddressForChain(sourceWallet.expectedChainId),
              });
            }
          }}
          onTransferData={(transferData) => {
            transferToken({ sourceWallet, transferData });
            setWaitingTransferTxHash(true);
          }}
        />
      </div>
    </div>
  );
};

function transferToken(data: { sourceWallet: Wallet; transferData: SendTokenData }) {
  const { sourceWallet, transferData } = data;
  const { sourceToken, amount, targetChainId, targetWallet, providerFee } = transferData;

  if (sourceWallet.wallet && targetWallet.wallet && sourceToken) {
    sourceWallet.wallet.clearTransferNativeResult();
    sourceWallet.wallet.clearTransferTokenResult();
    sourceWallet.wallet.clearTransferUSDCResult();
    sourceWallet.wallet.clearTransferTBTCResult();

    const { tokenAddress, decimals, isNativeAsset } = sourceToken;
    const targetAddress =
      targetChainId === CHAIN_ID_SOLANA
        ? targetWallet.wallet.extraData?.associatedAccountAddress
        : targetWallet.wallet.walletAddress;
    const transferOptions = {
      decimals,
      amount,
      recipientChain: targetChainId,
      recipientAddress: tryCarrierNativeToUint8Array(targetAddress, targetChainId),
      relayerFee: providerFee,
    };

    if (isNativeAsset) {
      // TODO: swapNative
      // sourceWallet.wallet.swapNative(transferOptions);
    } else {
      // TODO: swapToken
      // sourceWallet.wallet.swapToken({
      //   tokenAddress,
      //   ...transferOptions,
      // });
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
  justify-content: flex-end;
  gap: ${pxToPcVw(16)};
  height: ${pxToPcVw(44)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(16)};
    height: ${pxToMobileVw(44)};
  }
`;

const styleChainSelectContainer = css`
  display: flex;
  flex-direction: column;
  position: relative;
  width: ${pxToPcVw(588)};
  gap: ${pxToPcVw(24)};

  @media (max-width: 1024px) {
    width: 100%;
    gap: ${pxToMobileVw(0)};
  }
`;

const styleBlock = css`
  display: flex;
  gap: ${pxToPcVw(16)};
  border: ${pxToPcVw(2)} solid var(--color-border);
  border-radius: ${pxToPcVw(8)};
  padding: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    flex-direction: column;
    gap: ${pxToMobileVw(16)};
    border: ${pxToMobileVw(2)} solid var(--color-border);
    border-radius: ${pxToMobileVw(8)};
    padding: ${pxToMobileVw(16)};
  }
`;

const styleChildBlock = css`
  flex: 1;
`;
