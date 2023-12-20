import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { css, cx } from '@linaria/core';

import MagnifierIcon from '../../assets/magnifier.svg';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import {
  Command,
  getActions,
  getSourceChainByCommand,
  getTargetChainByCommand,
  parseNFTTransferCommand,
  parseTokenTransferCommand,
  setRecentlyUsedCommand,
  setRecentlyUsedSourceChain,
  setRecentlyUsedTargetChain,
  setRecentlyUsedToken,
  validateCommandFinshed,
} from './helper';
import CommandLinePanelDropdown from './CommandLinePanelDropdown';
import { Modal } from '../common/Modal';
import { CHAIN_ID_SOLANA } from '@certusone/wormhole-sdk';
import { Spinner } from '../common/Spinner';
import { Wallet } from '../../hooks/useWallet';
import { SVGIcon } from '../common/SVGIcon';
import { TokensData } from '../../hooks/useTokens';
import { NFTData } from '../../utils/tokenData/helper';
import { WalletState } from '../../context/Wallet/types';
import { CarrierChainId } from '../../utils/consts';
import { isCarrierEVMChain } from '../../utils/web3Utils';

interface ImplProps {
  isNFT: boolean;
  sourceChainId: CarrierChainId;
  targetChainId: CarrierChainId;
  sourceWallet: Wallet;
  sourceTokens: TokensData;
  sourceToken: NFTData | undefined;
  transferAmountString?: string;
  onSelectSourceChain: (options: { chainId: CarrierChainId }) => void;
  onSelectTargetChain: (options: { chainId: CarrierChainId }) => void;
  onSelectToken: (options: { tokenAddress: string; tokenId?: string }) => void;
  onTransferAmountChanged?: (amount: string) => void;
  onSourceWalletModalChanged: (visible: boolean) => void;
  onClose: () => void;
}

