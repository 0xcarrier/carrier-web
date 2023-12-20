import acalaIcon from '../assets/icons/acala.svg';
import algorandIcon from '../assets/icons/algorand.svg';
import arbitrumIcon from '../assets/icons/arbitrum.svg';
import auroraIcon from '../assets/icons/aurora.svg';
import avaxIcon from '../assets/icons/avax.svg';
import bscIcon from '../assets/icons/bsc.svg';
import celoIcon from '../assets/icons/celo.svg';
import ethIcon from '../assets/icons/eth.svg';
import fantomIcon from '../assets/icons/fantom.svg';
import karuraIcon from '../assets/icons/karura.svg';
import klaytnIcon from '../assets/icons/klaytn.svg';
import moonbeamIcon from '../assets/icons/moonbeam.svg';
import oasisIcon from '../assets/icons/oasis-network-rose-logo.svg';
import polygonIcon from '../assets/icons/polygon.svg';
import solanaIcon from '../assets/icons/solana.svg';
import terraIcon from '../assets/icons/terra.svg';
import optimismIcon from '../assets/icons/optimism.svg';
import hydradxIcon from '../assets/icons/hydradx.svg';
import acalaParachainIcon from '../assets/icons/acala-parachain.svg';
import phalaIcon from '../assets/icons/phala.svg';
import polkadotIcon from '../assets/icons/polkadot.svg';
import mantaIcon from '../assets/icons/manta.svg';
import TokenIconPlaceholder from '../assets/icons/question-mark.svg';
import interlayIcon from '../assets/icons/interlay.svg';
import baseIcon from '../assets/icons/base.svg';
import peaqIcon from '../assets/icons/peaq.svg';

import {
  CHAIN_ID_ACALA,
  CHAIN_ID_ALGORAND,
  CHAIN_ID_APTOS,
  CHAIN_ID_ARBITRUM,
  CHAIN_ID_AURORA,
  CHAIN_ID_AVAX,
  CHAIN_ID_BSC,
  CHAIN_ID_CELO,
  CHAIN_ID_ETH,
  CHAIN_ID_FANTOM,
  CHAIN_ID_KARURA,
  CHAIN_ID_KLAYTN,
  CHAIN_ID_MOONBEAM,
  CHAIN_ID_OASIS,
  CHAIN_ID_POLYGON,
  CHAIN_ID_SOLANA,
  CHAIN_ID_TERRA,
  CONTRACTS,
  ChainId as WormholeChainId,
  coalesceChainName,
  CHAIN_ID_TERRA2,
  WSOL_ADDRESS,
  WSOL_DECIMALS,
  CHAIN_ID_OPTIMISM,
  tryNativeToUint8Array,
  CHAIN_ID_BASE,
} from '@certusone/wormhole-sdk';
import { clusterApiUrl } from '@solana/web3.js';
import sortBy from 'lodash/sortBy';
import BigNumber from 'bignumber.js';
import { getCluster } from './env';
import { isCarrierEVMChain, isCarrierPolkaChain } from './web3Utils';
import { ParachainBridgeType, parseParachainTxHash } from './polkadot';
import { ethers } from 'ethers';

export enum Polkachain {
  MoonbaseBeta = 888,
  MoonbaseAlpha = 1000,
  PeaqAgung = 3013,
  Moonbeam = 2004,
  HydraDX = 2034,
  Phala = 2035,
  Manta = 2104,
  Interlay = 2032,
  // polkadot haven't supportted by wormhole and it's not a parachain so we just give it a mock id in frontend to identify it
  Polkadot = 100000,
}

export type CarrierChainId = WormholeChainId | Polkachain;

export const CLUSTER = getCluster();

export interface ChainInfo {
  id: CarrierChainId;
  name: string;
  logo: string;
}

export const CHAINS: ChainInfo[] = sortBy<ChainInfo>(
  CLUSTER === 'mainnet'
    ? [
        {
          id: CHAIN_ID_ACALA,
          name: 'Acala (EVM+)',
          logo: getChainIcon(CHAIN_ID_ACALA),
        },
        // {
        //   id: CHAIN_ID_AURORA,
        //   name: 'Aurora',
        //   logo: getChainIcon(CHAIN_ID_AURORA),
        // },
        {
          id: CHAIN_ID_AVAX,
          name: 'Avalanche',
          logo: getChainIcon(CHAIN_ID_AVAX),
        },
        {
          id: CHAIN_ID_BSC,
          name: 'BNB Chain',
          logo: getChainIcon(CHAIN_ID_BSC),
        },
        {
          id: CHAIN_ID_CELO,
          name: 'Celo',
          logo: getChainIcon(CHAIN_ID_CELO),
        },
        {
          id: CHAIN_ID_ETH,
          name: 'Ethereum',
          logo: getChainIcon(CHAIN_ID_ETH),
        },
        {
          id: CHAIN_ID_FANTOM,
          name: 'Fantom',
          logo: getChainIcon(CHAIN_ID_FANTOM),
        },
        {
          id: CHAIN_ID_KARURA,
          name: 'Karura (EVM+)',
          logo: getChainIcon(CHAIN_ID_KARURA),
        },
        {
          id: CHAIN_ID_KLAYTN,
          name: 'Klaytn',
          logo: getChainIcon(CHAIN_ID_KLAYTN),
        },
        {
          id: CHAIN_ID_OASIS,
          name: 'Oasis',
          logo: getChainIcon(CHAIN_ID_OASIS),
        },
        {
          id: CHAIN_ID_POLYGON,
          name: 'Polygon',
          logo: getChainIcon(CHAIN_ID_POLYGON),
        },
        {
          id: CHAIN_ID_SOLANA,
          name: 'Solana',
          logo: getChainIcon(CHAIN_ID_SOLANA),
        },
        {
          id: CHAIN_ID_ARBITRUM,
          name: 'Arbitrum',
          logo: getChainIcon(CHAIN_ID_ARBITRUM),
        },
        {
          id: CHAIN_ID_MOONBEAM,
          name: 'Moonbeam',
          logo: getChainIcon(CHAIN_ID_MOONBEAM),
        },
        {
          id: CHAIN_ID_OPTIMISM,
          name: 'Optimism',
          logo: getChainIcon(CHAIN_ID_OPTIMISM),
        },
        {
          id: Polkachain.HydraDX,
          name: 'HydraDX',
          logo: getChainIcon(Polkachain.HydraDX),
        },
        {
          id: Polkachain.Interlay,
          name: 'Interlay',
          logo: getChainIcon(Polkachain.Interlay),
        },
        {
          id: CHAIN_ID_BASE,
          name: 'Base',
          logo: getChainIcon(CHAIN_ID_BASE),
        },
      ]
    : [
        {
          id: CHAIN_ID_ACALA,
          name: 'Acala (EVM+)',
          logo: getChainIcon(CHAIN_ID_ACALA),
        },
        // {
        //   id: CHAIN_ID_AURORA,
        //   name: 'Aurora',
        //   logo: getChainIcon(CHAIN_ID_AURORA),
        // },
        {
          id: CHAIN_ID_AVAX,
          name: 'Avalanche',
          logo: getChainIcon(CHAIN_ID_AVAX),
        },
        {
          id: CHAIN_ID_BSC,
          name: 'BNB Chain',
          logo: getChainIcon(CHAIN_ID_BSC),
        },
        {
          id: CHAIN_ID_CELO,
          name: 'Celo',
          logo: getChainIcon(CHAIN_ID_CELO),
        },
        {
          id: CHAIN_ID_ETH,
          name: 'Ethereum Goerli',
          logo: getChainIcon(CHAIN_ID_ETH),
        },
        {
          id: CHAIN_ID_FANTOM,
          name: 'Fantom',
          logo: getChainIcon(CHAIN_ID_FANTOM),
        },
        {
          id: CHAIN_ID_KARURA,
          name: 'Karura (EVM+)',
          logo: getChainIcon(CHAIN_ID_KARURA),
        },
        {
          id: CHAIN_ID_KLAYTN,
          name: 'Klaytn',
          logo: getChainIcon(CHAIN_ID_KLAYTN),
        },
        {
          id: CHAIN_ID_OASIS,
          name: 'Oasis',
          logo: getChainIcon(CHAIN_ID_OASIS),
        },
        {
          id: CHAIN_ID_POLYGON,
          name: 'Polygon',
          logo: getChainIcon(CHAIN_ID_POLYGON),
        },
        {
          id: CHAIN_ID_SOLANA,
          name: 'Solana',
          logo: getChainIcon(CHAIN_ID_SOLANA),
        },
        {
          id: CHAIN_ID_ARBITRUM,
          name: 'Arbitrum Goerli',
          logo: getChainIcon(CHAIN_ID_ARBITRUM),
        },
        {
          id: CHAIN_ID_MOONBEAM,
          name: 'Moonbase Alpha',
          logo: getChainIcon(CHAIN_ID_MOONBEAM),
        },
        {
          id: CHAIN_ID_OPTIMISM,
          name: 'Optimism Goerli',
          logo: getChainIcon(CHAIN_ID_OPTIMISM),
        },
        {
          id: Polkachain.HydraDX,
          name: 'HydraDX Moonbase',
          logo: getChainIcon(Polkachain.HydraDX),
        },
        {
          id: Polkachain.Manta,
          name: 'Manta Moonbase',
          logo: getChainIcon(Polkachain.Manta),
        },
        {
          id: Polkachain.Interlay,
          name: 'Interlay Moonbase',
          logo: getChainIcon(Polkachain.Interlay),
        },
        {
          id: CHAIN_ID_BASE,
          name: 'Base',
          logo: getChainIcon(CHAIN_ID_BASE),
        },
        {
          id: Polkachain.PeaqAgung,
          name: 'Peaq Agung',
          logo: getChainIcon(Polkachain.PeaqAgung),
        },
      ],
  ['name'],
);

