import { css, cx } from '@linaria/core';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWalletAdapter } from '../../context/Wallet/WalletProvider';
import { useTargetAsset } from '../../hooks/useTargetAsset';
import { useTokenPriceData } from '../../hooks/useTokenPrices';
import { useTokens } from '../../hooks/useTokens';
import { selectSourceChain, selectTargetChain, swapChain, useWallet, Wallet } from '../../hooks/useWallet';
import { routes } from '../../utils/routes';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { SourceWalletSelector } from '../common/SourceWalletSelector/SourceWalletSelector';
import { SwapChainButton } from '../common/SwapChainButton/SwapChainButton';
import { TargetWalletSelector } from '../common/TargetWalletSelector/TargetWalletSelector';
import { useBridgeFee } from './hooks/useBridgeFee';
import { CarrierChainId, NFTBridgeChains, getNFTBridgeAddressForChain } from '../../utils/consts';
import { useSourceTokenData } from './hooks/useSourceTokenData';
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
import { useRexContext } from '@jimengio/rex';
import { IStore } from '../../store';
import { useNFTApproved } from './hooks/useAllowance';
import { SendOrApproveButton, SendTokenData } from './SendOrApproveButton';
import { NFTSelectorSection } from './NFTSelectorSection';
import { InfoBanner } from '../common/InfoBanner';
import { CommandLinePanel } from '../CommandLinePanel/CommandLinePanel';
import { useAssociatedAccountData } from './hooks/useAssociatedAccountData';
import { TransferNFTData } from '../../context/Wallet/types';
import { isCarrierEVMChain, tryCarrierNativeToUint8Array } from '../../utils/web3Utils';
import { useTokenError } from '../../hooks/useTokenError';
import { errorNetworksIsDisabled, errorNetworksIsNotCompatible, useNetworkError } from '../../hooks/useNetworkError';
import { useWalletBlackList } from '../../hooks/useWalletBlackList';

interface IProps {}

