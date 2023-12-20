import { useCallback, useMemo, useState } from 'react';

import { BigNumber, ethers } from 'ethers';
import { Deferrable } from 'ethers/lib/utils';

import onekeyIcon from '../../../assets/svgs/wallet-logos/onekey.svg';
import { CHAINS, CarrierChainId, evmChainToWormholeChain, wormholeChainToEvmChain } from '../../../utils/consts';
import {
  TransactionRequest,
  approveEthNFT,
  approveEthToken,
  attestEth,
  errorChainNotSupported,
  errorGettingNetwork,
  errorGettingWalletAddress,
  errorRequestingAccount,
  errorWalletNotExisted,
  getEthNFTApproved,
  getEthTokenAllowance,
  redeemEthNFT,
  redeemEthNative,
  redeemEthTBTC,
  redeemEthToken,
  redeemEthTokenByMRL,
  redeemEthUSDC,
  registerEth,
  sendEthTransaction,
  signEthTransaction,
  switchEvmChain,
  transferEthNFT,
  transferEthNative,
  transferEthNativeByMRL,
  transferEthTBTC,
  transferEthToken,
  transferEthTokenByMRL,
  transferEthUSDC,
} from '../helpers/ethereum';
import {
  ApproveNFTData,
  ApproveTokenData,
  AttestData,
  GetAllowanceData,
  GetNFTApprovedData,
  RedeemData,
  RedeemTBTCData,
  RedeemUSDCData,
  RegisterData,
  TransferNFTData,
  TransferNativeByMRLData,
  TransferNativeData,
  TransferTBTCData,
  TransferTokenByMRLData,
  TransferTokenData,
  TransferUSDCData,
  WalletInterface,
  WalletState,
} from '../types';
import { isCarrierEVMChain } from '../../../utils/web3Utils';

const walletName = 'OneKey';

function detectOneKeyProvider() {
  if (typeof window === 'undefined' || !window.$onekey?.ethereum?.isOneKey) {
    return null;
  }

  return window.$onekey.ethereum;
}

