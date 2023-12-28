import {
  approveEth,
  CHAIN_ID_ACALA,
  CHAIN_ID_KARURA,
  CHAIN_ID_KLAYTN,
  ethers_contracts,
  createNonce,
  CHAIN_ID_MOONBEAM,
  CHAIN_ID_ETH,
  CHAIN_ID_AVAX,
  CHAIN_ID_ARBITRUM,
  CHAIN_ID_OPTIMISM,
  CHAIN_ID_BASE,
} from '@certusone/wormhole-sdk';
import { ethers } from 'ethers';
import {
  CarrierChainId,
  getNFTBridgeAddressForChain,
  getTokenBridgeAddressForChain,
  MOONBEAM_ROUTED_LIQUIDITY_PRECOMPILE,
  MOONBEAM_MRL_PRECOMPILE_ADDRESS,
  MOONBEAM_XCM_PRECOMPILE_ADDRESS,
  MOONBEAM_PARACHAIN_ID,
  Polkachain,
  CLUSTER,
  RPC_URLS,
} from '../../../utils/consts';
import { getKaruraGasParams } from '../../../utils/karura';
import { hexlify, hexStripZeros } from 'ethers/lib/utils';
import { METAMASK_CHAIN_PARAMETERS } from '../../../utils/metaMaskChainParameters';
import {
  getTBTCAddressForChain,
  getTBTCGatewayContractOrError,
  getTBTCGatewayForChain,
  getTBTCGatewayForChainOrError,
} from '../../../utils/tbtc';
import {
  getEvmProviderWithWormholeChainId,
  isCarrierPolkaChain,
  tryCarrierNativeToUint8Array,
} from '../../../utils/web3Utils';
import { AbstractWallet } from '../types';
import wormholeMRLTransferABI from '../../../abis/WormholeMRLTransferABI.json';
import {
  createMRLPayload,
  generateXCMTransactionHash,
  getPolkadotProviderWithWormholeChainId,
  isAccountKey20,
  isPolkadotXCMV3,
} from '../../../utils/polkadot';
import { decodeAddress } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import type { Vec } from '@polkadot/types';
import type { EventRecord } from '@polkadot/types/interfaces';
import { getExtrinsicHashByBlockHashAndMessageHash } from './polkadot-xcm';
import { ApiPromise } from '@polkadot/api';
import { PolkachainToken, PolkachainTokens } from '../../../utils/tokenData/mrl';
import { Sdk } from '@moonbeam-network/xcm-sdk';
import { ConfigService } from '@moonbeam-network/xcm-config';
import { chainsMap, assetsMap, getChainsConfigMap } from './xcm-configs';
import { CCTPConfigs, carrierChainIdCCTPDomainMap, cctpSDK } from '../../../utils/cctp';
import wormholeCCTPIntegrationABI from '../../../abis/WormholeCCTPIntegration.json';
import { checkSrcAndDestChain } from '../../../utils/ethereum';

export const errorChainNotSupported = new Error('current chain is not supported');
export const errorWalletNotExisted = new Error('Please install wallet');
export const errorGettingNetwork = new Error('An error occurred while getting the network');
export const errorGettingWalletAddress = new Error('An error occurred while getting the signer address');
export const errorRequestingAccount = new Error('An error occurred while requesting eth accounts');
export const errorCCTPConfigsNotExisted = new Error('An error occurred while getting CCTP configs');
export const errorTBTCConfigsNotExisted = new Error('An error occurred while getting TBTC configs');

export type TransactionRequest = {
  to?: string;
  from?: string;
  nonce?: ethers.BigNumberish;

  gasLimit?: ethers.BigNumberish;
  gasPrice?: ethers.BigNumberish;

  data?: ethers.BytesLike;
  value?: ethers.BigNumberish;
  chainId?: number;

  type?: number;
  accessList?: ethers.utils.AccessListish;

  maxPriorityFeePerGas?: ethers.BigNumberish;
  maxFeePerGas?: ethers.BigNumberish;

  customData?: Record<string, any>;
  ccipReadEnabled?: boolean;
};

export async function sendEthTransaction(options: {
  signer: ethers.Signer;
  tx: ethers.utils.Deferrable<TransactionRequest>;
}) {
  const { signer, tx } = options;

  if (signer) {
    const recipent = await signer.sendTransaction(tx);

    return {
      txHash: recipent.hash,
    };
  }
}

export async function signEthTransaction(options: {
  signer: ethers.Signer;
  tx: ethers.utils.Deferrable<TransactionRequest>;
}) {
  const { signer, tx } = options;

  if (signer) {
    const signedTransaction = await signer.signTransaction(tx);

    return {
      signedTransaction,
    };
  }
}

export interface TransferEthNativeData {
  signer: ethers.Signer;
  decimals: number;
  amount: string;
  recipientChain: CarrierChainId;
  recipientAddress: string;
  chainId: CarrierChainId;
  relayerFee?: ethers.BigNumber;
}