export const TokenBridgeChains = CHAINS;
export const NFTBridgeChains = CHAINS.filter(
  (item) =>
    item.id !== Polkachain.HydraDX &&
    item.id !== Polkachain.MoonbaseAlpha &&
    item.id !== Polkachain.Moonbeam &&
    item.id !== Polkachain.Phala &&
    item.id !== Polkachain.Manta &&
    item.id !== Polkachain.MoonbaseBeta &&
    item.id !== Polkachain.Interlay &&
    item.id !== Polkachain.Polkadot &&
    item.id !== Polkachain.PeaqAgung,
);
export const SwapChains = CHAINS.filter(
  (item) =>
    item.id !== Polkachain.HydraDX &&
    item.id !== Polkachain.MoonbaseAlpha &&
    item.id !== Polkachain.Moonbeam &&
    item.id !== Polkachain.Phala &&
    item.id !== Polkachain.Manta &&
    item.id !== Polkachain.MoonbaseBeta &&
    item.id !== Polkachain.Interlay &&
    item.id !== Polkachain.Polkadot &&
    item.id !== CHAIN_ID_SOLANA &&
    item.id !== Polkachain.PeaqAgung,
);

//not used yet
// export const GURU2FA_CHAINS_WITH_NFT_SUPPORT = CHAINS.filter(
//   ({ id }) => id === CHAIN_ID_BSC || id === CHAIN_ID_POLYGON
// );
export type ChainsById = { [key in CarrierChainId]: ChainInfo };
export const CHAINS_BY_ID: ChainsById = CHAINS.reduce((obj, chain) => {
  obj[chain.id] = chain;
  return obj;
}, {} as ChainsById);

export const COMING_SOON_CHAINS: ChainInfo[] = [];

export function getChainIcon(chainId: CarrierChainId) {
  return chainId === CHAIN_ID_SOLANA
    ? solanaIcon
    : chainId === CHAIN_ID_ETH
    ? ethIcon
    : chainId === CHAIN_ID_BSC
    ? bscIcon
    : chainId === CHAIN_ID_TERRA
    ? terraIcon
    : chainId === CHAIN_ID_POLYGON
    ? polygonIcon
    : chainId === CHAIN_ID_AVAX
    ? avaxIcon
    : chainId === CHAIN_ID_OASIS
    ? oasisIcon
    : chainId === CHAIN_ID_ALGORAND
    ? algorandIcon
    : chainId === CHAIN_ID_AURORA
    ? auroraIcon
    : chainId === CHAIN_ID_FANTOM
    ? fantomIcon
    : chainId === CHAIN_ID_KARURA
    ? karuraIcon
    : chainId === CHAIN_ID_ACALA
    ? acalaIcon
    : chainId === CHAIN_ID_KLAYTN
    ? klaytnIcon
    : chainId === CHAIN_ID_CELO
    ? celoIcon
    : chainId === CHAIN_ID_MOONBEAM
    ? moonbeamIcon
    : chainId === CHAIN_ID_ARBITRUM
    ? arbitrumIcon
    : chainId === CHAIN_ID_OPTIMISM
    ? optimismIcon
    : chainId === CHAIN_ID_BASE
    ? baseIcon
    : chainId === Polkachain.HydraDX
    ? hydradxIcon
    : chainId === Polkachain.PeaqAgung
    ? peaqIcon
    : chainId === Polkachain.Phala
    ? phalaIcon
    : chainId === Polkachain.Manta
    ? mantaIcon
    : chainId === Polkachain.Polkadot
    ? polkadotIcon
    : chainId === Polkachain.Interlay
    ? interlayIcon
    : TokenIconPlaceholder;
}

export const getDefaultNativeCurrencySymbol = (chainId: CarrierChainId) =>
  chainId === CHAIN_ID_SOLANA
    ? 'SOL'
    : chainId === CHAIN_ID_ETH
    ? 'ETH'
    : chainId === CHAIN_ID_BSC
    ? 'BNB'
    : chainId === CHAIN_ID_TERRA
    ? 'LUNC'
    : chainId === CHAIN_ID_POLYGON
    ? 'MATIC'
    : chainId === CHAIN_ID_AVAX
    ? 'AVAX'
    : chainId === CHAIN_ID_OASIS
    ? 'ROSE'
    : chainId === CHAIN_ID_ALGORAND
    ? 'ALGO'
    : chainId === CHAIN_ID_AURORA
    ? 'ETH'
    : chainId === CHAIN_ID_FANTOM
    ? 'FTM'
    : chainId === CHAIN_ID_KARURA
    ? 'KAR'
    : chainId === CHAIN_ID_ACALA
    ? 'ACA'
    : chainId === CHAIN_ID_KLAYTN
    ? 'KLAY'
    : chainId === CHAIN_ID_CELO
    ? 'CELO'
    : chainId === CHAIN_ID_MOONBEAM
    ? 'GLMR'
    : chainId === CHAIN_ID_ARBITRUM
    ? 'ETH'
    : chainId === CHAIN_ID_OPTIMISM
    ? 'OP'
    : chainId === CHAIN_ID_BASE
    ? 'ETH'
    : chainId === Polkachain.HydraDX
    ? 'HDX'
    : chainId === Polkachain.PeaqAgung
    ? 'AGNG'
    : chainId === Polkachain.Phala
    ? 'PHA'
    : chainId === Polkachain.Manta
    ? 'MANTA'
    : chainId === Polkachain.Interlay
    ? 'Interlay'
    : chainId === Polkachain.MoonbaseBeta
    ? 'DEV'
    : chainId === Polkachain.Polkadot
    ? 'DOT'
    : '';

export function getDefaultNativeCurrencyLogo(chainId: CarrierChainId) {
  return chainId === CHAIN_ID_SOLANA
    ? solanaIcon
    : chainId === CHAIN_ID_ETH
    ? ethIcon
    : chainId === CHAIN_ID_BSC
    ? bscIcon
    : chainId === CHAIN_ID_TERRA
    ? terraIcon
    : chainId === CHAIN_ID_POLYGON
    ? polygonIcon
    : chainId === CHAIN_ID_AVAX
    ? avaxIcon
    : chainId === CHAIN_ID_OASIS
    ? oasisIcon
    : chainId === CHAIN_ID_ALGORAND
    ? algorandIcon
    : chainId === CHAIN_ID_AURORA
    ? ethIcon
    : chainId === CHAIN_ID_FANTOM
    ? fantomIcon
    : chainId === CHAIN_ID_KARURA
    ? karuraIcon
    : chainId === CHAIN_ID_ACALA
    ? acalaIcon
    : chainId === CHAIN_ID_KLAYTN
    ? klaytnIcon
    : chainId === CHAIN_ID_CELO
    ? celoIcon
    : chainId === CHAIN_ID_MOONBEAM
    ? moonbeamIcon
    : chainId === CHAIN_ID_ARBITRUM
    ? ethIcon
    : chainId === CHAIN_ID_OPTIMISM
    ? optimismIcon
    : chainId === CHAIN_ID_BASE
    ? ethIcon
    : chainId === Polkachain.HydraDX
    ? hydradxIcon
    : chainId === Polkachain.PeaqAgung
    ? peaqIcon
    : chainId === Polkachain.Phala
    ? phalaIcon
    : chainId === Polkachain.Polkadot
    ? polkadotIcon
    : chainId === Polkachain.Manta
    ? mantaIcon
    : chainId === Polkachain.Interlay
    ? interlayIcon
    : TokenIconPlaceholder;
}