export const NFTBridge: React.SFC<IProps> = () => {
  const navigate = useNavigate();
  const { walletCache, addingWallet } = useRexContext((store: IStore) => store);
  const chainAndWalletCache = getAvailableChainCache(NFTBridgeChains);

  // use wallet chain instead of sourceChainId directly
  // because when the sourceChainId is changed, the wallet still needs to wait until it was connected.
  // at this time, sourceChainId may not match the wallet address (like CHAIN_ID_SOLANA and wallet address still remaining to 0x...) and cause some errors.
  // only use sourceChainId on wallet selector section
  const [sourceWalletModalVisible, setSourceWalletModalVisible] = useState(false);
  const [targetWalletModalVisible, setTargetWalletModalVisible] = useState(false);
  const [sourceWalletAccountModalVisible, setSourceWalletAccountModalVisible] = useState(false);
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
    isNFT: true,
  });
  const sourceTokenData = useSourceTokenData({ sourceTokens, sourceWallet });
  const tokenError = useTokenError({
    sourceChainId: sourceWallet.expectedChainId,
    targetChainId,
    tokenAddress: sourceTokenData.sourceToken?.tokenAddress,
  });

  // NOTICE: only need to refresh with retry when token registed, because it may delay when register is finished
  const targetAssetData = useTargetAsset({
    sourceChainId: sourceWallet.expectedChainId,
    sourceToken: sourceTokenData.sourceToken,
    targetChainId: targetChainId,
    isNFT: true,
  });

  // we want to fetch token price when the source token changed
  // to keep the token price as accurate as possible
  const tokenPricesData = useTokenPriceData(!!sourceTokenData.sourceToken, [sourceTokenData.sourceToken?.tokenAddress]);
  const approvedData = useNFTApproved({ sourceWallet, sourceToken: sourceTokenData.sourceToken });
  const bridgeFee = useBridgeFee({
    sourceChainId: sourceWallet.expectedChainId,
    targetChainId,
    tokenPricesData,
    sourceToken: sourceTokenData.sourceToken,
  });

  const associatedAccountData = useAssociatedAccountData({ targetAssetData, targetWallet });
  const shouldDisableUI = useMemo(() => {
    return sourceWallet.wallet?.approveNFTResult.loading || sourceWallet.wallet?.transferNFTResult.loading;
  }, [sourceWallet.wallet?.approveNFTResult.loading, sourceWallet.wallet?.transferNFTResult.loading]);

  useAutoConnection({ sourceWallet, targetWallet, chainAndWalletCache });
  useWalletChangedListener({ sourceWallet, targetWallet });

  useEffect(() => {
    setEnableWalletErrorTips(addingWallet ? false : true);
  }, [addingWallet]);

  useEffect(() => {
    if (waitingTransferTxHash) {
      const txHash = sourceWallet.wallet?.transferNFTResult?.result?.txHash;
      const chainId = sourceWallet.expectedChainId;
      const error = sourceWallet.wallet?.transferNFTResult?.error;

      console.log('waitingTransferTxHash', txHash, chainId, error);
      if (error) {
        setWaitingTransferTxHash(false);
      } else if (chainId && txHash) {
        setWaitingTransferTxHash(false);

        navigate(routes.progress.getPath({ chainId, txHash }, { isUsingRelayer: false }));
      }
    }
  }, [waitingTransferTxHash, sourceWallet.wallet?.transferNFTResult]);

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
    },
    [wallets, sourceWallet, sourceChainId, targetWallet, setSourceChainId, setTargetChainId],
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
    },
    [wallets, targetChainId, sourceWallet, targetWallet, setSourceChainId, setTargetChainId],
  );

  const handleSelectToken = useCallback(
    (options: { tokenAddress: string; tokenId?: string }) => {
      const { tokenAddress, tokenId } = options;

      sourceTokenData.setSourceTokenData({ tokenAddress, tokenId });
      setAppTouchedByUser();
    },
    [sourceTokenData.setSourceTokenData],
  );

  return (
    <div className={styleContainer}>
      <CommandLinePanel
        visible={commandlineVisible}
        isNFT={true}
        sourceChainId={sourceChainId}
        targetChainId={targetChainId}
        sourceWallet={sourceWallet}
        sourceTokens={sourceTokens}
        sourceToken={sourceTokenData.sourceToken}
        onSelectSourceChain={handleSelectSourceChain}
        onSelectTargetChain={handleSelectTargetChain}
        onSelectToken={handleSelectToken}
        onSourceWalletModalChanged={setSourceWalletModalVisible}
        onVisibleChanged={setCommandlineVisible}
      />
      <div className={BridgeWrapper}>
        <div className={ConfigWrapper}>
          <Link className={cx(styleNav)} to={routes.tokenBridge.getPath()}>
            Token
          </Link>
          <Link className={cx(styleNav, styleNavActived)} to={routes.nftBridge.getPath()}>
            NFT
          </Link>
          <div className={commandLineHintMessage}>“/” for text shortcuts</div>
        </div>

        {isCarrierEVMChain(sourceChainId) ? (
          <InfoBanner
            className={{ container: styleInfoBanner }}
            message="Only NFTs which implement ERC-721 are supported."
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
              chains={NFTBridgeChains}
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
            }}
          />
          <div className={styleBlock}>
            <TargetWalletSelector
              disabled={shouldDisableUI}
              chains={NFTBridgeChains}
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
        <NFTSelectorSection
          disabled={shouldDisableUI}
          enableWalletErrorTips={enableWalletErrorTips}
          sourceChainId={sourceWallet.expectedChainId}
          sourceWallet={sourceWallet}
          sourceTokens={sourceTokens}
          sourceToken={sourceTokenData.sourceToken}
          bridgeFee={bridgeFee}
          tokenPricesData={tokenPricesData}
          targetAssetData={targetAssetData}
          tokenError={tokenError}
          onSearchToken={({ tokenAddress, tokenId }) => {
            sourceTokens.searchToken(tokenAddress, tokenId);
          }}
          onSelectToken={handleSelectToken}
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
        <SendOrApproveButton
          approvalData={approvedData}
          associatedAccountData={associatedAccountData}
          sourceWallet={sourceWallet}
          sourceToken={sourceTokenData.sourceToken}
          targetAssetData={targetAssetData}
          targetChainId={targetChainId}
          targetWallet={targetWallet}
          networkError={networkError}
          tokenError={tokenError}
          isWalletBlocked={walletBlacklist.data}
          onApprove={() => {
            if (sourceWallet.wallet && sourceTokenData.sourceToken && sourceWallet.expectedChainId) {
              sourceWallet.wallet.approveNFT({
                tokenAddress: sourceTokenData.sourceToken.tokenAddress,
                tokenId: sourceTokenData.sourceToken.tokenId || '',
                spenderAddress: getNFTBridgeAddressForChain(sourceWallet.expectedChainId),
              });
            }
          }}
          onTransferData={(transferData) => {
            transferNFT({ sourceWallet, transferData });
            setWaitingTransferTxHash(true);
          }}
        />
      </div>
    </div>
  );
};

function transferNFT(data: { sourceWallet: Wallet; transferData: SendTokenData }) {
  const { sourceWallet, transferData } = data;
  const { sourceToken, targetChainId, targetWallet, targetAsset, providerFee } = transferData;

  if (sourceWallet.wallet && targetWallet.wallet && sourceToken && targetAsset) {
    sourceWallet.wallet.clearTransferNFTResult();

    const { tokenAddress, decimals } = sourceToken;

    const targetAddress =
      targetChainId === CHAIN_ID_SOLANA
        ? targetWallet.wallet.extraData.associatedAccountAddress
        : targetWallet.wallet.walletAddress;

    const transferOptions = {
      tokenAddress,
      decimals,
      recipientChain: targetChainId,
      recipientAddress: targetAddress,
      originChain: targetAsset.originChainId,
      originAddress: targetAsset.originAddress,
      relayerFee: providerFee,
      tokenId: targetAsset.originTokenId || '0', // native solana nft has no token id, set a default '0'
    } as TransferNFTData;

    sourceWallet.wallet.transferNFT(transferOptions);
  }
}

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