export async function transferEthNative(data: TransferEthNativeData) {
  const { signer, decimals, amount, recipientChain, recipientAddress, chainId, relayerFee } = data;

  checkSrcAndDestChain(chainId, recipientChain);

  const baseAmountParsed = ethers.utils.parseUnits(amount, decimals);
  const feeParsed = relayerFee || ethers.BigNumber.from(0);
  const transferAmountParsed = baseAmountParsed.add(feeParsed);
  // Klaytn requires specifying gasPrice
  const overrides = chainId === CHAIN_ID_KLAYTN ? { gasPrice: (await signer.getGasPrice()).toString() } : {};
  const tokenBridgeAddress = getTokenBridgeAddressForChain(chainId);
  const bridge = ethers_contracts.Bridge__factory.connect(tokenBridgeAddress, signer);
  const recipientAddressUnit8Array = tryCarrierNativeToUint8Array(recipientAddress, recipientChain);
  const { hash } = await bridge.wrapAndTransferETH(
    recipientChain,
    recipientAddressUnit8Array,
    feeParsed,
    createNonce(),
    {
      ...overrides,
      value: transferAmountParsed,
    },
  );

  return {
    txHash: hash,
  };
}

export interface TransferEthTokenData {
  signer: ethers.Signer;
  tokenAddress: string;
  decimals: number;
  amount: string;
  recipientChain: CarrierChainId;
  recipientAddress: string;
  chainId: CarrierChainId;
  relayerFee?: ethers.BigNumber;
}

export async function transferEthToken(data: TransferEthTokenData) {
  const { signer, tokenAddress, decimals, amount, recipientChain, recipientAddress, chainId, relayerFee } = data;

  checkSrcAndDestChain(chainId, recipientChain);

  const baseAmountParsed = ethers.utils.parseUnits(amount, decimals);
  const feeParsed = relayerFee || ethers.BigNumber.from(0);
  const transferAmountParsed = baseAmountParsed.add(feeParsed);
  // Klaytn requires specifying gasPrice
  const overrides = chainId === CHAIN_ID_KLAYTN ? { gasPrice: (await signer.getGasPrice()).toString() } : {};
  const tokenBridgeAddress = getTokenBridgeAddressForChain(chainId);
  const bridge = ethers_contracts.Bridge__factory.connect(tokenBridgeAddress, signer);
  const recipientAddressUnit8Array = tryCarrierNativeToUint8Array(recipientAddress, recipientChain);
  const { hash } = await bridge.transferTokens(
    tokenAddress,
    transferAmountParsed,
    recipientChain,
    recipientAddressUnit8Array,
    feeParsed,
    createNonce(),
    overrides,
  );

  return {
    txHash: hash,
  };
}

export interface TransferEthNFTData {
  signer: ethers.Signer;
  tokenAddress: string;
  tokenId: string;
  recipientChain: CarrierChainId;
  recipientAddress: string;
  chainId: CarrierChainId;
}

export async function transferEthNFT(data: TransferEthNFTData) {
  const { signer, tokenAddress, tokenId, recipientChain, recipientAddress, chainId } = data;

  checkSrcAndDestChain(chainId, recipientChain);

  // Klaytn requires specifying gasPrice
  const overrides = chainId === CHAIN_ID_KLAYTN ? { gasPrice: (await signer.getGasPrice()).toString() } : {};
  const nftBridgeAddress = getNFTBridgeAddressForChain(chainId);
  const bridge = ethers_contracts.NFTBridge__factory.connect(nftBridgeAddress, signer);
  const recipientAddressUnit8Array = tryCarrierNativeToUint8Array(recipientAddress, recipientChain);
  const { hash } = await bridge.transferNFT(
    tokenAddress,
    tokenId,
    recipientChain,
    recipientAddressUnit8Array,
    createNonce(),
    overrides,
  );

  return {
    txHash: hash,
  };
}

export interface TransferEthUSDCData {
  chainId: CarrierChainId;
  signer: ethers.Signer;
  tokenAddress: string;
  decimals: number;
  amount: string;
  recipientChain: CarrierChainId;
  recipientAddress: string;
}

export async function transferEthUSDC(data: TransferEthUSDCData) {
  const { chainId, signer, amount, decimals, recipientChain, recipientAddress } = data;

  checkSrcAndDestChain(chainId, recipientChain);

  const sourceDomain = carrierChainIdCCTPDomainMap[chainId];
  const destinationDomain = carrierChainIdCCTPDomainMap[recipientChain];
  const amountParsed = ethers.utils.parseUnits(amount, decimals);

  const burnTx = await cctpSDK.burnUSDC({
    signer,
    sourceDomain,
    destinationDomain,
    destinationAddress: recipientAddress,
    amount: amountParsed,
  });

  return { txHash: burnTx.hash };
}

export interface TransferEthTBTCData {
  chainId: CarrierChainId;
  signer: ethers.Signer;
  tokenAddress: string;
  decimals: number;
  amount: string;
  recipientChain: CarrierChainId;
  recipientAddress: string;
}

