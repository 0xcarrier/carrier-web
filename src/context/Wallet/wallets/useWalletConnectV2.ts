import { useCallback, useMemo, useState } from 'react';

import { TransactionRequest } from '@ethersproject/abstract-provider';
import { Signer } from '@ethersproject/abstract-signer';
import { BigNumber } from '@ethersproject/bignumber';
import { Deferrable } from '@ethersproject/properties';
import { Web3Provider } from '@ethersproject/providers';
import WalletConnectEthProvider from '@walletconnect/ethereum-provider';

import SVGWalletConnectLogo from '../../../assets/svgs/wallet-logos/walletconnect.svg';
import {
  CHAINS,
  CLUSTER,
  CarrierChainId,
  RPC_URLS,
  evmChainToWormholeChain,
  wormholeChainToEvmChain,
} from '../../../utils/consts';
import {
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

const PROJECT_ID = process.env.WALLET_CONNECT_PROJECT_ID;
const WALLET_NAME = 'WalletConnect V2';

export function useWalletConnectV2(): WalletInterface {
  // WalletConnect provider
  const [clientProvider, setClientProvider] = useState<WalletConnectEthProvider | undefined>();
  // Ethers Web3 provider
  const [web3Provider, setWeb3Provider] = useState<Web3Provider | undefined>();

  const [state, setState] = useState<WalletState>(WalletState.DISCONNECTED);
  const [networkError, setNetworkError] = useState<Error>();
  const [accountError, setAccountError] = useState<Error>();
  const [generalError, setGeneralError] = useState<Error>();

  const [chainId, setChainId] = useState<CarrierChainId | undefined>();
  const [evmChainId, setEvmChainId] = useState<number>();

  const [signer, setSigner] = useState<Signer | undefined>();
  const [walletAddress, setWalletAddress] = useState<string | undefined>();

  const availableChainIds = useMemo(() => {
    return CHAINS.filter((chain) => isCarrierEVMChain(chain.id)).map((item) => item.id);
  }, []);

  const customProperties = useMemo(() => {
    return { signer, web3Provider, evmChainId };
  }, [signer, web3Provider, evmChainId]);

  const disconnect = useCallback(async () => {
    if (!clientProvider) {
      return setGeneralError(new Error("WalletConnect client's provider is not initialized yet."));
    }
    setState(WalletState.DISCONNECTING);

    clientProvider.disconnect();

    setChainId(undefined);
    setSigner(undefined);
    setWalletAddress(undefined);
    setClientProvider(undefined);
    setWeb3Provider(undefined);
    setGeneralError(undefined);
    setAccountError(undefined);
    setNetworkError(undefined);

    setState(WalletState.DISCONNECTED);
  }, [clientProvider]);

  const connect: WalletInterface['connect'] = useCallback(
    async (options) => {
      const { chainId: expectedChainId, silence } = options;

      if (!PROJECT_ID) {
        return setGeneralError(new Error('Connection failed: WalletConnect Project ID cannot be found.'));
      }

      if (state === WalletState.CONNECTED && web3Provider) {
        if ((chainId !== expectedChainId || networkError === errorChainNotSupported) && !silence) {
          switchEvmChain({ provider: web3Provider, evmChainId: wormholeChainToEvmChain[expectedChainId] });
        }
      } else {
        setGeneralError(undefined);
        setNetworkError(undefined);
        setAccountError(undefined);
        setState(WalletState.CONNECTING);

        try {
          const evmChains = availableChainIds
            .sort((a, b) => (a === expectedChainId ? -1 : b === expectedChainId ? 1 : 0))
            .map((wormholeChainId) => wormholeChainToEvmChain[wormholeChainId])
            .filter((item) => item != null);
          const rpcMapByEVMChain = evmChains.reduce(
            (map, chainId) => ({ ...map, [chainId]: RPC_URLS[CLUSTER][evmChainToWormholeChain[chainId]] }),
            {},
          );

          const clientProvider = await WalletConnectEthProvider.init({
            projectId: PROJECT_ID,
            chains: evmChains,
            rpcMap: rpcMapByEVMChain,
            events: ['chainChanged', 'accountsChanged', 'session_delete', 'session_event'],
            showQrModal: true,
          });

          clientProvider.on('session_delete', (e) => {
            console.log('session_delete', e);

            disconnect();
          });

          clientProvider.on('session_event', (e) => {
            console.log('session_event', e);
          });

          setClientProvider(clientProvider);

          const web3Provider = new Web3Provider(clientProvider, 'any');
          if (!web3Provider) {
            setGeneralError(errorWalletNotExisted);
            throw errorWalletNotExisted;
          }
          setWeb3Provider(web3Provider);

          await clientProvider.enable();

          if (!silence) {
            try {
              await web3Provider.send('eth_requestAccounts', []);
            } catch (e) {
              setGeneralError(errorRequestingAccount);

              throw e;
            }

            if (chainId !== expectedChainId) {
              await switchEvmChain({ provider: web3Provider, evmChainId: wormholeChainToEvmChain[expectedChainId] });
            }
          }

          const accounts = await web3Provider.listAccounts();

          if (accounts && accounts.length) {
            const signer = web3Provider.getSigner();

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
            const network = await web3Provider.getNetwork();
            const evmChainId = BigNumber.from(network.chainId).toNumber();
            const wormholeChainId = evmChainToWormholeChain[evmChainId];

            console.log('getNetwork', evmChainId);

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

          if (clientProvider) {
            clientProvider.on('chainChanged', (chainId: any) => {
              const evmChainId = BigNumber.from(chainId).toNumber();
              const wormholeChainId = evmChainToWormholeChain[evmChainId];

              setEvmChainId(evmChainId);

              if (wormholeChainId) {
                setChainId(wormholeChainId);
                setNetworkError(undefined);
              } else {
                setNetworkError(errorChainNotSupported);
              }
            });

            clientProvider.on('accountsChanged', (accounts: string[]) => {
              if (accounts && accounts.length) {
                const signer = web3Provider.getSigner();

                setSigner(signer);

                signer
                  .getAddress()
                  .then((address) => {
                    setWalletAddress(address);
                  })
                  .catch(() => {
                    setAccountError(errorGettingWalletAddress);
                  });
              } else {
                disconnect();
              }
            });
          }
        } catch (e: any) {
          // disconnect and clear state when error happens
          await disconnect();
          throw e;
        }
      }
    },
    [availableChainIds, chainId, disconnect, networkError, state, web3Provider],
  );

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

  const redeemTokenByMRL = useCallback(
    async (params: RedeemData) => {
      if (signer && chainId) {
        return redeemEthTokenByMRL({ signer, chainId, ...params });
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

  return useMemo(
    () => ({
      walletName: WALLET_NAME,
      state,
      error: generalError || accountError || networkError,
      isInstalled: () => Promise.resolve(true),
      install: () => Promise.resolve(),
      icon: SVGWalletConnectLogo,
      availableChainIds,
      chainId,
      walletAddress,
      connect,
      disconnect,
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
      approveNFT,
      getNFTApproved,
    }),
    [
      accountError,
      approveToken,
      attestToken,
      availableChainIds,
      chainId,
      connect,
      customProperties,
      disconnect,
      generalError,
      getTokenAllowance,
      networkError,
      redeemNFT,
      redeemNative,
      redeemToken,
      redeemUSDC,
      redeemTBTC,
      redeemTokenByMRL,
      registerToken,
      sendTransaction,
      signTransaction,
      state,
      transferNFT,
      transferNative,
      transferToken,
      transferUSDC,
      transferTBTC,
      transferNativeByMRL,
      transferTokenByMRL,
      walletAddress,
      approveNFT,
      getNFTApproved,
    ],
  );
}