export const getDefaultNativeCurrencyAddress = (chainId: CarrierChainId) => {
  return chainId === CHAIN_ID_SOLANA
    ? WSOL_ADDRESS
    : chainId === CHAIN_ID_ETH
    ? WETH_ADDRESS
    : chainId === CHAIN_ID_ARBITRUM
    ? WETH_ARBITRUM_ADDRESS
    : chainId === CHAIN_ID_BSC
    ? WBNB_ADDRESS
    : chainId === CHAIN_ID_POLYGON
    ? WMATIC_ADDRESS
    : chainId === CHAIN_ID_AVAX
    ? WAVAX_ADDRESS
    : chainId === CHAIN_ID_OASIS
    ? WROSE_ADDRESS
    : chainId === CHAIN_ID_FANTOM
    ? WFTM_ADDRESS
    : chainId === CHAIN_ID_ACALA
    ? ACA_ADDRESS
    : chainId === CHAIN_ID_KARURA
    ? KAR_ADDRESS
    : chainId === CHAIN_ID_KLAYTN
    ? WKLAY_ADDRESS
    : chainId === CHAIN_ID_CELO
    ? CELO_ADDRESS
    : chainId === CHAIN_ID_MOONBEAM
    ? MOONBEAM_ADDRESS
    : chainId === CHAIN_ID_BASE
    ? WETH_BASE_ADDRESS
    : // parachains doesn't have any wrapped token
    chainId === Polkachain.HydraDX
    ? HDX_ADDRESS_ON_MOONBEAM
    : chainId === Polkachain.PeaqAgung
    ? AGUNG_ADDRESS_ON_MOONBEAM
    : chainId === Polkachain.Phala
    ? PHA_ADDRESS_ON_MOONBEAM
    : chainId === Polkachain.Manta
    ? MANTA_ADDRESS_ON_MOONBEAM
    : chainId === Polkachain.Polkadot
    ? DOT_ADDRESS_ON_MOONBEAM
    : chainId === Polkachain.Interlay
    ? INTR_ADDRESS_ON_MOONBEAM
    : '';
};

export const isDefaultCurrencyIsNativeCurrency = (chainId: CarrierChainId) => {
  return chainId === CHAIN_ID_SOLANA
    ? true
    : chainId === CHAIN_ID_ETH
    ? true
    : chainId === CHAIN_ID_ARBITRUM
    ? true
    : chainId === CHAIN_ID_BSC
    ? true
    : chainId === CHAIN_ID_POLYGON
    ? true
    : chainId === CHAIN_ID_AVAX
    ? true
    : chainId === CHAIN_ID_OASIS
    ? true
    : chainId === CHAIN_ID_FANTOM
    ? true
    : chainId === CHAIN_ID_ACALA
    ? false
    : chainId === CHAIN_ID_KARURA
    ? false
    : chainId === CHAIN_ID_KLAYTN
    ? true
    : chainId === CHAIN_ID_CELO
    ? false
    : chainId === CHAIN_ID_MOONBEAM
    ? true
    : chainId === CHAIN_ID_BASE
    ? true
    : false;
};

export const getExplorerName = (chainId: CarrierChainId) =>
  chainId === CHAIN_ID_ETH
    ? 'Etherscan'
    : chainId === CHAIN_ID_ACALA
    ? 'Acala Subscan'
    : chainId === CHAIN_ID_BSC
    ? 'BscScan'
    : chainId === CHAIN_ID_TERRA
    ? 'Finder'
    : chainId === CHAIN_ID_POLYGON
    ? 'Polygonscan'
    : chainId === CHAIN_ID_AVAX
    ? 'Snowtrace'
    : chainId === CHAIN_ID_ALGORAND
    ? 'AlgoExplorer'
    : chainId === CHAIN_ID_FANTOM
    ? 'FTMScan'
    : chainId === CHAIN_ID_KLAYTN
    ? 'Klaytnscope'
    : chainId === CHAIN_ID_SOLANA
    ? 'Solscan'
    : chainId === CHAIN_ID_CELO
    ? 'Celo Explorer'
    : chainId === CHAIN_ID_MOONBEAM
    ? 'Moonscan'
    : chainId === CHAIN_ID_ARBITRUM
    ? 'Arbiscan'
    : chainId === CHAIN_ID_OPTIMISM
    ? 'Optimism Etherscan'
    : chainId === CHAIN_ID_BASE
    ? 'Basescan'
    : chainId === CHAIN_ID_KARURA
    ? 'Karura Explorer'
    : chainId === Polkachain.HydraDX
    ? 'HydraDX Portal'
    : chainId === Polkachain.PeaqAgung
    ? 'Agung Portal'
    : chainId === Polkachain.Phala
    ? 'Phala Subscan'
    : chainId === Polkachain.Manta
    ? 'Manta Portal'
    : chainId === Polkachain.Interlay
    ? 'Interlay Portal'
    : chainId === Polkachain.Polkadot
    ? 'Polkadot Subscan'
    : 'Explorer';