export async function transferEthTBTC({
  chainId,
  signer,
  tokenAddress,
  decimals,
  amount,
  recipientChain,
  recipientAddress,
}: TransferEthTBTCData) {
  checkSrcAndDestChain(chainId, recipientChain);

  const amountParsed = ethers.utils.parseUnits(amount, decimals);
  const nonce = createNonce();
  const gatewayContract = getTBTCGatewayForChain(chainId);
  const recipientAddressUnit8Array = tryCarrierNativeToUint8Array(recipientAddress, recipientChain);

  if (gatewayContract && tokenAddress.toLowerCase() === getTBTCAddressForChain(chainId).toLowerCase()) {
    console.log(
      'sendTbtc',
      chainId,
      getTBTCGatewayForChainOrError(chainId, errorTBTCConfigsNotExisted),
      amountParsed,
      recipientChain,
      recipientAddress,
    );
    const { hash } = await getTBTCGatewayContractOrError(signer, chainId, errorTBTCConfigsNotExisted).sendTbtc(
      amountParsed,
      recipientChain,
      recipientAddressUnit8Array,
      0,
      nonce,
    );
    return { txHash: hash };
  } else {
    const tokenBridgeAddress = getTokenBridgeAddressForChain(chainId);
    const bridge = ethers_contracts.Bridge__factory.connect(tokenBridgeAddress, signer);
    const { hash } = await bridge.transferTokensWithPayload(
      tokenAddress,
      amountParsed,
      recipientChain,
      tryCarrierNativeToUint8Array(
        getTBTCGatewayForChainOrError(recipientChain, errorTBTCConfigsNotExisted),
        recipientChain,
      ),
      nonce,
      recipientAddressUnit8Array,
    );
    return { txHash: hash };
  }
}

export interface RedeemEthTBTCData {
  signer: ethers.Signer;
  signedVAA: Uint8Array;
  chainId: CarrierChainId;
}

export async function redeemEthTBTC({ signer, signedVAA, chainId }: RedeemEthTBTCData) {
  const contract = getTBTCGatewayContractOrError(signer, chainId, errorTBTCConfigsNotExisted);
  const { hash } = await contract.receiveTbtc(signedVAA);
  return { txHash: hash };
}

export interface RedeemEthNativeData {
  signer: ethers.Signer;
  signedVAA: Uint8Array;
  chainId: CarrierChainId;
}

export async function redeemEthNative(data: RedeemEthNativeData) {
  const { signer, signedVAA, chainId } = data;
  // Klaytn requires specifying gasPrice
  const overrides = chainId === CHAIN_ID_KLAYTN ? { gasPrice: (await signer.getGasPrice()).toString() } : {};
  const tokenBridgeAddress = getTokenBridgeAddressForChain(chainId);
  const bridge = ethers_contracts.Bridge__factory.connect(tokenBridgeAddress, signer);
  const { hash } = await bridge.completeTransferAndUnwrapETH(signedVAA, overrides);

  return { txHash: hash };
}

export interface RedeemEthTokenData {
  signer: ethers.Signer;
  signedVAA: Uint8Array;
  chainId: CarrierChainId;
}

export async function redeemEthToken(data: RedeemEthTokenData) {
  const { signer, signedVAA, chainId } = data;

  console.log('redeemEthToken', signedVAA, chainId);

  const overrides = chainId === CHAIN_ID_KLAYTN ? { gasPrice: (await signer.getGasPrice()).toString() } : {};
  const tokenBridgeAddress = getTokenBridgeAddressForChain(chainId);
  const bridge = ethers_contracts.Bridge__factory.connect(tokenBridgeAddress, signer);
  const { hash } = await bridge.completeTransfer(signedVAA, overrides);

  return { txHash: hash };
}

// we should have a relayer to redeem token by mrl for users, this one just for manual tests
export async function redeemEthTokenByMRL(data: RedeemEthTokenData) {
  const { signer, signedVAA, chainId } = data;

  console.log('redeemEthTokenByMRL', signedVAA, chainId);

  // const overrides = chainId === CHAIN_ID_KLAYTN ? { gasPrice: (await signer.getGasPrice()).toString() } : {};
  // const tokenBridgeAddress = getTokenBridgeAddressForChain(chainId);
  const contract = new ethers.Contract(MOONBEAM_MRL_PRECOMPILE_ADDRESS, wormholeMRLTransferABI, signer);

  const { hash } = await contract.wormholeTransferERC20(signedVAA);

  return { txHash: hash };
}

export interface RedeemEthNFTData {
  signer: ethers.Signer;
  signedVAA: Uint8Array;
  chainId: CarrierChainId;
}

export async function redeemEthNFT(data: RedeemEthNFTData) {
  const { signer, signedVAA, chainId } = data;

  const overrides =
    // Karura and Acala need gas params for NFT minting
    chainId === CHAIN_ID_KARURA || chainId === CHAIN_ID_ACALA
      ? await getKaruraGasParams(RPC_URLS[CLUSTER][chainId])
      : // Klaytn requires specifying gasPrice
      chainId === CHAIN_ID_KLAYTN
      ? { gasPrice: (await signer.getGasPrice()).toString() }
      : {};
  const nftBridgeAddress = getNFTBridgeAddressForChain(chainId);
  const bridge = ethers_contracts.Bridge__factory.connect(nftBridgeAddress, signer);
  const { hash } = await bridge.completeTransfer(signedVAA, overrides);

  return { txHash: hash };
}