export function useOneKey(): WalletInterface {
  const [state, setState] = useState(WalletState.DISCONNECTED);
  const [networkError, setNetworkError] = useState<Error>();
  const [accountError, setAccountError] = useState<Error>();
  const [generalError, setGeneralError] = useState<Error>();
  const [evmChainId, setEvmChainId] = useState<number>();
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | undefined>(undefined);
  const [chainId, setChainId] = useState<CarrierChainId | undefined>(undefined);
  const [signer, setSigner] = useState<ethers.Signer | undefined>(undefined);
  const [walletAddress, setWalletAddress] = useState<string | undefined>(undefined);
  const [ethereumProvider, setEthereumProvider] = useState<any>(undefined);

  const isInstalled = useCallback(async () => {
    // prettier-ignore
    const detectedProvider = detectOneKeyProvider();

    return detectedProvider != null;
  }, []);

  const install = useCallback(async () => {
    window.open('https://onekey.so/download');

    return Promise.resolve();
  }, []);

  const availableChainIds = useMemo(() => {
    return CHAINS.filter((chain) => isCarrierEVMChain(chain.id)).map((item) => item.id);
  }, []);

  const customProperties = useMemo(() => {
    return { signer, provider, evmChainId };
  }, [signer, provider, evmChainId]);

  const sendTransaction = useCallback(
    async (tx: Deferrable<TransactionRequest>) => {
      if (signer) {
        return sendEthTransaction({ signer, tx });
      }
    },
    [signer],
  );
  const signTransaction = useCallback(
    async (tx: Deferrable<TransactionRequest>) => {
      if (signer) {
        return signEthTransaction({ signer, tx });
      }
    },
    [signer],
  );

  const transferNative = useCallback(
    async (params: TransferNativeData) => {
      if (signer && chainId) {
        return transferEthNative({ signer, chainId, ...params });
      }
    },
    [signer, chainId],
  );

  const transferToken = useCallback(
    async (params: TransferTokenData) => {
      if (signer && chainId) {
        return transferEthToken({ signer, chainId, ...params });
      }
    },
    [signer, chainId],
  );

  const transferNFT = useCallback(
    async (params: TransferNFTData) => {
      const { tokenId, ...restParams } = params;

      if (signer && chainId) {
        if (tokenId) {
          return transferEthNFT({ signer, chainId, tokenId, ...restParams });
        } else {
          throw new Error('nft must have token id');
        }
      }
    },
    [signer, chainId],
  );

  const transferUSDC = useCallback(
    async (params: TransferUSDCData) => {
      if (signer && chainId) {
        return transferEthUSDC({ signer, chainId, ...params });
      }
    },
    [signer, chainId],
  );

  const transferTBTC = useCallback(
    async (params: TransferTBTCData) => {
      if (signer && chainId) {
        return transferEthTBTC({ signer, chainId, ...params });
      }
    },
    [signer, chainId],
  );

  const transferNativeByMRL = useCallback(
    async (params: TransferNativeByMRLData) => {
      if (signer && chainId) {
        return transferEthNativeByMRL({ signer, chainId, ...params });
      }
    },
    [signer, chainId],
  );

  const transferTokenByMRL = useCallback(
    async (params: TransferTokenByMRLData) => {
      if (signer && chainId) {
        return transferEthTokenByMRL({ signer, chainId, ...params });
      }
    },
    [signer, chainId],
  );

  const redeemNative = useCallback(
    async (params: RedeemData) => {
      if (signer && chainId) {
        return redeemEthNative({ signer, chainId, ...params });
      }
    },
    [signer, chainId],
  );

  const redeemToken = useCallback(
    async (params: RedeemData) => {
      if (signer && chainId) {
        return redeemEthToken({ signer, chainId, ...params });
      }
    },
    [signer, chainId],
  );

  const redeemNFT = useCallback(
    async (params: RedeemData) => {
      if (signer && chainId) {
        return redeemEthNFT({ signer, chainId, ...params });
      }
    },
    [signer, chainId],
  );

  const redeemUSDC = useCallback(
    async (params: RedeemUSDCData) => {
      if (signer && chainId) {
        return redeemEthUSDC({ signer, chainId, ...params });
      }
    },
    [signer, chainId],
  );

  const redeemTBTC = useCallback(
    async (params: RedeemTBTCData) => {
      if (signer && chainId) {
        return redeemEthTBTC({ signer, chainId, ...params });
      }
    },
    [signer, chainId],
  );

  const redeemTokenByMRL = useCallback(
    async (params: RedeemData) => {
      if (signer && chainId) {
        return redeemEthTokenByMRL({ signer, chainId, ...params });
      }
    },
    [signer, chainId],
  );

  const attestToken = useCallback(
    async (params: AttestData) => {
      if (signer && chainId) {
        return attestEth({ signer, chainId, ...params });
      }
    },
    [signer, chainId],
  );

  const registerToken = useCallback(
    async (params: RegisterData) => {
      if (signer && chainId) {
        return registerEth({ signer, chainId, ...params });
      }
    },
    [signer, chainId],
  );

  const approveToken = useCallback(
    async (params: ApproveTokenData) => {
      if (signer && chainId) {
        return approveEthToken({ signer, chainId, ...params });
      }
    },
    [signer, chainId],
  );

  const getTokenAllowance = useCallback(
    async (params: GetAllowanceData) => {
      if (chainId && walletAddress) {
        return getEthTokenAllowance({ chainId, walletAddress, ...params });
      }
    },
    [chainId, walletAddress],
  );

  const approveNFT = useCallback(
    async (params: ApproveNFTData) => {
      if (signer) {
        return approveEthNFT({ signer, ...params });
      }
    },
    [signer],
  );

  const getNFTApproved = useCallback(
    async (params: GetNFTApprovedData) => {
      const { tokenId, ...restParams } = params;

      if (chainId && tokenId) {
        return getEthNFTApproved({ chainId, tokenId, ...restParams });
      }
    },
    [chainId],
  );

  const disconnect = useCallback(() => {
    setState(WalletState.DISCONNECTING);

    setGeneralError(undefined);
    setAccountError(undefined);
    setNetworkError(undefined);
    setProvider(undefined);
    setChainId(undefined);
    setSigner(undefined);
    setWalletAddress(undefined);

    if (ethereumProvider?.removeAllListeners) {
      ethereumProvider.removeAllListeners();
    }

    setEthereumProvider(undefined);

    setState(WalletState.DISCONNECTED);

    return Promise.resolve();
  }, [
    ethereumProvider,
    setState,
    setGeneralError,
    setAccountError,
    setNetworkError,
    setProvider,
    setChainId,
    setSigner,
    setWalletAddress,
    setEthereumProvider,
  ]);

  const connect = useCallback(
    async (options: { chainId: CarrierChainId; silence?: boolean }) => {
      const { chainId: expectedChainId, silence } = options;

      if (state === WalletState.CONNECTED && provider) {
        if ((chainId !== expectedChainId || networkError === errorChainNotSupported) && !silence) {
          switchEvmChain({ provider, evmChainId: wormholeChainToEvmChain[expectedChainId] });
        }
      } else {
        setState(WalletState.CONNECTING);

        try {
          setGeneralError(undefined);
          setNetworkError(undefined);
          setAccountError(undefined);

          const detectedProvider = detectOneKeyProvider();
          if (!detectedProvider) {
            setGeneralError(errorWalletNotExisted);
            throw errorWalletNotExisted;
          }

          const web3Provider = detectedProvider;
          const provider = web3Provider
            ? new ethers.providers.Web3Provider(
                // @ts-ignore
                web3Provider,
                'any',
              )
            : undefined;

          if (!provider) {
            setGeneralError(errorWalletNotExisted);

            throw errorWalletNotExisted;
          }

          setEthereumProvider(web3Provider);
          setProvider(provider);

          if (!silence) {
            try {
              await provider.send('eth_requestAccounts', []);
            } catch (e) {
              setGeneralError(errorRequestingAccount);

              throw e;
            }

            if (chainId !== expectedChainId) {
              await switchEvmChain({ provider, evmChainId: wormholeChainToEvmChain[expectedChainId] });
            }
          }

          const accounts = await provider.listAccounts();

          if (accounts && accounts.length) {
            const signer = provider.getSigner();

            setSigner(signer);

            try {
              const walletAddress = await signer.getAddress();

              setWalletAddress(walletAddress);
            } catch (e) {
              setAccountError(errorGettingWalletAddress);

              throw e;
            }

            setState(WalletState.CONNECTED);
          } else {
            await disconnect();
          }

          try {
            const network = await provider.getNetwork();
            const evmChainId = BigNumber.from(network.chainId).toNumber();
            const wormholeChainId = evmChainToWormholeChain[evmChainId];

            console.log('getNetwork', evmChainId, wormholeChainId, expectedChainId);

            // if the user is using unsupport network, then we use expectedChainId
            // because wormholeChainId will be undefined
            // and set network error to errorChainNotSupported
            // useWallet hook will handle this error and let user connect to correct network
            setChainId(wormholeChainId || expectedChainId);
            setEvmChainId(evmChainId);

            if (wormholeChainId) {
              setNetworkError(undefined);
            } else {
              setNetworkError(errorChainNotSupported);
            }
          } catch (e) {
            setNetworkError(errorGettingNetwork);

            throw e;
          }

          if (web3Provider) {
            web3Provider.on('chainChanged', (chainId: number) => {
              const evmChainId = BigNumber.from(chainId).toNumber();
              const wormholeChainId = evmChainToWormholeChain[evmChainId];

              console.log('chainChanged', evmChainId, wormholeChainId);

              setEvmChainId(evmChainId);

              if (wormholeChainId) {
                setChainId(wormholeChainId);
                setNetworkError(undefined);
              } else {
                setNetworkError(errorChainNotSupported);
              }
            });

            web3Provider.on('accountsChanged', (accounts: string[]) => {
              if (accounts && accounts.length) {
                const signer = provider.getSigner();

                setSigner(signer);

                signer
                  .getAddress()
                  .then((address) => {
                    setWalletAddress(address);
                  })
                  .catch((e) => {
                    console.error(e);

                    setAccountError(errorGettingWalletAddress);
                  });
              } else {
                disconnect();
              }
            });
          }
        } catch (e) {
          // disconnect and clear state when error happens
          await disconnect();
          throw e;
        }
      }
    },
    [
      state,
      provider,
      chainId,
      networkError,
      disconnect,
      setGeneralError,
      setAccountError,
      setNetworkError,
      setEthereumProvider,
      setProvider,
      setChainId,
      setSigner,
      setWalletAddress,
    ],
  );

  return useMemo(() => {
    return {
      walletName,
      error: generalError || accountError || networkError,
      isInstalled,
      install,
      icon: onekeyIcon,
      availableChainIds,
      state,
      connect,
      disconnect,
      chainId,
      walletAddress,
      customProperties,
      sendTransaction,
      signTransaction,
      transferNative,
      transferToken,
      transferNFT,
      transferUSDC,
      transferTBTC,
      transferNativeByMRL,
      transferTokenByMRL,
      redeemNative,
      redeemToken,
      redeemNFT,
      redeemUSDC,
      redeemTBTC,
      redeemTokenByMRL,
      attestToken,
      registerToken,
      approveToken,
      getTokenAllowance,
      getNFTApproved,
      approveNFT,
    };
  }, [
    accountError,
    networkError,
    generalError,
    isInstalled,
    install,
    availableChainIds,
    state,
    connect,
    disconnect,
    chainId,
    walletAddress,
    customProperties,
    sendTransaction,
    signTransaction,
    transferNative,
    transferToken,
    transferNFT,
    transferUSDC,
    transferTBTC,
    transferNativeByMRL,
    transferTokenByMRL,
    redeemNative,
    redeemToken,
    redeemNFT,
    redeemUSDC,
    redeemTBTC,
    redeemTokenByMRL,
    attestToken,
    registerToken,
    approveToken,
    getTokenAllowance,
    getNFTApproved,
    approveNFT,
  ]);
}