export const getExplorerTxAddress = (chainId: CarrierChainId, txId: string) => {
  const parachainParams = isCarrierPolkaChain(chainId) ? parseParachainTxHash(txId) : undefined;

  return chainId === CHAIN_ID_ETH
    ? `https://${CLUSTER === 'testnet' ? 'goerli.' : ''}etherscan.io/tx/${txId}`
    : chainId === CHAIN_ID_BSC
    ? `https://${CLUSTER === 'testnet' ? 'testnet.' : ''}bscscan.com/tx/${txId}`
    : chainId === CHAIN_ID_POLYGON
    ? `https://${CLUSTER === 'testnet' ? 'mumbai.' : ''}polygonscan.com/tx/${txId}`
    : chainId === CHAIN_ID_AVAX
    ? `https://${CLUSTER === 'testnet' ? 'testnet.' : ''}snowtrace.io/tx/${txId}`
    : chainId === CHAIN_ID_OASIS
    ? `https://${CLUSTER === 'testnet' ? 'testnet.' : ''}explorer.emerald.oasis.dev/tx/${txId}`
    : chainId === CHAIN_ID_AURORA
    ? `https://${CLUSTER === 'testnet' ? 'testnet.' : ''}aurorascan.dev/tx/${txId}`
    : chainId === CHAIN_ID_FANTOM
    ? `https://${CLUSTER === 'testnet' ? 'testnet.' : ''}ftmscan.com/tx/${txId}`
    : chainId === CHAIN_ID_KLAYTN
    ? `https://${CLUSTER === 'testnet' ? 'baobab.' : ''}scope.klaytn.com/tx/${txId}`
    : chainId === CHAIN_ID_CELO
    ? `https://${CLUSTER === 'testnet' ? 'alfajores.celoscan.io' : 'explorer.celo.org'}/tx/${txId}`
    : chainId === CHAIN_ID_KARURA
    ? `https://${
        CLUSTER === 'testnet' ? 'blockscout.karura-testnet.aca-staging.network' : 'blockscout.karura.network'
      }/tx/${txId}`
    : chainId === CHAIN_ID_ACALA
    ? `https://${
        CLUSTER === 'testnet' ? 'blockscout.acala-dev.aca-dev.network' : 'blockscout.acala.network'
      }/tx/${txId}`
    : chainId === CHAIN_ID_MOONBEAM
    ? `https://${CLUSTER === 'testnet' ? 'moonbase.' : ''}moonscan.io/tx/${txId}`
    : chainId === CHAIN_ID_SOLANA
    ? `https://solscan.io/tx/${txId}${CLUSTER === 'testnet' ? '?cluster=devnet' : ''}`
    : chainId === CHAIN_ID_TERRA2
    ? `https://finder.terra.money/${CLUSTER === 'testnet' ? 'pisco-1' : 'phoenix-1'}/tx/${txId}`
    : chainId === CHAIN_ID_ALGORAND
    ? `https://${CLUSTER === 'testnet' ? 'testnet.' : ''}algoexplorer.io/tx/${txId}`
    : chainId === CHAIN_ID_ARBITRUM
    ? `https://${CLUSTER === 'testnet' ? 'goerli.' : ''}arbiscan.io/tx/${txId}`
    : chainId === CHAIN_ID_APTOS
    ? `https://explorer.aptoslabs.com/txn/${txId}${CLUSTER === 'testnet' ? '?network=testnet' : ''}`
    : chainId === CHAIN_ID_OPTIMISM
    ? `https://${CLUSTER === 'testnet' ? 'goerli-optimism.' : 'optimistic.'}etherscan.io/tx/${txId}`
    : chainId === CHAIN_ID_BASE
    ? `https://${CLUSTER === 'testnet' ? 'goerli.' : ''}basescan.org/tx/${txId}`
    : chainId === Polkachain.HydraDX &&
      parachainParams?.bridgeType === ParachainBridgeType.MRL &&
      'parachainBlockHash' in parachainParams
    ? CLUSTER === 'mainnet'
      ? `https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Frpc.hydradx.cloud#/explorer/query/${parachainParams.parachainBlockHash}`
      : `https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fhydradx-moonbase-rpc.play.hydration.cloud#/explorer/query/${parachainParams.parachainBlockHash}`
    : chainId === Polkachain.HydraDX &&
      parachainParams?.bridgeType === ParachainBridgeType.XCM &&
      'sourceParachainId' in parachainParams &&
      parachainParams.sourceParachainId === chainId
    ? CLUSTER === 'mainnet'
      ? `https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Frpc.hydradx.cloud#/explorer/query/${parachainParams.sourceParachainBlockHash}`
      : `https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fhydradx-moonbase-rpc.play.hydration.cloud#/explorer/query/${parachainParams.sourceParachainBlockHash}`
    : chainId === Polkachain.HydraDX &&
      parachainParams?.bridgeType === ParachainBridgeType.XCM &&
      'targetParachainId' in parachainParams &&
      parachainParams.targetParachainId === chainId
    ? CLUSTER === 'mainnet'
      ? `https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Frpc.hydradx.cloud#/explorer/query/${parachainParams.targetParachainBlockHash}`
      : `https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fhydradx-moonbase-rpc.play.hydration.cloud#/explorer/query/${parachainParams.targetParachainBlockHash}`
    : chainId === Polkachain.Interlay &&
      parachainParams?.bridgeType === ParachainBridgeType.MRL &&
      'parachainBlockHash' in parachainParams
    ? CLUSTER === 'mainnet'
      ? `https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Finterlay-rpc.dwellir.com#/explorer/query/${parachainParams.parachainBlockHash}`
      : `https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Finterlay-moonbeam-alphanet.interlay.io%2Fparachain#/explorer/query/${parachainParams.parachainBlockHash}`
    : chainId === Polkachain.Interlay &&
      parachainParams?.bridgeType === ParachainBridgeType.XCM &&
      'sourceParachainId' in parachainParams &&
      parachainParams.sourceParachainId === chainId
    ? CLUSTER === 'mainnet'
      ? `https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Finterlay-rpc.dwellir.com#/explorer/query/${parachainParams.sourceParachainBlockHash}`
      : `https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Finterlay-moonbeam-alphanet.interlay.io%2Fparachain#/explorer/query/${parachainParams.sourceParachainBlockHash}`
    : chainId === Polkachain.Interlay &&
      parachainParams?.bridgeType === ParachainBridgeType.XCM &&
      'targetParachainId' in parachainParams &&
      parachainParams.targetParachainId === chainId
    ? CLUSTER === 'mainnet'
      ? `https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Finterlay-rpc.dwellir.com#/explorer/query/${parachainParams.targetParachainBlockHash}`
      : `https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Finterlay-moonbeam-alphanet.interlay.io%2Fparachain#/explorer/query/${parachainParams.targetParachainBlockHash}`
    : chainId === Polkachain.Manta &&
      parachainParams?.bridgeType === ParachainBridgeType.MRL &&
      'parachainBlockHash' in parachainParams
    ? CLUSTER === 'mainnet'
      ? `https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fws.manta.systems#/explorer/query/${parachainParams.parachainBlockHash}`
      : `https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fc1.manta.moonsea.systems#/explorer/query/${parachainParams.parachainBlockHash}`
    : chainId === Polkachain.Manta &&
      parachainParams?.bridgeType === ParachainBridgeType.XCM &&
      'sourceParachainId' in parachainParams &&
      parachainParams.sourceParachainId === chainId
    ? CLUSTER === 'mainnet'
      ? `https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fws.manta.systems#/explorer/query/${parachainParams.sourceParachainBlockHash}`
      : `https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fc1.manta.moonsea.systems#/explorer/query/${parachainParams.sourceParachainBlockHash}`
    : chainId === Polkachain.Manta &&
      parachainParams?.bridgeType === ParachainBridgeType.XCM &&
      'targetParachainId' in parachainParams &&
      parachainParams.targetParachainId === chainId
    ? CLUSTER === 'mainnet'
      ? `https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fws.manta.systems#/explorer/query/${parachainParams.targetParachainBlockHash}`
      : `https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fc1.manta.moonsea.systems#/explorer/query/${parachainParams.targetParachainBlockHash}`
    : chainId === Polkachain.PeaqAgung &&
      parachainParams?.bridgeType === ParachainBridgeType.MRL &&
      'parachainBlockHash' in parachainParams
    ? CLUSTER === 'mainnet'
      ? `https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fmoonbeam.peaq.network#/explorer/query/${parachainParams.parachainBlockHash}`
      : `https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fmoonbeam.peaq.network#/explorer/query/${parachainParams.parachainBlockHash}`
    : chainId === Polkachain.PeaqAgung &&
      parachainParams?.bridgeType === ParachainBridgeType.XCM &&
      'sourceParachainId' in parachainParams &&
      parachainParams.sourceParachainId === chainId
    ? CLUSTER === 'mainnet'
      ? `https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fmoonbeam.peaq.network#/explorer/query/${parachainParams.sourceParachainBlockHash}`
      : `https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fmoonbeam.peaq.network#/explorer/query/${parachainParams.sourceParachainBlockHash}`
    : chainId === Polkachain.PeaqAgung &&
      parachainParams?.bridgeType === ParachainBridgeType.XCM &&
      'targetParachainId' in parachainParams &&
      parachainParams.targetParachainId === chainId
    ? CLUSTER === 'mainnet'
      ? `https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fmoonbeam.peaq.network#/explorer/query/${parachainParams.targetParachainBlockHash}`
      : `https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fmoonbeam.peaq.network#/explorer/query/${parachainParams.targetParachainBlockHash}`
    : undefined;
};

export const getExplorerTokenContractURL = (chainId: CarrierChainId, contractAddress: string) =>
  chainId === CHAIN_ID_ETH
    ? `https://${CLUSTER === 'testnet' ? 'goerli.' : ''}etherscan.io/address/${contractAddress}`
    : chainId === CHAIN_ID_BSC
    ? `https://${CLUSTER === 'testnet' ? 'testnet.' : ''}bscscan.com/address/${contractAddress}`
    : chainId === CHAIN_ID_POLYGON
    ? `https://${CLUSTER === 'testnet' ? 'mumbai.' : ''}polygonscan.com/address/${contractAddress}`
    : chainId === CHAIN_ID_AVAX
    ? `https://${CLUSTER === 'testnet' ? 'testnet.' : ''}snowtrace.io/address/${contractAddress}`
    : chainId === CHAIN_ID_OASIS
    ? `https://${CLUSTER === 'testnet' ? 'testnet.' : ''}explorer.emerald.oasis.dev/address/${contractAddress}`
    : chainId === CHAIN_ID_AURORA
    ? `https://${CLUSTER === 'testnet' ? 'testnet.' : ''}aurorascan.dev/address/${contractAddress}`
    : chainId === CHAIN_ID_FANTOM
    ? `https://${CLUSTER === 'testnet' ? 'testnet.' : ''}ftmscan.com/address/${contractAddress}`
    : chainId === CHAIN_ID_KLAYTN
    ? `https://${CLUSTER === 'testnet' ? 'baobab.' : ''}scope.klaytn.com/account/${contractAddress}`
    : chainId === CHAIN_ID_CELO
    ? `https://explorer.celo.org${CLUSTER === 'testnet' ? '/alfajores' : ''}/address/${contractAddress}`
    : chainId === CHAIN_ID_KARURA
    ? `https://${
        CLUSTER === 'testnet' ? 'blockscout.karura-testnet.aca-staging.network' : 'blockscout.karura.network'
      }/address/${contractAddress}`
    : chainId === CHAIN_ID_ACALA
    ? `https://${
        CLUSTER === 'testnet' ? 'blockscout.acala-dev.aca-dev.network' : 'blockscout.acala.network'
      }/address/${contractAddress}`
    : chainId === CHAIN_ID_MOONBEAM
    ? `https://${CLUSTER === 'testnet' ? 'moonbase.' : ''}moonscan.io/address/${contractAddress}`
    : chainId === CHAIN_ID_SOLANA
    ? `https://solscan.io/token/${contractAddress}${CLUSTER === 'testnet' ? '?cluster=devnet' : ''}`
    : chainId === CHAIN_ID_TERRA2
    ? `https://finder.terra.money/${CLUSTER === 'testnet' ? 'pisco-1' : 'phoenix-1'}/address/${contractAddress}`
    : chainId === CHAIN_ID_ALGORAND
    ? `https://${CLUSTER === 'testnet' ? 'testnet.' : ''}algoexplorer.io/address/${contractAddress}`
    : chainId === CHAIN_ID_ARBITRUM
    ? `https://${CLUSTER === 'testnet' ? 'goerli.' : ''}arbiscan.io/address/${contractAddress}`
    : chainId === CHAIN_ID_APTOS
    ? `https://explorer.aptoslabs.com/account/${contractAddress}${CLUSTER === 'testnet' ? '?network=testnet' : ''}`
    : chainId === CHAIN_ID_OPTIMISM
    ? `https://${CLUSTER === 'testnet' ? 'goerli-optimism.' : 'optimistic.'}etherscan.io/address/${contractAddress}`
    : chainId === CHAIN_ID_BASE
    ? `https://${CLUSTER === 'testnet' ? 'goerli.' : ''}etherscan.io/address/${contractAddress}`
    : chainId === Polkachain.Manta
    ? `https://polkadot.js.org/apps/?rpc=${encodeURIComponent(RPC_URLS[CLUSTER][chainId])}#/assets`
    : undefined;