const CommandLinePanelImpl: React.FC<ImplProps> = ({
  isNFT,
  sourceChainId,
  targetChainId,
  sourceWallet,
  sourceTokens,
  sourceToken,
  transferAmountString,
  onSelectSourceChain,
  onSelectTargetChain,
  onSelectToken,
  onTransferAmountChanged,
  onSourceWalletModalChanged,
  onClose,
}) => {
  const [command, setCommand] = useState('');
  const [executionError, setExecutionError] = useState('');
  const [pendingTokenInfo, setPendingTokenInfo] = useState<{
    amount?: string;
    symbol?: string;
    tokenId?: string;
    contractAddress?: string;
  }>();
  const [tokenStartFetching, setTokenStartFetching] = useState<boolean>(false);
  const isModal = useMemo(() => {
    return window.matchMedia('(max-width: 1024px)').matches;
  }, []);
  const parsedCommand = useMemo(
    () => (isNFT ? parseNFTTransferCommand(command) : parseTokenTransferCommand(command)),
    [command, isNFT],
  );

  const inputRef = useRef<HTMLInputElement>(null);

  const clearState = useCallback(() => {
    setTokenStartFetching(false);
    setPendingTokenInfo(undefined);
  }, [setTokenStartFetching, setPendingTokenInfo]);

  const updateExecutionError = useCallback(
    (err: string) => {
      setExecutionError(err);

      if (err) {
        clearState();
      }
    },
    [clearState, setExecutionError],
  );

  const submitCommand = useCallback(() => {
    if (pendingTokenInfo) {
      return;
    }

    updateExecutionError('');
    setTokenStartFetching(false);

    const { error } = validateCommandFinshed(parsedCommand, isNFT);

    if (error) {
      updateExecutionError(error.message);
      return;
    }

    const { command, amount, symbol, tokenId, contractAddress } = parsedCommand;
    const sourceChainInfo = getSourceChainByCommand(parsedCommand);
    const targetChainInfo = getTargetChainByCommand(parsedCommand);

    if (command?.toLowerCase() === Command.Bridge) {
      // if current source chain is not equal to user's input, we need to switch chain and wait for sourceParsedTokenAccounts loaded
      if (sourceChainInfo) {
        if (sourceChainInfo.id !== sourceChainId) {
          onSelectSourceChain({ chainId: sourceChainInfo.id });
        } else {
          // if wallet is connected and no need to swtich network
          // we need to mark tokenStartFetching as true
          // then setTokenInfo will work
          if (!sourceWallet.error && sourceWallet.state === WalletState.CONNECTED && sourceWallet.wallet) {
            setTokenStartFetching(true);
          }
        }
      }

      if (targetChainInfo && targetChainInfo.id !== targetChainId) {
        onSelectTargetChain({ chainId: targetChainInfo.id });
      }

      setPendingTokenInfo({ amount, symbol, tokenId, contractAddress });
    }
  }, [
    isNFT,
    sourceWallet.state,
    sourceWallet.error,
    sourceWallet.wallet,
    sourceChainId,
    targetChainId,
    parsedCommand,
    pendingTokenInfo,
    updateExecutionError,
    setTokenStartFetching,
    onSelectSourceChain,
    onSelectTargetChain,
    setPendingTokenInfo,
  ]);

  const updateCommand = useCallback(
    (command: string) => {
      setCommand(command);

      if (executionError) {
        updateExecutionError('');
      }
    },
    [executionError, setCommand, updateExecutionError],
  );

  const finishProcess = useCallback(() => {
    updateCommand('');
    clearState();
    onClose();
  }, [updateCommand, clearState, onClose]);

  const setTokenInfo = useCallback(() => {
    const sourceChain = getSourceChainByCommand(parsedCommand);
    const token = sourceTokens.cachedTokens.data?.tokens.find((item) => {
      const symbolOrNameOrContractMatched =
        (pendingTokenInfo?.symbol && item.symbol?.toLowerCase() === pendingTokenInfo?.symbol?.toLowerCase()) ||
        (pendingTokenInfo?.symbol && item.name?.toLowerCase() === pendingTokenInfo?.symbol?.toLowerCase()) ||
        (pendingTokenInfo?.contractAddress &&
          item.tokenAddress.toLowerCase() === pendingTokenInfo?.contractAddress.toLowerCase());
      const tokenIdMatched =
        sourceChain && sourceChain.id !== CHAIN_ID_SOLANA
          ? pendingTokenInfo?.tokenId
            ? pendingTokenInfo.tokenId?.toLowerCase() === (item as NFTData).tokenId?.toLowerCase()
            : false
          : true;

      return isNFT ? symbolOrNameOrContractMatched && tokenIdMatched : symbolOrNameOrContractMatched;
    });

    console.log('tokens', pendingTokenInfo, token, sourceTokens.cachedTokens.data);

    if (token) {
      onSelectToken({ tokenAddress: token.tokenAddress, tokenId: token.tokenId });
    } else {
      updateExecutionError(
        `You don't have ${
          isNFT
            ? `${parsedCommand.symbol || parsedCommand.contractAddress}${
                parsedCommand.tokenId ? `#${parsedCommand.tokenId}` : ''
              }`
            : `${parsedCommand.symbol || parsedCommand.contractAddress}`
        } `,
      );
      return;
    }

    setRecentlyUsedCommand(command, isNFT);

    if (sourceChain) {
      setRecentlyUsedSourceChain(sourceChain.id);
    }

    const targetChain = getTargetChainByCommand(parsedCommand);

    if (targetChain) {
      setRecentlyUsedTargetChain(targetChain.id);
    }

    if (parsedCommand.symbol || parsedCommand.tokenId || parsedCommand.contractAddress) {
      setRecentlyUsedToken(
        {
          symbol: parsedCommand.symbol,
          contractAddress: parsedCommand.contractAddress,
          tokenId: parsedCommand.tokenId,
        },
        isNFT,
      );
    }

    // nft page don't have amount setting process, so we finish process when token is set.
    if (isNFT) {
      finishProcess();
    }
  }, [
    isNFT,
    parsedCommand,
    sourceTokens.cachedTokens.data,
    pendingTokenInfo,
    onSelectToken,
    onTransferAmountChanged,
    updateExecutionError,
    updateCommand,
    clearState,
    finishProcess,
  ]);

  useEffect(() => {
    // this hook is only for token bridge
    // when the sourceToken is set and transferAmountString is reset to empty, will start setTransferAmount
    if (!isNFT) {
      const tokenMatched =
        (pendingTokenInfo?.symbol && sourceToken?.symbol?.toLowerCase() === pendingTokenInfo?.symbol?.toLowerCase()) ||
        (pendingTokenInfo?.symbol && sourceToken?.name?.toLowerCase() === pendingTokenInfo?.symbol?.toLowerCase()) ||
        (pendingTokenInfo?.contractAddress &&
          sourceToken?.tokenAddress.toLowerCase() === pendingTokenInfo?.contractAddress.toLowerCase());

      if (
        tokenMatched &&
        pendingTokenInfo.amount &&
        transferAmountString !== pendingTokenInfo.amount &&
        onTransferAmountChanged
      ) {
        onTransferAmountChanged(pendingTokenInfo.amount);
      } else if (pendingTokenInfo && tokenMatched && transferAmountString === pendingTokenInfo.amount) {
        finishProcess();
      }
    }
  }, [isNFT, pendingTokenInfo, sourceToken, transferAmountString, onTransferAmountChanged, finishProcess]);

  useEffect(() => {
    if (pendingTokenInfo) {
      // if wallet is not connected, we need to connect wallet and wait for the sourceParsedTokenAccounts loaded then continue to next step
      if (
        sourceWallet.state === WalletState.DISCONNECTED ||
        (sourceWallet.state === WalletState.CONNECTED && !sourceWallet.wallet)
      ) {
        onSourceWalletModalChanged(true);
      }
    }
  }, [pendingTokenInfo, sourceWallet.state, sourceWallet.wallet, onSourceWalletModalChanged]);

  useEffect(() => {
    // when the token selector start to load token data
    // we need to mark tokenStartFetching as true
    // then the next effect will start watching

    const tokenInfoApiFetching = isCarrierEVMChain(sourceChainId) ? sourceTokens.remoteTokens.loading : false;

    if (pendingTokenInfo && (sourceTokens.cachedTokens.loading || tokenInfoApiFetching)) {
      setTokenStartFetching(true);
    }
  }, [sourceChainId, pendingTokenInfo, sourceTokens.remoteTokens.loading, sourceTokens.cachedTokens.loading]);

  useEffect(() => {
    const tokenInfoApiFetching = isCarrierEVMChain(sourceChainId) ? sourceTokens.remoteTokens.loading : false;
    const tokenInfoApiError = isCarrierEVMChain(sourceChainId) ? sourceTokens.remoteTokens.error : undefined;

    if (
      pendingTokenInfo &&
      !sourceWallet.error &&
      sourceWallet.wallet &&
      sourceWallet.state === WalletState.CONNECTED &&
      tokenStartFetching &&
      !sourceTokens.cachedTokens.loading &&
      !tokenInfoApiFetching
    ) {
      if (!sourceTokens.cachedTokens.error && !tokenInfoApiError) {
        setTokenInfo();
      } else {
        updateExecutionError(
          sourceTokens.cachedTokens.error?.message || tokenInfoApiError?.message || 'Unexpected error happens',
        );
        return;
      }
    }
  }, [
    pendingTokenInfo,
    sourceWallet.error,
    sourceWallet.wallet,
    sourceWallet.state,
    tokenStartFetching,
    sourceTokens.cachedTokens,
    sourceTokens.remoteTokens,
    setTokenInfo,
    updateExecutionError,
  ]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function renderPanel() {
    const processing = pendingTokenInfo != null;
    const { actions, error } = getActions({
      command,
      parsedCommand,
      executionError,
      isNFT,
      processing,
      sourceChainId,
      cachedTokens: sourceTokens.cachedTokens,
      wallet: sourceWallet,
      onChange: (command) => {
        updateCommand(command);
        inputRef.current?.focus();
      },
      onFinish: () => {
        submitCommand();
        inputRef.current?.focus();
      },
    });

    return (
      <div className={styleCommandLineContainer}>
        <div className={styleCommandLineInputContainer}>
          <img src={MagnifierIcon} className={styleCommandLineIcon} />
          <input
            ref={inputRef}
            value={command}
            placeholder={
              isNFT ? 'Try “Bridge from Ethereum to Solana, MyNFT#1”' : 'Try “Bridge from Ethereum to Solana, 10 ETH”'
            }
            className={cx(styleCommandLineInput, error ? styleInputError : undefined)}
            onChange={(e) => {
              updateCommand(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                submitCommand();
              }
            }}
          />
          {processing || command ? (
            <div className={styleIconWrapper}>
              {processing ? (
                <Spinner />
              ) : (
                <SVGIcon
                  className={styleCloseIcon}
                  iconName="close"
                  onClick={() => {
                    updateCommand('');
                  }}
                />
              )}
            </div>
          ) : null}
        </div>
        <CommandLinePanelDropdown actions={actions} />
      </div>
    );
  }

  return (
    <>
      {!isModal ? renderPanel() : null}
      {isModal ? (
        <Modal
          maskClosable={true}
          title="Command line"
          open
          onCancel={() => {
            close();
          }}>
          {renderPanel()}
        </Modal>
      ) : null}
    </>
  );
};

interface Props extends Omit<ImplProps, 'onClose'> {
  visible: boolean;
  onVisibleChanged: (visible: boolean) => void;
}

export const CommandLinePanel: React.FC<Props> = ({ visible, onVisibleChanged, ...restProps }) => {
  const close = useCallback(() => {
    onVisibleChanged(false);
  }, [onVisibleChanged]);

  const open = useCallback(() => {
    onVisibleChanged(true);
  }, [onVisibleChanged]);

  useEffect(() => {
    function keyHandler(e: KeyboardEvent) {
      if (e.code === 'Slash') {
        open();
      } else if (e.code === 'Escape') {
        close();
      }
    }

    document.addEventListener('keyup', keyHandler);

    return () => {
      document.removeEventListener('keyup', keyHandler);
    };
  }, [open, close]);

  return visible ? <CommandLinePanelImpl {...restProps} onClose={close} /> : null;
};

const styleCommandLineContainer = css`
  flex-grow: 1;
  max-height: 80vw;
  margin-right: ${pxToPcVw(24)};
  margin-top: ${pxToPcVw(60)};

  @media (max-width: 1024px) {
    max-height: none;
    margin-right: 0;
    margin-top: 0;
    padding: ${pxToMobileVw(16)};
  }
`;

const styleCommandLineInputContainer = css`
  position: relative;
  z-index: 1;
`;

const styleCommandLineIcon = css`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  left: ${pxToPcVw(18)};
  width: ${pxToPcVw(20)};
  height: ${pxToPcVw(20)};

  @media (max-width: 1024px) {
    left: ${pxToMobileVw(18)};
    width: ${pxToMobileVw(20)};
    height: ${pxToMobileVw(20)};
  }
`;

const styleCommandLineInput = css`
  width: 100%;
  background: transparent;
  font-weight: 500;
  font-size: 16px;
  transition: all 0.3s;
  border: solid ${pxToPcVw(2)} var(--color-border);
  border-radius: ${pxToPcVw(8)};
  min-height: ${pxToPcVw(56)};
  padding: 0 ${pxToPcVw(14 + 21 * 2)} 0 ${pxToPcVw(20 + 18 * 2)};

  /* Chrome, Firefox, Opera, Safari 10.1+ */
  ::placeholder {
    color: var(--color-text-3);
    opacity: 1; /* Firefox */
  }

  &:focus {
    outline: none;
    border: solid ${pxToPcVw(2)} var(--ant-primary-4);
  }

  @media (max-width: 1024px) {
    border: solid ${pxToMobileVw(2)} var(--color-border);
    border-radius: ${pxToMobileVw(8)};
    height: ${pxToMobileVw(56)};
    padding: 0 ${pxToMobileVw(14 + 21 * 2)} 0 ${pxToMobileVw(20 + 18 * 2)};

    &:focus {
      border: solid ${pxToMobileVw(2)} var(--ant-primary-4);
    }
  }
`;

const styleInputError = css`
  border-color: var(--status-failed);
  background-color: var(--status-bg-failed);

  &:focus {
    border-color: var(--status-failed);
  }
`;

const styleCloseIcon = css`
  cursor: pointer;
  width: ${pxToPcVw(14)};
  height: ${pxToPcVw(14)};

  & > * {
    fill: #fff;
  }

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(14)};
    height: ${pxToMobileVw(14)};
  }
`;

const styleIconWrapper = css`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  right: ${pxToPcVw(21)};
  display: flex;

  @media (max-width: 1024px) {
    right: ${pxToMobileVw(21)};
  }
`;