export interface RedeemEthUSDCData {
  signer: ethers.Signer;
  wormholeSignedVAA?: Uint8Array;
  circleAttestation: string;
  circleMessage: string;
  chainId: CarrierChainId;
}

export async function redeemEthUSDC(data: RedeemEthUSDCData) {
  const { signer, wormholeSignedVAA, circleAttestation, circleMessage, chainId } = data;

  // for the old wormhole usdc redemption
  if (wormholeSignedVAA) {
    const cctpConfig = CCTPConfigs[chainId];
    const contract = new ethers.Contract(cctpConfig.wormholeContractAddress, wormholeCCTPIntegrationABI, signer);
    const { hash } = await contract.redeemTokensWithPayload({
      encodedWormholeMessage: wormholeSignedVAA,
      circleBridgeMessage: circleMessage,
      circleAttestation,
    });

    return { txHash: hash };
  } else {
    const destinationDomain = carrierChainIdCCTPDomainMap[chainId];
    const mintTx = await cctpSDK.mintUSDC({
      signer,
      messageBytes: circleMessage,
      attestationSignature: circleAttestation,
      destinationDomain,
    });
    return { txHash: mintTx.hash };
  }
}

export interface AttestEthData {
  signer: ethers.Signer;
  tokenAddress: string;
  chainId: CarrierChainId;
}

export async function attestEth(data: AttestEthData) {
  const { signer, tokenAddress, chainId } = data;
  const overrides = chainId === CHAIN_ID_KLAYTN ? { gasPrice: (await signer.getGasPrice()).toString() } : {};
  const tokenBridgeAddress = getTokenBridgeAddressForChain(chainId);
  const bridge = ethers_contracts.Bridge__factory.connect(tokenBridgeAddress, signer);
  const { hash } = await bridge.attestToken(tokenAddress, createNonce(), overrides);

  return { txHash: hash };
}

export interface RegisterEthData {
  signer: ethers.Signer;
  signedVAA: Uint8Array;
  chainId: CarrierChainId;
}

export async function registerEth(data: RegisterEthData) {
  const { signer, signedVAA, chainId } = data;
  const overrides =
    chainId === CHAIN_ID_KARURA || chainId === CHAIN_ID_ACALA
      ? await getKaruraGasParams(RPC_URLS[CLUSTER][chainId])
      : chainId === CHAIN_ID_KLAYTN
      ? { gasPrice: (await signer.getGasPrice()).toString() }
      : {};
  const tokenBridgeAddress = getTokenBridgeAddressForChain(chainId);
  const bridge = ethers_contracts.Bridge__factory.connect(tokenBridgeAddress, signer);
  const { hash } = await bridge.createWrapped(signedVAA, overrides);

  return { txHash: hash };
}

export interface ApproveEthTokenData {
  signer: ethers.Signer;
  chainId: CarrierChainId;
  tokenAddress: string;
  amount: ethers.BigNumber;
  spenderAddress: string;
}

export async function approveEthToken(data: ApproveEthTokenData) {
  const { chainId, signer, tokenAddress, amount, spenderAddress } = data;
  const gasPricePromise = chainId === CHAIN_ID_KLAYTN ? signer.getGasPrice() : Promise.resolve(undefined);
  const gasPrice = await gasPricePromise;

  const { transactionHash } = await approveEth(
    spenderAddress,
    tokenAddress,
    signer,
    amount,
    gasPrice === undefined ? {} : { gasPrice },
  );

  return { txHash: transactionHash };
}

export interface GetEthTokenAllowanceData {
  walletAddress: string;
  chainId: CarrierChainId;
  tokenAddress: string;
  spenderAddress: string;
}

export async function getEthTokenAllowance(data: GetEthTokenAllowanceData) {
  const { walletAddress, chainId, tokenAddress, spenderAddress } = data;
  const provider = getEvmProviderWithWormholeChainId(chainId);

  const token = ethers_contracts.TokenImplementation__factory.connect(tokenAddress, provider);
  const allowance = await token.allowance(walletAddress, spenderAddress);

  return { allowance };
}

export interface ApproveEthNFTData {
  signer: ethers.Signer;
  tokenAddress: string;
  tokenId: string;
  spenderAddress: string;
}

export async function approveEthNFT(data: ApproveEthNFTData) {
  const { signer, tokenAddress, tokenId, spenderAddress } = data;

  const token = ethers_contracts.NFTImplementation__factory.connect(tokenAddress, signer);
  const { hash } = await token.approve(spenderAddress, tokenId);

  return { txHash: hash };
}