// prev mainnet: https://wormhole-v2-mainnet-api.certus.one
// prev testnet: https://wormhole-v2-testnet-api.certus.one
export const GUARDIANS_SERVER =
  CLUSTER === 'mainnet'
    ? 'https://1rpc.io/wormhole'
    : CLUSTER === 'testnet'
    ? 'https://alpha.1rpc.io/wormhole'
    : 'https://localhost:28001';

export const TXN_INDEXER =
  CLUSTER === 'mainnet'
    ? process.env.MAINNET_TXN_INDEXER !== undefined
      ? process.env.MAINNET_TXN_INDEXER
      : 'https://carrier-indexer.ata.network'
    : CLUSTER === 'testnet'
    ? process.env.TESTNET_TXN_INDEXER !== undefined
      ? process.env.TESTNET_TXN_INDEXER
      : 'https://carrier-indexer-staging.ata.network'
    : 'http://localhost:27001';

export const ETH_NETWORK_CHAIN_ID = CLUSTER === 'mainnet' ? 1 : CLUSTER === 'testnet' ? 5 : 0;
export const BSC_NETWORK_CHAIN_ID = CLUSTER === 'mainnet' ? 56 : CLUSTER === 'testnet' ? 97 : 0;
export const POLYGON_NETWORK_CHAIN_ID = CLUSTER === 'mainnet' ? 137 : CLUSTER === 'testnet' ? 80001 : 0;
export const AVAX_NETWORK_CHAIN_ID = CLUSTER === 'mainnet' ? 43114 : CLUSTER === 'testnet' ? 43113 : 0;
export const OASIS_NETWORK_CHAIN_ID = CLUSTER === 'mainnet' ? 42262 : CLUSTER === 'testnet' ? 42261 : 0;
export const AURORA_NETWORK_CHAIN_ID = CLUSTER === 'mainnet' ? 1313161554 : CLUSTER === 'testnet' ? 1313161555 : 0;
export const FANTOM_NETWORK_CHAIN_ID = CLUSTER === 'mainnet' ? 250 : CLUSTER === 'testnet' ? 4002 : 0;
export const KARURA_NETWORK_CHAIN_ID = CLUSTER === 'mainnet' ? 686 : CLUSTER === 'testnet' ? 596 : 0;
export const ACALA_NETWORK_CHAIN_ID = CLUSTER === 'mainnet' ? 787 : CLUSTER === 'testnet' ? 597 : 0;
export const KLAYTN_NETWORK_CHAIN_ID = CLUSTER === 'mainnet' ? 8217 : CLUSTER === 'testnet' ? 1001 : 0;
export const CELO_NETWORK_CHAIN_ID = CLUSTER === 'mainnet' ? 42220 : CLUSTER === 'testnet' ? 44787 : 0;
export const MOONBEAM_NETWORK_CHAIN_ID = CLUSTER === 'mainnet' ? 1284 : CLUSTER === 'testnet' ? 1287 : 0;
export const ARBITRUM_NETWORK_CHAIN_ID = CLUSTER === 'mainnet' ? 42161 : CLUSTER === 'testnet' ? 421613 : 0;
export const OPTIMISM_NETWORK_CHAIN_ID = CLUSTER === 'mainnet' ? 10 : CLUSTER === 'testnet' ? 420 : 0;
export const BASE_NETWORK_CHAIN_ID = CLUSTER === 'mainnet' ? 8453 : CLUSTER === 'testnet' ? 84531 : 0;

export const SOLANA_HOST =
  CLUSTER === 'mainnet'
    ? process.env.MAINNET_SOLANA_API_URL
      ? process.env.MAINNET_SOLANA_API_URL
      : clusterApiUrl('mainnet-beta')
    : CLUSTER === 'testnet'
    ? process.env.TESTNET_SOLANA_API_URL
      ? process.env.TESTNET_SOLANA_API_URL
      : clusterApiUrl('devnet')
    : 'http://localhost:8899';

export const SOL_BRIDGE_ADDRESS =
  CONTRACTS[CLUSTER === 'mainnet' ? 'MAINNET' : CLUSTER === 'testnet' ? 'TESTNET' : 'DEVNET'].solana.core;

export const SOL_NFT_BRIDGE_ADDRESS =
  CONTRACTS[CLUSTER === 'mainnet' ? 'MAINNET' : CLUSTER === 'testnet' ? 'TESTNET' : 'DEVNET'].solana.nft_bridge;

export const SOL_TOKEN_BRIDGE_ADDRESS =
  CONTRACTS[CLUSTER === 'mainnet' ? 'MAINNET' : CLUSTER === 'testnet' ? 'TESTNET' : 'DEVNET'].solana.token_bridge;

export const SOL_CUSTODY_ADDRESS = 'GugU1tP7doLeTw9hQP51xRJyS8Da1fWxuiy2rVrnMD2m';
export const SOL_NFT_CUSTODY_ADDRESS = 'D63bhHo634eXSj4Jq3xgu2fjB5XKc8DFHzDY9iZk7fv1';
export const TERRA_BRIDGE_ADDRESS =
  CLUSTER === 'mainnet'
    ? 'terra1dq03ugtd40zu9hcgdzrsq6z2z4hwhc9tqk2uy5'
    : CLUSTER === 'testnet'
    ? 'terra1pd65m0q9tl3v8znnz5f5ltsfegyzah7g42cx5v'
    : 'terra18vd8fpwxzck93qlwghaj6arh4p7c5n896xzem5';
export const TERRA_TOKEN_BRIDGE_ADDRESS =
  CLUSTER === 'mainnet'
    ? 'terra10nmmwe8r3g99a9newtqa7a75xfgs2e8z87r2sf'
    : CLUSTER === 'testnet'
    ? 'terra1pseddrv0yfsn76u4zxrjmtf45kdlmalswdv39a'
    : 'terra10pyejy66429refv3g35g2t7am0was7ya7kz2a4';
export const ALGORAND_BRIDGE_ID = BigInt(CLUSTER === 'mainnet' ? '0' : CLUSTER === 'testnet' ? '86525623' : '4');
export const ALGORAND_TOKEN_BRIDGE_ID = BigInt(CLUSTER === 'mainnet' ? '0' : CLUSTER === 'testnet' ? '86525641' : '6');
export const ALGORAND_WAIT_FOR_CONFIRMATIONS = CLUSTER === 'mainnet' ? 4 : CLUSTER === 'testnet' ? 4 : 1;

export const getBridgeAddressForChain = (chainId: CarrierChainId) =>
  CONTRACTS[CLUSTER === 'mainnet' ? 'MAINNET' : CLUSTER === 'testnet' ? 'TESTNET' : 'DEVNET'][
    coalesceChainName(chainId as WormholeChainId)
  ].core || '';

export const getNFTBridgeAddressForChain = (chainId: CarrierChainId) =>
  CONTRACTS[CLUSTER === 'mainnet' ? 'MAINNET' : CLUSTER === 'testnet' ? 'TESTNET' : 'DEVNET'][
    coalesceChainName(chainId as WormholeChainId)
  ].nft_bridge || '';

export const getTokenBridgeAddressForChain = (chainId: CarrierChainId) =>
  CONTRACTS[CLUSTER === 'mainnet' ? 'MAINNET' : CLUSTER === 'testnet' ? 'TESTNET' : 'DEVNET'][
    coalesceChainName(chainId as WormholeChainId)
  ].token_bridge || '';

