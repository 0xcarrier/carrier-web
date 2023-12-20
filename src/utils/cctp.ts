import {
  CHAIN_ID_ARBITRUM,
  CHAIN_ID_AVAX,
  CHAIN_ID_BASE,
  CHAIN_ID_ETH,
  CHAIN_ID_OPTIMISM,
  CHAIN_ID_POLYGON,
} from '@certusone/wormhole-sdk';
import { CLUSTER, CarrierChainId } from './consts';
import { CCTPDomain, CCTPSdk } from '@automata-network/cctp-sdk';
import { TransactionReceipt } from '../hooks/useTransaction';
import { Interface, defaultAbiCoder } from 'ethers/lib/utils';
import tokenMessengerAbi from '../abis/TokenMessenger.json';
import { parseLogs } from './ethereum';
import { BigNumber } from 'ethers';

export const cctpSDK = CLUSTER === 'mainnet' ? CCTPSdk().mainnet() : CCTPSdk().testnet();

export const carrierChainIdCCTPDomainMap: { [chainId: number]: CCTPDomain } = {
  [CHAIN_ID_ETH]: CCTPDomain.Ethereum,
  [CHAIN_ID_AVAX]: CCTPDomain.Avalanche,
  [CHAIN_ID_ARBITRUM]: CCTPDomain.Arbitrum,
  [CHAIN_ID_OPTIMISM]: CCTPDomain.Optimism,
  [CHAIN_ID_BASE]: CCTPDomain.Base,
  [CHAIN_ID_POLYGON]: CCTPDomain.Polygon,
};

export function isUSDCCanBeBridgeByCCTP(options: {
  sourceChainId: CarrierChainId;
  targetChainId: CarrierChainId;
  tokenAddress: string;
}) {
  const { sourceChainId, targetChainId, tokenAddress } = options;

  const sourceDomain = carrierChainIdCCTPDomainMap[sourceChainId];
  const sourceChainConfig = cctpSDK.configs.networks.find((item) => item.domain === sourceDomain);
  const targetDomain = carrierChainIdCCTPDomainMap[targetChainId];
  const targetChainConfig = cctpSDK.configs.networks.find((item) => item.domain === targetDomain);

  return sourceChainConfig && targetChainConfig
    ? sourceChainConfig.usdcContractAddress.toLowerCase() === tokenAddress.toLowerCase()
    : false;
}

export function getChainIdByDomain(domain: CCTPDomain) {
  const chainId = Object.keys(carrierChainIdCCTPDomainMap).find(
    (key) => carrierChainIdCCTPDomainMap[key as unknown as number] === domain,
  );

  if (!chainId) {
    throw new Error('not a valid domain');
  }

  return parseInt(chainId) as CarrierChainId;
}

export function getCCTPNetworkConfigs(options: { sourceChainId: CarrierChainId; targetChainId: CarrierChainId }) {
  const { sourceChainId, targetChainId } = options;

  const cctpSourceNetworkConfigs = getCCTPNetworkConfigsByChainId({ chainId: sourceChainId });
  const cctpTargetNetworkConfigs = getCCTPNetworkConfigsByChainId({ chainId: targetChainId });

  return cctpSourceNetworkConfigs && cctpTargetNetworkConfigs
    ? { cctpSourceNetworkConfigs, cctpTargetNetworkConfigs }
    : undefined;
}

export function getCCTPNetworkConfigsByChainId(options: { chainId: CarrierChainId }) {
  const { chainId } = options;
  const cctpDomain = carrierChainIdCCTPDomainMap[chainId];
  const cctpNetworkConfigs =
    cctpDomain != null ? cctpSDK.configs.networks.find((item) => item.domain === cctpDomain) : undefined;

  return cctpNetworkConfigs;
}

export function getCCTPMessageData(options: { chainId: CarrierChainId; burnTx: TransactionReceipt }) {
  const { chainId, burnTx } = options;

  const iface = new Interface(tokenMessengerAbi);
  const depositForBurnLog = parseLogs({ iface, logs: burnTx.logs, methodName: 'DepositForBurn' });

  if (depositForBurnLog) {
    const {
      nonce,
      burnToken,
      amount,
      depositor,
      mintRecipient,
      destinationDomain,
      destinationTokenMessenger,
      destinationCaller,
    } = depositForBurnLog.args;
    const [recipent] = defaultAbiCoder.decode(['address'], mintRecipient);

    return {
      originChain: chainId,
      originAddress: burnToken,
      targetChain: getChainIdByDomain(destinationDomain),
      targetAddress: recipent.toString(),
      amount: (amount as BigNumber).toBigInt(),
      sourceDomain: carrierChainIdCCTPDomainMap[chainId],
      targetDomain: destinationDomain,
      nonce: nonce.toNumber(),
      fromAddress: depositor,
    };
  }
}

/**
 * @deprecated this configs only used for the legacy wormhole wrapped cctp
 */
export const CCTPConfigs: {
  [chainId: number]: { wormholeContractAddress: string; usdcAddress: string };
} =
  CLUSTER === 'mainnet'
    ? {
        [CHAIN_ID_ETH]: {
          wormholeContractAddress: '0xAaDA05BD399372f0b0463744C09113c137636f6a',
          usdcAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        },
        [CHAIN_ID_AVAX]: {
          wormholeContractAddress: '0x09fb06a271faff70a651047395aaeb6265265f13',
          usdcAddress: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
        },
        [CHAIN_ID_ARBITRUM]: {
          wormholeContractAddress: '0x2703483b1a5a7c577e8680de9df8be03c6f30e3c',
          usdcAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        },
        [CHAIN_ID_OPTIMISM]: {
          wormholeContractAddress: '0x2703483B1a5a7c577e8680de9Df8Be03c6f30e3c',
          usdcAddress: '0x0b2c639c533813f4aa9d7837caf62653d097ff85',
        },
        [CHAIN_ID_BASE]: {
          wormholeContractAddress: '0x03faBB06Fa052557143dC28eFCFc63FC12843f1D',
          usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        },
      }
    : {
        [CHAIN_ID_ETH]: {
          wormholeContractAddress: '0x0A69146716B3a21622287Efa1607424c663069a4',
          usdcAddress: '0x07865c6E87B9F70255377e024ace6630C1Eaa37F',
        },
        [CHAIN_ID_AVAX]: {
          wormholeContractAddress: '0x58f4c17449c90665891c42e14d34aae7a26a472e',
          usdcAddress: '0x5425890298aed601595a70AB815c96711a31Bc65',
        },
        [CHAIN_ID_ARBITRUM]: {
          wormholeContractAddress: '0x2e8f5e00a9c5d450a72700546b89e2b70dfb00f2',
          usdcAddress: '0xfd064A18f3BF249cf1f87FC203E90D8f650f2d63',
        },
        [CHAIN_ID_OPTIMISM]: {
          wormholeContractAddress: '0x2703483B1a5a7c577e8680de9Df8Be03c6f30e3c',
          usdcAddress: '0xe05606174bac4a6364b31bd0eca4bf4dd368f8c6',
        },
        [CHAIN_ID_BASE]: {
          wormholeContractAddress: '0x2703483B1a5a7c577e8680de9Df8Be03c6f30e3c',
          usdcAddress: '0xf175520c52418dfe19c8098071a252da48cd1c19',
        },
      };