export interface GetEthNFTApprovedData {
  chainId: CarrierChainId;
  tokenAddress: string;
  tokenId: string;
  spenderAddress: string;
}

export async function getEthNFTApproved(data: GetEthNFTApprovedData) {
  const { chainId, tokenAddress, tokenId, spenderAddress } = data;
  const provider = getEvmProviderWithWormholeChainId(chainId);

  const token = ethers_contracts.NFTImplementation__factory.connect(tokenAddress, provider);
  const approvedOperator = await token.getApproved(tokenId);
  const approved = spenderAddress.toLowerCase() === approvedOperator.toLowerCase();

  // same logic as the useTokens hook
  // so that we can compare the balance with the allowance as erc20 tokens do
  return { approved };
}

export async function switchEvmChain(options: { provider: ethers.providers.Web3Provider; evmChainId: number }) {
  const { provider, evmChainId } = options;

  try {
    await provider.send('wallet_switchEthereumChain', [{ chainId: hexStripZeros(hexlify(evmChainId)) }]);
  } catch (switchError: any) {
    console.log('wallet_switchEthereumChain error', switchError);

    // This error code indicates that the chain has not been added to MetaMask.
    if (switchError.code === 4902) {
      const addChainParameter = METAMASK_CHAIN_PARAMETERS[evmChainId];

      if (addChainParameter !== undefined) {
        try {
          await provider.send('wallet_addEthereumChain', [addChainParameter]);
        } catch (addError) {
          console.log('wallet_addEthereumChain error', addError);

          console.error(addError);
        }
      }
    }
  }
}

export function getAbstractWalletByChainIdAndName(wallets: AbstractWallet[], chainId?: CarrierChainId, name?: string) {
  return chainId && name
    ? wallets.find((item) => item.walletName === name && item.availableChainIds.includes(chainId))
    : undefined;
}

export interface TransferEthTokenByMRLData {
  signer: ethers.Signer;
  tokenAddress: string;
  decimals: number;
  amount: string;
  recipientChain: CarrierChainId;
  recipientAddress: string;
  MRLFeeParsed?: ethers.BigNumber;
  chainId: CarrierChainId;
  randomXCMFee?: number;
}
export async function transferEthTokenByXCM(data: TransferEthTokenByMRLData) {
  const {
    signer,
    tokenAddress,
    decimals,
    amount,
    recipientChain,
    recipientAddress,
    MRLFeeParsed,
    chainId,
    randomXCMFee,
  } = data;

  checkSrcAndDestChain(chainId, recipientChain);

  const baseAmountParsed = ethers.utils.parseUnits(amount, decimals);
  const amountParsed = baseAmountParsed.add(MRLFeeParsed || ethers.BigNumber.from(0));
  const recipientAddressHex = isAccountKey20(recipientChain)
    ? recipientAddress
    : u8aToHex(decodeAddress(recipientAddress));
  const targetToken = PolkachainTokens[recipientChain].find(
    (item) => item.tokenAddressOnMoonbeam.toLowerCase() === tokenAddress.toLowerCase(),
  );
  const walletAddress = await signer.getAddress();

  if (!targetToken || !targetToken.symbol) {
    throw new Error("Can't find detination token");
  }

  const { assets } = Sdk({
    configService: new ConfigService({
      assets: assetsMap,
      chains: chainsMap,
      chainsConfig: getChainsConfigMap({
        sourceChainId: MOONBEAM_PARACHAIN_ID,
        targetChainId: recipientChain as Polkachain,
        randomXCMFee,
      }),
    }),
  });

  console.log(
    'transferEthTokenByXCM',
    targetToken.symbol.toLowerCase(),
    amountParsed.toBigInt(),
    walletAddress,
    recipientAddress,
    {
      assets: assetsMap,
      chains: chainsMap,
      chainsConfig: getChainsConfigMap({
        sourceChainId: MOONBEAM_PARACHAIN_ID,
        targetChainId: recipientChain as Polkachain,
        randomXCMFee,
      }),
    },
  );

  const sourceChain = CLUSTER === 'mainnet' ? 'moonbeam' : 'moonbase-alpha';
  const destChain =
    recipientChain === Polkachain.HydraDX
      ? 'hydra-dx'
      : recipientChain === Polkachain.Interlay
      ? 'interlay'
      : recipientChain === Polkachain.PeaqAgung
      ? 'peaq-agung'
      : '';
  const dataViaAssetsMethod = await assets()
    .asset(targetToken.symbol.toLowerCase())
    .source(sourceChain)
    .destination(destChain)
    .accounts(walletAddress, recipientAddress, {
      evmSigner: signer,
    });

  const hash = await dataViaAssetsMethod.transfer(amountParsed.toBigInt());

  // listen on parachain event
  return new Promise<{ txHash: string }>(async (resolver, rejecter) => {
    const moonbeamApi = await getPolkadotProviderWithWormholeChainId(MOONBEAM_PARACHAIN_ID);
    const moonbeamUnsubscriber = await moonbeamApi.query.system.events((events) => {
      handleMoonbeamMessageByXCM({
        api: moonbeamApi,
        targetToken,
        events,
        walletAddress,
        unsubscriber: moonbeamUnsubscriber,
        resolver,
        rejecter,
      });
    });

    const targetChainApi = await getPolkadotProviderWithWormholeChainId(recipientChain);
    const targetChainApiUnsubscriber = await targetChainApi.query.system.events((events) => {
      handleParachainMessageByXCM({
        api: targetChainApi,
        events,
        recipientChain,
        recipientAddress: recipientAddressHex,
        targetToken,
        unsubscriber: targetChainApiUnsubscriber,
      });
    });
  });
}