export const COVALENT_API_KEY = process.env.COVALENT_KEY ? process.env.COVALENT_KEY : '';
export const ASSET_SERVICE_KEY = process.env.ASSET_SERVICE_KEY ? process.env.ASSET_SERVICE_KEY : '';

// we just use asset service on staging test env, don't use it on production env.
// and for now it just support the eth goerli
export const ASSET_SERVICE_GET_TOKENS_URL = (
  chainId: CarrierChainId,
  walletAddress: string,
  nft?: boolean,
  noNftMetadata?: boolean,
) => {
  if (chainId === CHAIN_ID_ETH && CLUSTER !== 'mainnet' && ASSET_SERVICE_KEY) {
    const evmChainId = wormholeChainToEvmChain[chainId];

    return evmChainId
      ? `https://asset-indexer.ata.network/v1/${evmChainId}/address/${walletAddress}/balances_v2/?key=${ASSET_SERVICE_KEY}${
          nft ? '&nft=true' : ''
        }${noNftMetadata ? '&no-nft-fetch=true' : ''}`
      : '';
  }
};

export const COVALENT_GET_TOKENS_URL = (
  chainId: CarrierChainId,
  walletAddress: string,
  nft?: boolean,
  noNftMetadata?: boolean,
) => {
  let covalentChainNum = '';

  if (
    chainId === CHAIN_ID_SOLANA ||
    chainId === CHAIN_ID_ACALA ||
    chainId === CHAIN_ID_ALGORAND ||
    chainId === CHAIN_ID_CELO ||
    (chainId === CHAIN_ID_OASIS && CLUSTER !== 'mainnet') ||
    chainId === CHAIN_ID_KARURA ||
    chainId === CHAIN_ID_KLAYTN
  ) {
    // networks; not supported by covalent
    // don't need to get the real chain id
  } else if (isCarrierEVMChain(chainId)) {
    covalentChainNum = wormholeChainToEvmChain[chainId]?.toString() || '';
  }

  // https://www.covalenthq.com/docs/api/#get-/v1/{chain_id}/address/{address}/balances_v2/
  return covalentChainNum
    ? `https://api.covalenthq.com/v1/${covalentChainNum}/address/${walletAddress}/balances_v2/?key=${COVALENT_API_KEY}${
        nft ? '&nft=true' : ''
      }${noNftMetadata ? '&no-nft-fetch=true' : ''}`
    : '';
};

export const BLOCKSCOUT_GET_TOKENS_URL = (chainId: CarrierChainId, walletAddress: string) => {
  const baseUrl =
    // chainId === CHAIN_ID_OASIS // cross origin error
    //   ? CLUSTER === 'mainnet'
    //     ? 'https://explorer.emerald.oasis.dev'
    //     : CLUSTER === 'testnet'
    //     ? 'https://testnet.explorer.emerald.oasis.dev'
    //     : '' :
    // chainId === CHAIN_ID_AURORA // can support by covalent
    //   ? CLUSTER === 'mainnet'
    //     ? 'https://explorer.mainnet.aurora.dev'
    //     : CLUSTER === 'testnet'
    //     ? 'https://explorer.testnet.aurora.dev'
    //     : '':
    chainId === CHAIN_ID_ACALA // can work
      ? CLUSTER === 'mainnet'
        ? 'https://blockscout.acala.network'
        : CLUSTER === 'testnet'
        ? 'https://blockscout.acala-dev.aca-dev.network'
        : ''
      : chainId === CHAIN_ID_KARURA // can work
      ? CLUSTER === 'mainnet'
        ? 'https://blockscout.karura.network'
        : CLUSTER === 'testnet'
        ? 'https://blockscout.karura-testnet.aca-staging.network'
        : ''
      : // : chainId === CHAIN_ID_CELO // cross origin error
        // ? CLUSTER === 'mainnet'
        //   ? 'https://explorer.celo.org'
        //   : CLUSTER === 'testnet'
        //   ? 'https://alfajores-blockscout.celo-testnet.org'
        //   : ''
        '';
  return baseUrl ? `${baseUrl}/api?module=account&action=tokenlist&address=${walletAddress}` : '';
};

export const TVL_URL = 'https://europe-west3-wormhole-315720.cloudfunctions.net/mainnet-notionaltvl';
export const TVL_CUMULATIVE_URL =
  'https://europe-west3-wormhole-315720.cloudfunctions.net/mainnet-notionaltvlcumulative?totalsOnly=true';
export const TERRA_SWAPRATE_URL = 'https://fcd.terra.dev/v1/market/swaprate/uusd';

export const WETH_ADDRESS =
  CLUSTER === 'mainnet'
    ? '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
    : CLUSTER === 'testnet'
    ? '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6'
    : '0xDDb64fE46a91D46ee29420539FC25FD07c5FEa3E';
export const WETH_DECIMALS = 18;

export const WBNB_ADDRESS =
  CLUSTER === 'mainnet'
    ? '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
    : CLUSTER === 'testnet'
    ? '0xae13d989dac2f0debff460ac112a837c89baa7cd'
    : '0xDDb64fE46a91D46ee29420539FC25FD07c5FEa3E';
export const WBNB_DECIMALS = 18;

export const WMATIC_ADDRESS =
  CLUSTER === 'mainnet'
    ? '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270'
    : CLUSTER === 'testnet'
    ? '0x9c3c9283d3e44854697cd22d3faa240cfb032889'
    : '0xDDb64fE46a91D46ee29420539FC25FD07c5FEa3E';
export const WMATIC_DECIMALS = 18;

export const WAVAX_ADDRESS =
  CLUSTER === 'mainnet'
    ? '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7'
    : CLUSTER === 'testnet'
    ? '0xd00ae08403b9bbb9124bb305c09058e32c39a48c'
    : '0xDDb64fE46a91D46ee29420539FC25FD07c5FEa3E';
export const WAVAX_DECIMALS = 18;

export const WROSE_ADDRESS =
  CLUSTER === 'mainnet'
    ? '0x21C718C22D52d0F3a789b752D4c2fD5908a8A733'
    : CLUSTER === 'testnet'
    ? '0x792296e2a15e6Ceb5f5039DecaE7A1f25b00B0B0'
    : '0xDDb64fE46a91D46ee29420539FC25FD07c5FEa3E';
export const WROSE_DECIMALS = 18;

export const WETH_AURORA_ADDRESS =
  CLUSTER === 'mainnet'
    ? '0xC9BdeEd33CD01541e1eeD10f90519d2C06Fe3feB'
    : CLUSTER === 'testnet'
    ? '0x9D29f395524B3C817ed86e2987A14c1897aFF849'
    : '0xDDb64fE46a91D46ee29420539FC25FD07c5FEa3E';
export const WETH_AURORA_DECIMALS = 18;

export const WETH_ARBITRUM_ADDRESS =
  CLUSTER === 'mainnet'
    ? '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
    : CLUSTER === 'testnet'
    ? '0xC033378c6eEa969C001CE9438973ca4d6460999a'
    : '0xDDb64fE46a91D46ee29420539FC25FD07c5FEa3E';
export const WETH_ARBITRUM_DECIMALS = 18;

export const WETH_BASE_ADDRESS =
  CLUSTER === 'mainnet'
    ? '0x4200000000000000000000000000000000000006'
    : CLUSTER === 'testnet'
    ? '0x4200000000000000000000000000000000000006'
    : '0xDDb64fE46a91D46ee29420539FC25FD07c5FEa3E';
export const WETH_BASE_DECIMALS = 18;

export const WFTM_ADDRESS =
  CLUSTER === 'mainnet'
    ? '0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83'
    : CLUSTER === 'testnet'
    ? '0xf1277d1Ed8AD466beddF92ef448A132661956621'
    : '0xDDb64fE46a91D46ee29420539FC25FD07c5FEa3E';
export const WFTM_DECIMALS = 18;

export const KAR_ADDRESS =
  CLUSTER === 'mainnet'
    ? '0x0000000000000000000100000000000000000080'
    : CLUSTER === 'testnet'
    ? '0x0000000000000000000100000000000000000080'
    : '0xDDb64fE46a91D46ee29420539FC25FD07c5FEa3E';
export const KAR_DECIMALS = 12;

export const ACA_ADDRESS =
  CLUSTER === 'mainnet'
    ? '0x0000000000000000000100000000000000000000'
    : CLUSTER === 'testnet'
    ? '0x0000000000000000000100000000000000000000'
    : '0xDDb64fE46a91D46ee29420539FC25FD07c5FEa3E';
export const ACA_DECIMALS = 12;

