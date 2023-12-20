import { ethers } from 'ethers';
import { CarrierChainId } from '../../utils/consts';

export interface AbstractWallet {
  walletName: string;
  isInstalled: () => Promise<boolean>;
  install: () => Promise<void>;
  icon: string;
  availableChainIds: CarrierChainId[];
}

export enum WalletState {
  DISCONNECTED,
  CONNECTING,
  CONNECTED,
  DISCONNECTING,
}

export interface ConnectedWallet
  extends Omit<
    WalletInterface,
    'isInstalled' | 'install' | 'state' | 'error' | 'connect' | 'disconnect' | 'walletAddress' | 'chainId'
  > {
  walletAddress: string;
  chainId: CarrierChainId;
}

export interface WalletAdapterInterface {
  // silence: don't switch network, don't wake up account select
  connect: (options: {
    chainId: CarrierChainId;
    walletName: string;
    silence?: boolean;
    selectedAccount?: string;
  }) => void;
  disconnect: (options: { chainId: CarrierChainId; walletName: string }) => void;
  getAccountList: (options: { chainId: CarrierChainId; walletName: string }) => Promise<string[] | undefined>;
  state: WalletState;
  error?: Error;
  connectedWallet?: ConnectedWallet;
  wallets: AbstractWallet[];
}

export type TransactionResult =
  | {
      txHash: string;
    }
  | undefined;

export type SignTransactionResult =
  | {
      signedTransaction: string;
    }
  | undefined;

export enum TransactionStatus {
  Pending,
  Successful,
  Failed,
}

export interface TransferNativeData {
  decimals: number;
  amount: string;
  recipientChain: CarrierChainId;
  recipientAddress: string;
  relayerFee?: ethers.BigNumber;
}

export interface TransferNativeByMRLData {
  decimals: number;
  amount: string;
  recipientChain: CarrierChainId;
  recipientAddress: string;
  relayerFeeParsed?: ethers.BigNumber;
  randomXCMFee?: number;
}

export interface TransferTokenByMRLData extends TransferNativeByMRLData {
  tokenAddress: string;
  originChain: CarrierChainId;
  originAddress: string;
}

export interface TransferTokenData extends TransferNativeData {
  tokenAddress: string;
  originChain: CarrierChainId;
  originAddress: string;
}

export interface TransferNFTData extends Omit<TransferTokenData, 'amount'> {
  tokenId?: string;
}

export interface TransferUSDCData {
  tokenAddress: string;
  amount: string;
  decimals: number;
  recipientChain: CarrierChainId;
  recipientAddress: string;
}

export interface TransferTBTCData {
  tokenAddress: string;
  amount: string;
  decimals: number;
  recipientChain: CarrierChainId;
  recipientAddress: string;
}

export interface ApproveTokenData {
  tokenAddress: string;
  amount: ethers.BigNumber;
  spenderAddress: string;
}

export interface ApproveNFTData {
  tokenAddress: string;
  tokenId: string;
  spenderAddress: string;
}

export interface AttestData {
  tokenAddress: string;
}

export interface RegisterData {
  signedVAA: Uint8Array;
  shouldUpdate?: boolean;
}

export interface RedeemData {
  signedVAA: Uint8Array;
}

export interface RedeemUSDCData {
  wormholeSignedVAA?: Uint8Array;
  circleMessage: string;
  circleAttestation: string;
}

export interface RedeemTBTCData {
  signedVAA: Uint8Array;
}

export interface GetAllowanceData {
  tokenAddress: string;
  spenderAddress: string;
}

export interface GetNFTApprovedData {
  tokenAddress: string;
  tokenId?: string;
  spenderAddress: string;
}

export interface GetTransactionData {
  txHash: string;
}

export interface WalletInterface extends AbstractWallet {
  state: WalletState;
  error?: Error;
  connect(options: { chainId: CarrierChainId; silence?: boolean; selectedAccount?: string }): void;
  disconnect(options: { chainId: CarrierChainId }): void;
  walletAddress?: string;
  chainId?: CarrierChainId;
  customProperties?: any;
  getAccountList?: (options: { chainId: CarrierChainId }) => Promise<string[]>;
  sendTransaction: (...args: any[]) => Promise<TransactionResult>;
  signTransaction: (...args: any[]) => Promise<SignTransactionResult>;
  transferNative: (options: TransferNativeData) => Promise<TransactionResult>;
  transferToken: (options: TransferTokenData) => Promise<TransactionResult>;
  transferNFT: (options: TransferNFTData) => Promise<TransactionResult>;
  transferUSDC: (options: TransferUSDCData) => Promise<TransactionResult>;
  transferTBTC: (options: TransferTBTCData) => Promise<TransactionResult>;
  transferNativeByMRL: (options: TransferNativeByMRLData) => Promise<TransactionResult>;
  transferTokenByMRL: (options: TransferTokenByMRLData) => Promise<TransactionResult>;
  redeemNative: (options: RedeemData) => Promise<TransactionResult>;
  redeemToken: (options: RedeemData) => Promise<TransactionResult>;
  redeemNFT: (options: RedeemData) => Promise<TransactionResult>;
  redeemUSDC: (options: RedeemUSDCData) => Promise<TransactionResult>;
  redeemTBTC: (options: RedeemTBTCData) => Promise<TransactionResult>;
  redeemTokenByMRL: (options: RedeemTBTCData) => Promise<TransactionResult>;
  attestToken: (options: AttestData) => Promise<TransactionResult>;
  registerToken: (options: RegisterData) => Promise<TransactionResult>;
  approveToken: (options: ApproveTokenData) => Promise<TransactionResult>;
  getTokenAllowance: (options: GetAllowanceData) => Promise<{ allowance: ethers.BigNumber } | undefined>;
  approveNFT: (options: ApproveNFTData) => Promise<TransactionResult>;
  getNFTApproved: (options: GetNFTApprovedData) => Promise<{ approved: boolean } | undefined>;
}