export async function transferEthTokenByMRL(data: TransferEthTokenByMRLData) {
  const { signer, tokenAddress, decimals, amount, recipientChain, recipientAddress, MRLFeeParsed, chainId } = data;

  checkSrcAndDestChain(chainId, recipientChain);

  const baseAmountParsed = ethers.utils.parseUnits(amount, decimals);
  const amountParsed = baseAmountParsed.add(MRLFeeParsed || ethers.BigNumber.from(0));

  if (chainId === CHAIN_ID_MOONBEAM && isCarrierPolkaChain(recipientChain)) {
    return transferEthTokenByXCM(data);
  } else {
    // Klaytn requires specifying gasPrice
    const overrides = chainId === CHAIN_ID_KLAYTN ? { gasPrice: (await signer.getGasPrice()).toString() } : {};
    const tokenBridgeAddress = getTokenBridgeAddressForChain(chainId);
    const bridge = ethers_contracts.Bridge__factory.connect(tokenBridgeAddress, signer);
    const payload = createMRLPayload(recipientChain, recipientAddress);
    const nonce = createNonce();

    console.log(
      'transferEthTokenByMRL',
      tokenAddress,
      amountParsed,
      CHAIN_ID_MOONBEAM,
      MOONBEAM_ROUTED_LIQUIDITY_PRECOMPILE,
      nonce,
      payload,
      overrides,
    );

    const { hash } = await bridge.transferTokensWithPayload(
      tokenAddress,
      amountParsed,
      CHAIN_ID_MOONBEAM,
      MOONBEAM_ROUTED_LIQUIDITY_PRECOMPILE,
      nonce,
      payload,
      overrides,
    );

    return {
      txHash: hash,
    };
  }
}

export interface TransferEthNativeByMRLData {
  signer: ethers.Signer;
  decimals: number;
  amount: string;
  recipientChain: CarrierChainId;
  recipientAddress: string;
  MRLFeeParsed?: ethers.BigNumber;
  chainId: CarrierChainId;
}

export async function transferEthNativeByMRL(data: TransferEthNativeByMRLData) {
  const { signer, decimals, amount, recipientChain, recipientAddress, MRLFeeParsed, chainId } = data;

  checkSrcAndDestChain(chainId, recipientChain);

  const baseAmountParsed = ethers.utils.parseUnits(amount, decimals);
  const amountParsed = baseAmountParsed.add(MRLFeeParsed || ethers.BigNumber.from(0));

  // Klaytn requires specifying gasPrice
  const overrides = chainId === CHAIN_ID_KLAYTN ? { gasPrice: (await signer.getGasPrice()).toString() } : {};
  const tokenBridgeAddress = getTokenBridgeAddressForChain(chainId);
  const bridge = ethers_contracts.Bridge__factory.connect(tokenBridgeAddress, signer);
  const payload = createMRLPayload(recipientChain, recipientAddress);
  const nonce = createNonce();

  console.log(
    'transferEthNativeByMRL',
    amountParsed,
    CHAIN_ID_MOONBEAM,
    MOONBEAM_ROUTED_LIQUIDITY_PRECOMPILE,
    nonce,
    payload,
    overrides,
  );

  const { hash } = await bridge.wrapAndTransferETHWithPayload(
    CHAIN_ID_MOONBEAM,
    MOONBEAM_ROUTED_LIQUIDITY_PRECOMPILE,
    nonce,
    payload,
    {
      ...overrides,
      value: amountParsed,
    },
  );

  return {
    txHash: hash,
  };
}

const xcmMessageQueue: {
  messageHash: string;
  sourceParachainId?: CarrierChainId;
  sourceParachainBlockHash?: string;
  sourceParachainExtrinsicHash?: string;
  targetParachainId?: CarrierChainId;
  targetParachainBlockHash?: string;
  targetParachainExtrinsicHash?: string;
  promiseResolver?: (options: { txHash: string }) => void;
  promiseRejecter?: (err: Error) => void;
}[] = [];