export const WKLAY_ADDRESS =
  CLUSTER === 'mainnet'
    ? '0xe4f05a66ec68b54a58b17c22107b02e0232cc817'
    : CLUSTER === 'testnet'
    ? '0x762ac6e8183db5a8e912a66fcc1a09f5a7ac96a9'
    : '0xDDb64fE46a91D46ee29420539FC25FD07c5FEa3E';
export const WKLAY_DECIMALS = 18;

//https://docs.celo.org/token-addresses
export const CELO_ADDRESS =
  CLUSTER === 'mainnet'
    ? '0x471EcE3750Da237f93B8E339c536989b8978a438'
    : CLUSTER === 'testnet'
    ? '0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9'
    : '0xDDb64fE46a91D46ee29420539FC25FD07c5FEa3E';
export const CELO_DECIMALS = 18;

//mainnet token is GLMR, testnet is DEV
//https://docs.moonbeam.network/builders/build/canonical-contracts/
export const MOONBEAM_ADDRESS =
  CLUSTER === 'mainnet'
    ? '0xAcc15dC74880C9944775448304B263D191c6077F'
    : CLUSTER === 'testnet'
    ? '0xD909178CC99d318e4D46e7E66a972955859670E1'
    : '';
export const MOONBEAM_DECIMALS = 18;

export const WOP_ADDRESS = CLUSTER === 'mainnet' ? '' : CLUSTER === 'testnet' ? '' : '';
export const WOP_DECIMALS = 18;

export const ALGO_DECIMALS = 6;

// asset id from https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fmoonbeam-alpha.api.onfinality.io%2Fpublic-ws#/assets
export const DOT_ADDRESS_ON_MOONBEAM = CLUSTER === 'mainnet' ? '' : CLUSTER === 'testnet' ? '' : '';
export const DOT_DECIMALS = 10;
export const ACA_ADDRESS_ON_MOONBEAM = CLUSTER === 'mainnet' ? '' : CLUSTER === 'testnet' ? '' : '';
export const ACA_PARACHAIN_DECIMALS = 12;
export const AGUNG_ADDRESS_ON_MOONBEAM = CLUSTER === 'mainnet' ? '' : CLUSTER === 'testnet' ? '' : '';
export const AGUNG_DECIMALS = 18;
export const PHA_ADDRESS_ON_MOONBEAM =
  CLUSTER === 'mainnet' ? '' : CLUSTER === 'testnet' ? '189307976387032586987344677431204943363' : '';
export const PHA_DECIMALS = 12;
export const HDX_ADDRESS_ON_MOONBEAM = CLUSTER === 'mainnet' ? '' : CLUSTER === 'testnet' ? '' : '';
export const HDX_DECIMALS = 12;
export const INTR_ADDRESS_ON_MOONBEAM =
  CLUSTER === 'mainnet' ? '' : CLUSTER === 'testnet' ? '12009972993464827654650227422635011273' : '';
export const INTR_DECIMALS = 10;

export const MANTA_ADDRESS_ON_MOONBEAM =
  CLUSTER === 'mainnet' ? '' : CLUSTER === 'testnet' ? '166446646689194205559791995948102903873' : '';
export const MANTA_DECIMALS = 18;

export type RelayerCompareAsset = {
  [key in CarrierChainId]: string;
};
export const RELAYER_COMPARE_ASSET: RelayerCompareAsset = {
  [CHAIN_ID_ACALA]: 'acala',
  [CHAIN_ID_ARBITRUM]: 'ethereum', //arbitrum uses eth. doesnt have native token
  [CHAIN_ID_AURORA]: 'ethereum', // Aurora uses bridged ether
  [CHAIN_ID_AVAX]: 'avalanche-2',
  [CHAIN_ID_BASE]: 'ethereum', //base uses eth. doesnt have native token
  [CHAIN_ID_BSC]: 'binancecoin',
  [CHAIN_ID_CELO]: 'celo',
  [CHAIN_ID_ETH]: 'ethereum',
  [CHAIN_ID_FANTOM]: 'fantom',
  [CHAIN_ID_KARURA]: 'karura',
  [CHAIN_ID_KLAYTN]: 'klay-token',
  [CHAIN_ID_MOONBEAM]: 'moonbeam',
  [CHAIN_ID_OASIS]: 'oasis-network',
  [CHAIN_ID_OPTIMISM]: 'ethereum',
  [CHAIN_ID_POLYGON]: 'matic-network',
  [CHAIN_ID_SOLANA]: 'solana',
} as RelayerCompareAsset;

export const RELAYER_INFO_URL =
  CLUSTER === 'mainnet'
    ? 'https://raw.githubusercontent.com/certusone/wormhole-relayer-list/main/relayer.json'
    : CLUSTER === 'testnet'
    ? process.env.NODE_ENV === 'production'
      ? '/public/testnet-relayer-data.json'
      : '/testnet-relayer-data.json'
    : '/relayerExample.json';

// also for karura
export const ACALA_RELAYER_URL =
  CLUSTER === 'mainnet'
    ? 'https://relayer.aca-api.network'
    : CLUSTER === 'testnet'
    ? 'https://relayer.aca-dev.network'
    : // ? "http://localhost:3111"
      '';

export const ACALA_RELAY_URL = `${ACALA_RELAYER_URL}/relay`;
export const ACALA_SHOULD_RELAY_URL = `${ACALA_RELAYER_URL}/shouldRelay`;

interface WormholeChainToEvmChainType {
  [key: number]: number;
}

export const wormholeChainToEvmChain: WormholeChainToEvmChainType = {
  [CHAIN_ID_ACALA]: ACALA_NETWORK_CHAIN_ID,
  [CHAIN_ID_AURORA]: AURORA_NETWORK_CHAIN_ID,
  [CHAIN_ID_AVAX]: AVAX_NETWORK_CHAIN_ID,
  [CHAIN_ID_BSC]: BSC_NETWORK_CHAIN_ID,
  [CHAIN_ID_CELO]: CELO_NETWORK_CHAIN_ID,
  // CHAIN_ID_ETH also support Goerli chain id in testnet
  [CHAIN_ID_ETH]: ETH_NETWORK_CHAIN_ID,
  [CHAIN_ID_FANTOM]: FANTOM_NETWORK_CHAIN_ID,
  [CHAIN_ID_KARURA]: KARURA_NETWORK_CHAIN_ID,
  [CHAIN_ID_KLAYTN]: KLAYTN_NETWORK_CHAIN_ID,
  [CHAIN_ID_OASIS]: OASIS_NETWORK_CHAIN_ID,
  [CHAIN_ID_POLYGON]: POLYGON_NETWORK_CHAIN_ID,
  [CHAIN_ID_MOONBEAM]: MOONBEAM_NETWORK_CHAIN_ID,
  [CHAIN_ID_ARBITRUM]: ARBITRUM_NETWORK_CHAIN_ID,
  [CHAIN_ID_OPTIMISM]: OPTIMISM_NETWORK_CHAIN_ID,
  [CHAIN_ID_BASE]: BASE_NETWORK_CHAIN_ID,
};

export const evmChainToWormholeChain: { [key: number]: CarrierChainId } = {
  [ETH_NETWORK_CHAIN_ID]: CHAIN_ID_ETH,
  [BSC_NETWORK_CHAIN_ID]: CHAIN_ID_BSC,
  [POLYGON_NETWORK_CHAIN_ID]: CHAIN_ID_POLYGON,
  [FANTOM_NETWORK_CHAIN_ID]: CHAIN_ID_FANTOM,
  [KARURA_NETWORK_CHAIN_ID]: CHAIN_ID_KARURA,
  [ACALA_NETWORK_CHAIN_ID]: CHAIN_ID_ACALA,
  [MOONBEAM_NETWORK_CHAIN_ID]: CHAIN_ID_MOONBEAM,
  [KLAYTN_NETWORK_CHAIN_ID]: CHAIN_ID_KLAYTN,
  [ARBITRUM_NETWORK_CHAIN_ID]: CHAIN_ID_ARBITRUM,
  [OASIS_NETWORK_CHAIN_ID]: CHAIN_ID_OASIS,
  [AVAX_NETWORK_CHAIN_ID]: CHAIN_ID_AVAX,
  [AURORA_NETWORK_CHAIN_ID]: CHAIN_ID_AURORA,
  [CELO_NETWORK_CHAIN_ID]: CHAIN_ID_CELO,
  [OPTIMISM_NETWORK_CHAIN_ID]: CHAIN_ID_OPTIMISM,
  [BASE_NETWORK_CHAIN_ID]: CHAIN_ID_BASE,
};

