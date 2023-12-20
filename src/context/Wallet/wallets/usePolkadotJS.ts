import { useCallback, useMemo, useState } from 'react';
import {
  ApproveNFTData,
  ApproveTokenData,
  AttestData,
  GetAllowanceData,
  GetNFTApprovedData,
  RedeemData,
  RedeemUSDCData,
  RedeemTBTCData,
  RegisterData,
  TransferNFTData,
  TransferNativeData,
  TransferTokenData,
  TransferUSDCData,
  TransferTBTCData,
  WalletInterface,
  WalletState,
  TransferNativeByMRLData,
  TransferTokenByMRLData,
} from '../types';
import polkadotJsIcon from '../../../assets/svgs/wallet-logos/polkadot-js.svg';
import { CHAINS, CarrierChainId } from '../../../utils/consts';
import { errorGettingWalletAddress, errorWalletNotExisted } from '../helpers/ethereum';
import { isCarrierPolkaChain } from '../../../utils/web3Utils';
import { web3AccountsSubscribe, web3Enable } from '@polkadot/extension-dapp';
import { InjectedExtension, Unsubcall } from '@polkadot/extension-inject/types';
import { Signer, SignerPayloadJSON } from '@polkadot/types/types/extrinsic';
import {
  getAccounts,
  sendPolkadotTransaction,
  signPolkadotTransaction,
  transferPolkadotNativeByMRL,
  transferPolkadotTokenByMRL,
} from '../helpers/polkadot';

const walletName = 'PolkadotJS';