async function handleMoonbeamMessageByXCM(options: {
  api: ApiPromise;
  events: Vec<EventRecord>;
  walletAddress: string;
  targetToken: PolkachainToken;
  unsubscriber: () => void;
  rejecter: (e: any) => void;
  resolver: (data: { txHash: string }) => void;
}) {
  const { api, events, walletAddress, targetToken, unsubscriber, rejecter, resolver } = options;
  const xcmpEvent = events.find((item) => item.event.section === 'xcmpQueue');
  const sameExtrinsicEvents = events.filter((item) => {
    return (
      item.phase.isApplyExtrinsic &&
      xcmpEvent?.phase.isApplyExtrinsic &&
      item.phase.asApplyExtrinsic.eq(xcmpEvent?.phase.asApplyExtrinsic)
    );
  });
  const xcmpEvents = sameExtrinsicEvents.filter((item) => item.event.section === 'xcmpQueue');
  const xcmpSentEvent = sameExtrinsicEvents.find(
    (item) => item.event.section === 'xcmpQueue' && item.event.method === 'XcmpMessageSent',
  );
  const ethereumExecutedEvents = sameExtrinsicEvents.filter(
    (item) => item.event.section === 'ethereum' && item.event.method === 'Executed',
  );
  const tokenTransferExecutedEvent =
    ethereumExecutedEvents && ethereumExecutedEvents.length > 0 ? ethereumExecutedEvents[0] : undefined;

  const isXCMTransfer: boolean =
    (tokenTransferExecutedEvent?.event.data as any)?.from?.toHex()?.toLowerCase() === walletAddress.toLowerCase() &&
    (tokenTransferExecutedEvent?.event.data as any)?.to?.toHex()?.toLowerCase() ===
      MOONBEAM_XCM_PRECOMPILE_ADDRESS.toLowerCase();

  const receivedMessageHash = (xcmpSentEvent?.event.data as any)?.messageHash?.toHex();
  const blockHash = events.createdAtHash?.toHex();

  if (isXCMTransfer) {
    if (!blockHash) {
      const err = new Error(`fail to find block hash on moonbeam.`);

      console.error(err);

      if (rejecter) {
        rejecter(err);
      }

      unsubscriber();
    } else if (!receivedMessageHash) {
      const err = new Error(`empty messageHash or targetMessageHash on moonbeam, blockHash: ${blockHash}`);

      console.error(err);

      if (rejecter) {
        rejecter(err);
      }

      unsubscriber();
    } else {
      console.log(`XCM Transfer received on moonbeam. blockHash: ${blockHash}, messageHash: ${receivedMessageHash}`);

      const { extrinsicHash } = await getExtrinsicHashByBlockHashAndMessageHash({
        api,
        blockHash,
        messageHash: receivedMessageHash,
        events,
      });
      const isXcmFailed = xcmpEvents.some((item) => item.event.method === 'Fail');
      // transfer has two xcmp events and redemption has one, and they all need to be successful
      const isSuccess = xcmpEvents.length === 1 && !isXcmFailed;
      const xcmMessageIndex = xcmMessageQueue.findIndex((item) => item.messageHash === receivedMessageHash);
      const xcmMessage = xcmMessageQueue[xcmMessageIndex];
      const { messageHash, targetParachainId, targetParachainBlockHash, targetParachainExtrinsicHash } =
        xcmMessage || {};

      // if failed, save failed result and exist.
      if (!isSuccess) {
        if (rejecter) {
          rejecter(new Error(`xcmpQueue failed on moonbeam. blockHash: ${blockHash}, messageHash: ${messageHash}`));
        }

        unsubscriber();
      } else {
        if (messageHash && targetParachainId && targetParachainBlockHash && targetParachainExtrinsicHash) {
          const txHash = generateXCMTransactionHash({
            sourceMessageHash: messageHash,
            sourceAssetId: targetToken.tokenAddressOnMoonbeam,
            sourceParachainId: MOONBEAM_PARACHAIN_ID,
            sourceParachainBlockHash: blockHash,
            sourceParachainExtrinsicHash: extrinsicHash,
            targetMessageHash: messageHash,
            targetAssetId: targetToken.assetId,
            targetParachainId,
            targetParachainBlockHash,
            targetParachainExtrinsicHash,
          });

          if (resolver) {
            resolver({ txHash });
          }

          unsubscriber();

          xcmMessageQueue.splice(xcmMessageIndex, 1);
        } else {
          xcmMessageQueue.push({
            messageHash: receivedMessageHash,
            sourceParachainId: MOONBEAM_PARACHAIN_ID,
            sourceParachainBlockHash: blockHash,
            sourceParachainExtrinsicHash: extrinsicHash,
            promiseRejecter: rejecter,
            promiseResolver: resolver,
          });

          unsubscriber();

          console.log('xcmMessageQueue saved on moonbeam', xcmMessageQueue);
        }
      }
    }
  }
}