interface CHAIN_MAPPING {
  mainnet: {
    [key: number]: string;
  };
  testnet: {
    [key: number]: string;
  };
  devnet: {
    [key: number]: string;
  };
}
// Ethereum Tenderly RPC: https://rpc.tenderly.co/fork/d20280d7-8a87-40ab-813d-216d15a58eb1
// Polygon Tenderly RPC: https://rpc.tenderly.co/fork/feb5229e-0ed5-4c49-9ea3-c91ccf2407fe
export const RPC_URLS: CHAIN_MAPPING = {
  mainnet: {
    [CHAIN_ID_ETH]: 'https://rpc.ankr.com/eth',
    [CHAIN_ID_BSC]: 'https://bsc-dataseed.binance.org',
    [CHAIN_ID_POLYGON]: 'https://rpc.ankr.com/polygon',
    [CHAIN_ID_AVAX]: 'https://ava-mainnet.public.blastapi.io/ext/bc/C/rpc',
    [CHAIN_ID_OASIS]: 'https://emerald.oasis.dev',
    [CHAIN_ID_AURORA]: 'https://mainnet.aurora.dev',
    [CHAIN_ID_FANTOM]: 'https://rpc2.fantom.network',
    [CHAIN_ID_KARURA]: 'https://rpc.evm.karura.network',
    [CHAIN_ID_ACALA]: 'https://eth-rpc-acala.aca-api.network',
    [CHAIN_ID_KLAYTN]: 'https://klaytn.blockpi.network/v1/rpc/public',
    [CHAIN_ID_CELO]: 'https://forno.celo.org',
    [CHAIN_ID_MOONBEAM]: 'https://rpc.api.moonbeam.network',
    [CHAIN_ID_ARBITRUM]: 'https://rpc.ankr.com/arbitrum',
    [CHAIN_ID_OPTIMISM]: 'https://rpc.ankr.com/optimism',
    [CHAIN_ID_BASE]: 'https://rpc.ankr.com/base',
    [Polkachain.HydraDX]: 'wss://hydradx-rpc.dwellir.com',
    [Polkachain.Moonbeam]: 'wss://1rpc.io/glmr',
    [Polkachain.Interlay]: 'wss://interlay-rpc.dwellir.com',
  },
  testnet: {
    // Eth chain id turns into Goerli on testnet configuration
    // See lines 404
    [CHAIN_ID_ETH]: 'https://rpc.ankr.com/eth_goerli',
    [CHAIN_ID_BSC]: 'https://data-seed-prebsc-2-s1.binance.org:8545',
    [CHAIN_ID_POLYGON]: 'https://rpc.ankr.com/polygon_mumbai',
    [CHAIN_ID_AVAX]: 'https://api.avax-test.network/ext/bc/C/rpc',
    [CHAIN_ID_OASIS]: 'https://testnet.emerald.oasis.dev',
    [CHAIN_ID_AURORA]: 'https://testnet.aurora.dev',
    [CHAIN_ID_FANTOM]: 'https://rpc.ankr.com/fantom_testnet',
    [CHAIN_ID_KARURA]: 'https://eth-rpc-karura-testnet.aca-staging.network',
    [CHAIN_ID_ACALA]: 'https://eth-rpc-acala-testnet.aca-staging.network',
    [CHAIN_ID_KLAYTN]: 'https://api.baobab.klaytn.net:8651',
    [CHAIN_ID_CELO]: 'https://alfajores-forno.celo-testnet.org',
    [CHAIN_ID_MOONBEAM]: 'https://rpc.testnet.moonbeam.network',
    [CHAIN_ID_ARBITRUM]: 'https://endpoints.omniatech.io/v1/arbitrum/goerli/public',
    [CHAIN_ID_OPTIMISM]: 'https://goerli.optimism.io',
    [CHAIN_ID_BASE]: 'https://goerli.base.org',
    [Polkachain.PeaqAgung]: 'wss://moonbeam.peaq.network',
    [Polkachain.HydraDX]: 'wss://hydradx-moonbase-rpc.play.hydration.cloud',
    [Polkachain.MoonbaseAlpha]: 'wss://wss.api.moonbase.moonbeam.network',
    [Polkachain.Manta]: 'wss://c1.manta.moonsea.systems',
    [Polkachain.Interlay]: 'wss://interlay-moonbeam-alphanet.interlay.io/parachain',
  },
  devnet: {},
};

export const TXN_STATUS = {
  PENDING: 'pending',
  VAA_SIGNED: 'vaa_signed', // not used
  FAILED: 'failed',
  CONFIRMED: 'confirmed',
  REDEEMED: 'redeemed',
};

export const TXN_TYPE = {
  TOKEN_BRIDGE: 'token_bridge',
  NFT_BRIDGE: 'nft_bridge',
  SWAP: 'swap',
  REDEEM: 'redeem',
};

interface EVMChainToDecimals {
  [key: number]: number;
}

export const evmChainNativeDecimals: EVMChainToDecimals = {
  [ETH_NETWORK_CHAIN_ID]: WETH_DECIMALS,
  [BSC_NETWORK_CHAIN_ID]: WBNB_DECIMALS,
  [POLYGON_NETWORK_CHAIN_ID]: WMATIC_DECIMALS,
  [AVAX_NETWORK_CHAIN_ID]: WAVAX_DECIMALS,
  [OASIS_NETWORK_CHAIN_ID]: WROSE_DECIMALS,
  [AURORA_NETWORK_CHAIN_ID]: WETH_AURORA_DECIMALS,
  [FANTOM_NETWORK_CHAIN_ID]: WFTM_DECIMALS,
  [KARURA_NETWORK_CHAIN_ID]: KAR_DECIMALS,
  [ACALA_NETWORK_CHAIN_ID]: ACA_DECIMALS,
  [KLAYTN_NETWORK_CHAIN_ID]: WKLAY_DECIMALS,
  [CELO_NETWORK_CHAIN_ID]: CELO_DECIMALS,
  [MOONBEAM_NETWORK_CHAIN_ID]: MOONBEAM_DECIMALS,
  [ARBITRUM_NETWORK_CHAIN_ID]: WETH_DECIMALS,
  [OPTIMISM_NETWORK_CHAIN_ID]: WOP_DECIMALS,
};

export const sourceChainGasLimit = {
  nativeCurrency: BigNumber(90 * 1000),
  erc20Token: BigNumber(130 * 1000),
  NFT: BigNumber(150 * 1000),
};

export const approveGasLimit = BigNumber(50 * 1000);

export const destinationChainGasLimit = BigNumber(300 * 1000);

export const destinationChainNFTGasLimit = BigNumber(800 * 1000);

export const cooNFTMintParams =
  CLUSTER === 'mainnet'
    ? {
        tokenAddress: '0xB0CdFdcAAe65Cde48bf74B23c935A2cD91d6EDf2',
        chainId: CHAIN_ID_ETH,
      }
    : {
        tokenAddress: '0x15c702f2c01c109b3261effb0a6a48de0f3ceae5',
        chainId: CHAIN_ID_ETH,
      };

export const MOONBEAM_MRL_PRECOMPILE_ADDRESS =
  CLUSTER === 'mainnet' ? '0x0000000000000000000000000000000000000816' : '0x0000000000000000000000000000000000000816';
export const MOONBEAM_BATCH_PRECOMPILE_ADDRESS =
  CLUSTER === 'mainnet' ? '0x0000000000000000000000000000000000000808' : '0x0000000000000000000000000000000000000808';
export const MOONBEAM_XCM_PRECOMPILE_ADDRESS = '0x0000000000000000000000000000000000000804';
export const MOONBEAM_NATIVE_CURRENCY_PRECOMPILE_ADDRESS = '0x0000000000000000000000000000000000000802';
export const MOONBEAM_ROUTED_LIQUIDITY_PRECOMPILE = tryNativeToUint8Array(
  MOONBEAM_MRL_PRECOMPILE_ADDRESS,
  CHAIN_ID_MOONBEAM,
);

export const MOONBEAM_PARACHAIN_ID = CLUSTER === 'mainnet' ? Polkachain.Moonbeam : Polkachain.MoonbaseAlpha;

export const MOONBEAM_BALANCE_PALLET = CLUSTER === 'mainnet' ? 10 : 3; // 10 on Moonbeam, 3 on Alphanet

export const MOONBEAM_WEIGHT_TO_WEI_FACTOR = ethers.BigNumber.from(CLUSTER === 'mainnet' ? 5000000 : 50000);
export const MOONBEAM_TRANSFER_MULTIASSETS_WEIGHTS =
  ethers.BigNumber.from('9000000000').mul(MOONBEAM_WEIGHT_TO_WEI_FACTOR);
export const MOONBEAM_ASSET_TRANSACT_WEIGHTS = ethers.BigNumber.from('20000000000').mul(MOONBEAM_WEIGHT_TO_WEI_FACTOR);