export function usePolkadotJS(): WalletInterface {
  const [state, setState] = useState(WalletState.DISCONNECTED);
  const [networkError, setNetworkError] = useState<Error>();
  const [accountError, setAccountError] = useState<Error>();
  const [generalError, setGeneralError] = useState<Error>();
  const [injected, setInjected] = useState<InjectedExtension | undefined>(undefined);
  const [chainId, setChainId] = useState<CarrierChainId | undefined>(undefined);
  const [signer, setSigner] = useState<Signer | undefined>(undefined);
  const [walletAddress, setWalletAddress] = useState<string | undefined>(undefined);
  const [accountSub, setAccountSub] = useState<Unsubcall | undefined>();
  const isInstalled = useCallback(async () => {
    const allInjected = await web3Enable('Carrier');

    return allInjected.findIndex((item) => item.name === 'polkadot-js') !== -1;
  }, []);

  const install = useCallback(async () => {
    window.open('https://polkadot.js.org/extension/');

    return Promise.resolve();
  }, []);

  const availableChainIds = useMemo(() => {
    return CHAINS.filter((chain) => isCarrierPolkaChain(chain.id)).map((item) => item.id);
  }, []);

  const customProperties = useMemo(() => {
    return { signer, injected };
  }, [signer, injected]);

  const sendTransaction = useCallback(
    async (payload: SignerPayloadJSON) => {
      if (chainId && signer) {
        return sendPolkadotTransaction({ chainId, signer, payload });
      }
    },
    [chainId, signer],
  );

  const signTransaction = useCallback(
    async (payload: SignerPayloadJSON) => {
      if (chainId && signer) {
        return signPolkadotTransaction({ chainId, signer, payload });
      }
    },
    [chainId, signer],
  );

  const transferNative = useCallback(
    async (params: TransferNativeData) => {
      throw new Error('transfer native is not supported on parachain');
    },
    [signer, chainId],
  );

  const transferToken = useCallback(
    async (params: TransferTokenData) => {
      throw new Error('transfer token is not supported on parachain');
    },
    [signer, chainId],
  );

  const transferNFT = useCallback(
    async (params: TransferNFTData) => {
      throw new Error('transfer NFT is not supported on parachain');
    },
    [signer, chainId],
  );

  const transferUSDC = useCallback(
    async (params: TransferUSDCData) => {
      throw new Error('transfer USDC by CCTP is not supported on parachain');
    },
    [signer, chainId],
  );

  const transferTBTC = useCallback(
    async (params: TransferTBTCData) => {
      throw new Error('transfer tBTC is not supported on parachain');
    },
    [signer, chainId],
  );

  const transferNativeByMRL = useCallback(
    async (params: TransferNativeByMRLData) => {
      if (signer && walletAddress && chainId) {
        return transferPolkadotNativeByMRL({ signer, walletAddress, chainId, ...params });
      }
    },
    [signer, walletAddress, chainId],
  );

  const transferTokenByMRL = useCallback(
    async (params: TransferTokenByMRLData) => {
      if (signer && walletAddress && chainId) {
        return transferPolkadotTokenByMRL({ signer, walletAddress, chainId, ...params });
      }
    },
    [signer, walletAddress, chainId],
  );

  const redeemNative = useCallback(
    async (params: RedeemData) => {
      throw new Error('redeem native is not supported on parachain');
    },
    [signer, chainId],
  );

  const redeemToken = useCallback(
    async (params: RedeemData) => {
      throw new Error('redeem token is not supported on parachain');
    },
    [signer, chainId],
  );

  const redeemNFT = useCallback(
    async (params: RedeemData) => {
      throw new Error('redeem NFT is not supported on parachain');
    },
    [signer, chainId],
  );

  const redeemUSDC = useCallback(
    async (params: RedeemUSDCData) => {
      throw new Error('redeem USDC by CCTP is not supported on parachain');
    },
    [signer, chainId],
  );

  const redeemTBTC = useCallback(
    async (params: RedeemTBTCData) => {
      throw new Error('redeem tBTC is not supported on parachain');
    },
    [signer, chainId],
  );

  const redeemTokenByMRL = useCallback(
    async (params: RedeemData) => {
      throw new Error('redeem token by MRL is not supported on parachain');
    },
    [signer, chainId],
  );

  const attestToken = useCallback(
    async (params: AttestData) => {
      throw new Error('attest token is not supported on parachain');
    },
    [signer, chainId],
  );

  const registerToken = useCallback(
    async (params: RegisterData) => {
      throw new Error('register token is not supported on parachain');
    },
    [signer, chainId],
  );

  const approveToken = useCallback(
    async (params: ApproveTokenData) => {
      throw new Error('approve token is not supported on parachain');
    },
    [signer, chainId],
  );

  const getTokenAllowance = useCallback(
    async (params: GetAllowanceData) => {
      throw new Error('get token allowance is not supported on parachain');
    },
    [chainId, walletAddress],
  );

  const approveNFT = useCallback(
    async (params: ApproveNFTData) => {
      throw new Error('approve NFT is not supported on parachain');
    },
    [signer],
  );

  const getNFTApproved = useCallback(
    async (params: GetNFTApprovedData) => {
      throw new Error('get NFT approved is not supported on parachain');
    },
    [chainId],
  );

  const disconnect = useCallback(() => {
    setState(WalletState.DISCONNECTING);

    if (accountSub) {
      accountSub();
    }

    setGeneralError(undefined);
    setAccountError(undefined);
    setNetworkError(undefined);
    setInjected(undefined);
    setChainId(undefined);
    setSigner(undefined);
    setWalletAddress(undefined);

    setState(WalletState.DISCONNECTED);

    return Promise.resolve();
  }, [
    accountSub,
    setState,
    setGeneralError,
    setAccountError,
    setNetworkError,
    setInjected,
    setChainId,
    setSigner,
    setWalletAddress,
  ]);

  const connect = useCallback(
    async (options: { chainId: CarrierChainId; silence?: boolean; selectedAccount?: string }) => {
      const { chainId, silence, selectedAccount } = options;

      setState(WalletState.CONNECTING);

      try {
        // We need to reset wallet address because wallet addresses are different between parachains
        // But all parachains can use PolkadotJS to connect to the wallet
        // It's not like metamask, one wallet address can be used on different evm networks
        setWalletAddress(undefined);
        setGeneralError(undefined);
        setNetworkError(undefined);
        setAccountError(undefined);

        let detectedInjected: InjectedExtension | undefined;

        try {
          const allInjected = await web3Enable('Carrier');

          detectedInjected = allInjected.find((item) => item.name === 'polkadot-js');
        } catch (e) {
          setGeneralError(errorWalletNotExisted);

          throw e;
        }

        if (!detectedInjected) {
          setGeneralError(errorWalletNotExisted);

          throw errorWalletNotExisted;
        }

        setInjected(detectedInjected);

        const { accounts, addressPrefix, genesisHash } = await getAccounts({
          chainId,
          walletName: 'polkadot-js',
          withGenesisHash: true,
        });

        if (accounts && accounts.length && addressPrefix != null) {
          const selectedAccountAddress = accounts.find((item) => item.toLowerCase() === selectedAccount?.toLowerCase());
          const accountAddress = selectedAccountAddress || accounts[0];

          setWalletAddress(accountAddress);

          const signer = detectedInjected.signer;

          if (signer) {
            setSigner(signer);
            setState(WalletState.CONNECTED);
          } else {
            setAccountError(errorGettingWalletAddress);

            throw errorGettingWalletAddress;
          }
        } else {
          setAccountError(errorGettingWalletAddress);

          throw errorGettingWalletAddress;
        }

        setChainId(chainId);

        const sub = await web3AccountsSubscribe(
          (injectedAccounts) => {
            const selectedAccountAddress = injectedAccounts.find(
              (item) => item.address.toLowerCase() === selectedAccount?.toLowerCase(),
            );
            const accountAddress = selectedAccountAddress?.address || injectedAccounts[0].address;

            setWalletAddress(accountAddress);
          },
          { extensions: ['polkadot-js'], genesisHash, ss58Format: addressPrefix },
        );

        setAccountSub(sub);
      } catch (e) {
        // disconnect and clear state when error happens
        await disconnect();
        throw e;
      }
    },
    [
      disconnect,
      setGeneralError,
      setAccountError,
      setNetworkError,
      setChainId,
      setSigner,
      setWalletAddress,
      setState,
      setInjected,
      setAccountSub,
    ],
  );

  const getAccountList = useCallback(async (options: { chainId: CarrierChainId }) => {
    const { chainId } = options;

    let detectedInjected: InjectedExtension | undefined;

    try {
      const allInjected = await web3Enable('Carrier');

      detectedInjected = allInjected.find((item) => item.name === 'polkadot-js');
    } catch (e) {
      throw e;
    }

    if (!detectedInjected) {
      throw errorWalletNotExisted;
    }

    const { accounts } = await getAccounts({ chainId, walletName: 'polkadot-js', withGenesisHash: true });

    return accounts;
  }, []);

  return useMemo(() => {
    return {
      walletName,
      error: generalError || accountError || networkError,
      isInstalled,
      install,
      icon: polkadotJsIcon,
      availableChainIds,
      state,
      connect,
      disconnect,
      chainId,
      walletAddress,
      customProperties,
      getAccountList,
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