async function handleParachainMessageByXCM(options: {
  api: ApiPromise;
  events: Vec<EventRecord>;
  recipientChain: CarrierChainId;
  recipientAddress: string;
  targetToken: PolkachainToken;
  unsubscriber: () => void;
}) {
  const { api, events, recipientChain, recipientAddress, targetToken, unsubscriber } = options;
  const xcmEvent = events.find((item) => item.event.section === 'xcmpQueue');
  const sameExtrinsicEvents = events.filter((item) => {
    return (
      item.phase.isApplyExtrinsic &&
      xcmEvent?.phase.isApplyExtrinsic &&
      item.phase.asApplyExtrinsic.eq(xcmEvent?.phase.asApplyExtrinsic)
    );
  });
  const assetsIssuedEvents = sameExtrinsicEvents.filter((item) =>
    isPolkadotXCMV3(recipientChain)
      ? item.event.section === 'tokens' && item.event.method === 'Deposited'
      : item.event.section === 'assets' && item.event.method === 'Issued',
  );
  const assetIds: string[] = assetsIssuedEvents
    .map((item) => {
      try {
        return isPolkadotXCMV3(recipientChain)
          ? recipientChain === Polkachain.Interlay
            ? (item?.event.data as any)?.currencyId?.asForeignAsset?.toString()
            : recipientChain === Polkachain.PeaqAgung
            ? (item?.event.data as any)?.currencyId?.asToken.toString()
            : (item?.event.data as any)?.currencyId?.toString()
          : (item?.event.data as any)?.assetId.toString();
      } catch (e) {}
    })
    .filter((item) => item != null);
  const recipientU8As: Uint8Array[] = assetsIssuedEvents.map((item) =>
    isPolkadotXCMV3(recipientChain) ? (item?.event.data as any)?.who : (item?.event.data as any)?.owner,
  );
  const recipients: string[] = recipientU8As.map((item) => u8aToHex(item));

  console.log('handleTargetParachainMessageByXCM', assetIds, recipients, targetToken, recipientAddress);

  const isXCMRedemption =
    xcmEvent != null &&
    assetsIssuedEvents != null &&
    assetIds.includes(
      recipientChain === Polkachain.PeaqAgung ? targetToken.parachainSymbol || targetToken.symbol : targetToken.assetId,
    ) &&
    recipients.includes(recipientAddress);
  const receivedMessageHash = (xcmEvent?.event.data as any)?.messageHash?.toHex();
  const blockHash = events.createdAtHash?.toHex();

  if (isXCMRedemption) {
    if (!blockHash) {
      console.error(new Error(`fail to find block hash on target parachain.`));

      unsubscriber();
    } else if (!receivedMessageHash) {
      console.error(new Error(`empty messageHash on target parachain, blockHash: ${blockHash}`));

      unsubscriber();
    } else {
      console.log(
        `XCM Redemption received on target parachain. blockHash: ${blockHash}, messageHash: ${receivedMessageHash}`,
      );

      const { extrinsicHash } = await getExtrinsicHashByBlockHashAndMessageHash({
        api,
        blockHash,
        messageHash: receivedMessageHash,
        events,
      });

      console.log(`get extrinsic hash successfully on target parachain. extrinsicHash: ${extrinsicHash}`);

      const xcmEvents = sameExtrinsicEvents.filter((item) => {
        return item.event.section === 'xcmpQueue';
      });
      const isXcmFailed = xcmEvents.some((item) => item.event.method === 'Fail');
      // transfer has two xcmp events and redemption has one, and they all need to be successful
      const isSuccess = xcmEvents.length === 1 && !isXcmFailed && extrinsicHash;
      const xcmMessageIndex = xcmMessageQueue.findIndex((item) => item.messageHash === receivedMessageHash);
      const xcmMessage = xcmMessageQueue[xcmMessageIndex];
      const {
        promiseResolver,
        promiseRejecter,
        messageHash,
        sourceParachainId,
        sourceParachainBlockHash,
        sourceParachainExtrinsicHash,
      } = xcmMessage || {};

      // if failed, save failed result and exist.
      if (!isSuccess) {
        if (promiseRejecter) {
          promiseRejecter(
            new Error(`xcmpQueue failed on target parachain. blockHash: ${blockHash}, messageHash: ${messageHash}`),
          );
        }

        unsubscriber();
      } else {
        if (messageHash && sourceParachainId && sourceParachainBlockHash && sourceParachainExtrinsicHash) {
          const txHash = generateXCMTransactionHash({
            sourceMessageHash: messageHash,
            sourceAssetId: targetToken.tokenAddressOnMoonbeam,
            sourceParachainId,
            sourceParachainBlockHash,
            sourceParachainExtrinsicHash,
            targetMessageHash: messageHash,
            targetAssetId: targetToken.assetId,
            targetParachainId: recipientChain,
            targetParachainExtrinsicHash: extrinsicHash,
            targetParachainBlockHash: blockHash,
          });

          if (promiseResolver) {
            promiseResolver({ txHash });
          }

          unsubscriber();

          xcmMessageQueue.splice(xcmMessageIndex, 1);

          console.log('txHash generated on target parachain', xcmMessageQueue, xcmMessage);
        } else {
          xcmMessageQueue.push({
            messageHash: receivedMessageHash,
            targetParachainId: recipientChain,
            targetParachainExtrinsicHash: extrinsicHash,
            targetParachainBlockHash: blockHash,
          });

          unsubscriber();

          console.log('xcmMessage created on target parachain', xcmMessageQueue);
        }
      }
    }
  }
}
