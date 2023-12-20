import { ChainConfig, AssetConfig, hdx, glmr, dev, intr } from '@moonbeam-network/xcm-config';
import { Ecosystem, Parachain, EvmParachain, Asset, AnyChain, ChainAssetsData } from '@moonbeam-network/xcm-types';
import {
  BalanceBuilder,
  ExtrinsicBuilder,
  ContractBuilder,
  FeeBuilder,
  FeeConfigBuilder,
} from '@moonbeam-network/xcm-builder';
import {
  CLUSTER,
  MOONBEAM_NATIVE_CURRENCY_PRECOMPILE_ADDRESS,
  MOONBEAM_PARACHAIN_ID,
  MOONBEAM_TRANSFER_MULTIASSETS_WEIGHTS,
  Polkachain,
  RPC_URLS,
} from '../../../utils/consts';
import { PolkachainTokens, PolkachainXcGLMR } from '../../../utils/tokenData/mrl';
import { CHAIN_ID_MOONBEAM } from '@certusone/wormhole-sdk';
import { ethers } from 'ethers';

function getAssetIdFromPolkachainTokens(
  polkachain: Polkachain,
  symbol: string,
): number | string | { ForeignAsset: string } | { Token: string } {
  if (symbol.toLowerCase() === 'glmr' || symbol.toLowerCase() === 'dev') {
    return polkachain === Polkachain.Interlay
      ? { ForeignAsset: PolkachainXcGLMR[polkachain]?.assetId }
      : polkachain === Polkachain.PeaqAgung
      ? { Token: PolkachainXcGLMR[polkachain]?.symbol }
      : PolkachainXcGLMR[polkachain]?.assetId;
  } else if (symbol.toLowerCase() === 'hdx') {
    return 0;
  } else if (symbol.toLowerCase() === 'intr') {
    return { Token: 'INTR' };
  } else if (symbol.toLowerCase() === 'agng') {
    return { Token: 'AGNG' };
  } else {
    const token = PolkachainTokens[polkachain].find((item) => item.symbol.toLowerCase() === symbol.toLowerCase());

    if (!token || !token.assetId) {
      throw new Error("Can't find polkachain token");
    }

    return polkachain === Polkachain.Interlay
      ? { ForeignAsset: token.assetId }
      : polkachain === Polkachain.PeaqAgung
      ? { Token: token.parachainSymbol || token.symbol }
      : token.assetId;
  }
}

function getMoonbeamAddressFromPolkachainTokens(polkachain: Polkachain, symbol: string) {
  if (symbol.toLowerCase() === 'glmr' || symbol.toLowerCase() === 'dev') {
    return MOONBEAM_NATIVE_CURRENCY_PRECOMPILE_ADDRESS;
  } else {
    const token = PolkachainTokens[polkachain].find((item) => item.symbol.toLowerCase() === symbol.toLowerCase());

    if (!token || !token.tokenAddressOnMoonbeam) {
      throw new Error("Can't find polkachain token");
    }

    return token.tokenAddressOnMoonbeam;
  }
}

function getAssetFromPolkachainTokens(polkachain: Polkachain, symbol: string) {
  if (symbol.toLowerCase() === 'glmr' || symbol.toLowerCase() === 'dev') {
    return CLUSTER === 'mainnet' ? glmr : dev;
  } else if (symbol.toLowerCase() === 'hdx') {
    return hdx;
  } else if (symbol.toLowerCase() === 'intr') {
    return intr;
  } else if (symbol.toLowerCase() === 'agng') {
    return new Asset({ key: 'agng', originSymbol: 'AGNG' });
  } else {
    const token = PolkachainTokens[polkachain].find((item) => item.symbol.toLowerCase() === symbol.toLowerCase());

    if (!token) {
      throw new Error("Can't find polkachain token");
    }

    return new Asset({
      key: token.symbol.toLowerCase(),
      originSymbol: token.symbol,
    });
  }
}

function getDecimalsFromPolkachainTokens(polkachain: Polkachain, symbol: string) {
  if (symbol.toLowerCase() === 'glmr' || symbol.toLowerCase() === 'dev') {
    return PolkachainXcGLMR[polkachain]?.decimals || 18;
  } else if (symbol.toLowerCase() === 'intr') {
    return 10;
  } else if (symbol.toLowerCase() === 'agng') {
    return 18;
  } else {
    const token = PolkachainTokens[polkachain].find((item) => item.symbol.toLowerCase() === symbol.toLowerCase());

    if (!token) {
      throw new Error("Can't find polkachain token");
    }

    return token.decimals;
  }
}

function getDestinationChainConfig(polkachain: Polkachain) {
  const config =
    polkachain === MOONBEAM_PARACHAIN_ID
      ? moonbeam
      : polkachain === Polkachain.HydraDX
      ? hydraDX
      : polkachain === Polkachain.Interlay
      ? interlay
      : polkachain === Polkachain.PeaqAgung
      ? peaq
      : undefined;

  if (!config) {
    throw new Error("Can't find destination chain config");
  }

  return config;
}

function getEvmAssetConfig(options: {
  chainId: Polkachain;
  destinationChainId: Polkachain;
  symbol: string;
  feeSymbol?: string;
  destinationFeeSymbol: string;
  destinationFeeAmount: number;
}) {
  const { chainId, destinationChainId, symbol, feeSymbol, destinationFeeSymbol, destinationFeeAmount } = options;

  return new AssetConfig({
    asset: getAssetFromPolkachainTokens(chainId, symbol),
    balance: BalanceBuilder().evm().erc20(),
    contract: ContractBuilder().Xtokens().transferMultiCurrencies(),
    destination: getDestinationChainConfig(destinationChainId),
    destinationFee: {
      amount: destinationFeeAmount,
      asset: getAssetFromPolkachainTokens(chainId, destinationFeeSymbol),
      balance: BalanceBuilder().substrate().system().account(),
    },
    ...(feeSymbol
      ? {
          fee: {
            asset: getAssetFromPolkachainTokens(chainId, feeSymbol),
            balance: BalanceBuilder().substrate().system().account(),
          },
        }
      : {}),
  });
}

function getHydraDXAssetConfig(options: {
  chainId: Polkachain;
  destinationChainId: Polkachain;
  symbol: string;
  feeSymbol?: string;
  destinationFeeSymbol: string;
  destinationFeeAmount: number | FeeConfigBuilder;
}) {
  const { chainId, destinationChainId, symbol, feeSymbol, destinationFeeSymbol, destinationFeeAmount } = options;

  return new AssetConfig({
    asset: getAssetFromPolkachainTokens(chainId, symbol),
    balance: BalanceBuilder().substrate().tokens().accounts(),
    destination: getDestinationChainConfig(destinationChainId),
    destinationFee: {
      amount: destinationFeeAmount,
      asset: getAssetFromPolkachainTokens(chainId, destinationFeeSymbol),
      balance: BalanceBuilder().substrate().tokens().accounts(),
    },
    extrinsic: ExtrinsicBuilder().xTokens().transferMultiCurrencies(),
    ...(feeSymbol
      ? {
          fee: {
            asset: getAssetFromPolkachainTokens(chainId, feeSymbol),
            balance: BalanceBuilder().substrate().system().account(),
          },
        }
      : {}),
  });
}

function getInterlayAssetConfig(options: {
  chainId: Polkachain;
  destinationChainId: Polkachain;
  symbol: string;
  feeSymbol?: string;
  destinationFeeSymbol: string;
  destinationFeeAmount: number | FeeConfigBuilder;
}) {
  const { chainId, destinationChainId, symbol, feeSymbol, destinationFeeSymbol, destinationFeeAmount } = options;

  return new AssetConfig({
    asset: getAssetFromPolkachainTokens(chainId, symbol),
    balance: BalanceBuilder().substrate().tokens().accounts(),
    destination: getDestinationChainConfig(destinationChainId),
    destinationFee: {
      amount: destinationFeeAmount,
      asset: getAssetFromPolkachainTokens(chainId, destinationFeeSymbol),
      balance: BalanceBuilder().substrate().tokens().accounts(),
    },
    extrinsic: ExtrinsicBuilder().xTokens().transferMultiCurrencies(),
    ...(feeSymbol
      ? {
          fee: {
            asset: getAssetFromPolkachainTokens(chainId, feeSymbol),
            balance: BalanceBuilder().substrate().tokens().accounts(),
          },
        }
      : {}),
  });
}

function getPeaqAssetConfig(options: {
  chainId: Polkachain;
  destinationChainId: Polkachain;
  symbol: string;
  feeSymbol?: string;
  destinationFeeSymbol: string;
  destinationFeeAmount: number | FeeConfigBuilder;
}) {
  const { chainId, destinationChainId, symbol, feeSymbol, destinationFeeSymbol, destinationFeeAmount } = options;

  return new AssetConfig({
    asset: getAssetFromPolkachainTokens(chainId, symbol),
    balance: BalanceBuilder().substrate().tokens().accounts(),
    destination: getDestinationChainConfig(destinationChainId),
    destinationFee: {
      amount: destinationFeeAmount,
      asset: getAssetFromPolkachainTokens(chainId, destinationFeeSymbol),
      balance: BalanceBuilder().substrate().tokens().accounts(),
    },
    extrinsic: ExtrinsicBuilder().xTokens().transferMultiCurrencies(),
    ...(feeSymbol
      ? {
          fee: {
            asset: getAssetFromPolkachainTokens(chainId, feeSymbol),
            balance: BalanceBuilder().substrate().system().account(),
          },
        }
      : {}),
  });
}

const moonbeamAssets = (
  [
    {
      asset: getAssetFromPolkachainTokens(Polkachain.HydraDX, 'GLMR'),
      id: getMoonbeamAddressFromPolkachainTokens(Polkachain.HydraDX, 'GLMR'),
    },
  ] as ChainAssetsData[]
).concat(
  CLUSTER === 'mainnet'
    ? [
        {
          asset: getAssetFromPolkachainTokens(Polkachain.HydraDX, 'DAI'),
          id: getMoonbeamAddressFromPolkachainTokens(Polkachain.HydraDX, 'DAI'),
          metadataId: 0,
        },
        {
          asset: getAssetFromPolkachainTokens(Polkachain.HydraDX, 'WBTC'),
          id: getMoonbeamAddressFromPolkachainTokens(Polkachain.HydraDX, 'WBTC'),
          metadataId: 0,
        },
        {
          asset: getAssetFromPolkachainTokens(Polkachain.HydraDX, 'WETH'),
          id: getMoonbeamAddressFromPolkachainTokens(Polkachain.HydraDX, 'WETH'),
          metadataId: 0,
        },
        {
          asset: getAssetFromPolkachainTokens(Polkachain.HydraDX, 'USDC'),
          id: getMoonbeamAddressFromPolkachainTokens(Polkachain.HydraDX, 'USDC'),
          metadataId: 0,
        },
        {
          asset: getAssetFromPolkachainTokens(Polkachain.HydraDX, 'USDT'),
          id: getMoonbeamAddressFromPolkachainTokens(Polkachain.HydraDX, 'USDT'),
          metadataId: 0,
        },
      ]
    : [
        {
          asset: getAssetFromPolkachainTokens(Polkachain.HydraDX, 'FTM'),
          id: getMoonbeamAddressFromPolkachainTokens(Polkachain.HydraDX, 'FTM'),
          metadataId: 0,
        },
        {
          asset: getAssetFromPolkachainTokens(Polkachain.HydraDX, 'USDC'),
          id: getMoonbeamAddressFromPolkachainTokens(Polkachain.HydraDX, 'USDC'),
          metadataId: 0,
        },
      ],
);
const moonbeam = new EvmParachain({
  assetsData: moonbeamAssets,
  ecosystem: CLUSTER === 'mainnet' ? Ecosystem.Polkadot : Ecosystem.AlphanetRelay,
  genesisHash:
    CLUSTER === 'mainnet'
      ? '0xfe58ea77779b7abda7da4ec526d14db9b1e9cd40a217c34892af80a9b332b76d'
      : '0x91bc6e169807aaa54802737e1c504b2577d4fafedd5a02c10293b1cd60e39527',
  id: CLUSTER === 'mainnet' ? 1284 : 1287,
  key: CLUSTER === 'mainnet' ? 'moonbeam' : 'moonbase-alpha',
  isTestChain: CLUSTER === 'mainnet' ? false : true,
  name: CLUSTER === 'mainnet' ? 'Moonbeam' : 'Moonbeam Alpha',
  parachainId: CLUSTER === 'mainnet' ? Polkachain.Moonbeam : Polkachain.MoonbaseAlpha,
  rpc: RPC_URLS[CLUSTER][CHAIN_ID_MOONBEAM],
  ss58Format: CLUSTER === 'mainnet' ? 1284 : 1287,
  ws: RPC_URLS[CLUSTER][CLUSTER === 'mainnet' ? Polkachain.Moonbeam : Polkachain.MoonbaseAlpha],
});

const hydraDXAssets = (
  [
    {
      asset: getAssetFromPolkachainTokens(Polkachain.HydraDX, 'HDX'),
      id: getAssetIdFromPolkachainTokens(Polkachain.HydraDX, 'HDX'),
    },
    {
      asset: getAssetFromPolkachainTokens(Polkachain.HydraDX, 'GLMR'),
      id: getAssetIdFromPolkachainTokens(Polkachain.HydraDX, 'GLMR'),
    },
  ] as ChainAssetsData[]
).concat(
  CLUSTER === 'mainnet'
    ? [
        {
          asset: getAssetFromPolkachainTokens(Polkachain.HydraDX, 'DAI'),
          id: getAssetIdFromPolkachainTokens(Polkachain.HydraDX, 'DAI'),
        },
        {
          asset: getAssetFromPolkachainTokens(Polkachain.HydraDX, 'USDC'),
          id: getAssetIdFromPolkachainTokens(Polkachain.HydraDX, 'USDC'),
        },
        {
          asset: getAssetFromPolkachainTokens(Polkachain.HydraDX, 'WBTC'),
          id: getAssetIdFromPolkachainTokens(Polkachain.HydraDX, 'WBTC'),
        },
        {
          asset: getAssetFromPolkachainTokens(Polkachain.HydraDX, 'WETH'),
          id: getAssetIdFromPolkachainTokens(Polkachain.HydraDX, 'WETH'),
        },
        {
          asset: getAssetFromPolkachainTokens(Polkachain.HydraDX, 'USDT'),
          id: getAssetIdFromPolkachainTokens(Polkachain.HydraDX, 'USDT'),
        },
      ]
    : [
        {
          asset: getAssetFromPolkachainTokens(Polkachain.HydraDX, 'FTM'),
          id: getAssetIdFromPolkachainTokens(Polkachain.HydraDX, 'FTM'),
        },
        {
          asset: getAssetFromPolkachainTokens(Polkachain.HydraDX, 'USDC'),
          id: getAssetIdFromPolkachainTokens(Polkachain.HydraDX, 'USDC'),
        },
      ],
);
const hydraDX = new Parachain({
  assetsData: hydraDXAssets,
  ecosystem: Ecosystem.Polkadot,
  genesisHash:
    CLUSTER === 'mainnet'
      ? '0xafdc188f45c71dacbaa0b62e16a91f726c7b8699a9748cdf715459de6b7f366d'
      : '0x025980095be141a99f983631c49271af15cab61c4ce0d73db73192443932669a',
  key: 'hydra-dx',
  name: 'HydraDX',
  parachainId: Polkachain.HydraDX,
  ss58Format: 63,
  ws: RPC_URLS[CLUSTER][Polkachain.HydraDX],
});

const interlayAssets = (
  [
    {
      asset: getAssetFromPolkachainTokens(Polkachain.Interlay, 'INTR'),
      decimals: getDecimalsFromPolkachainTokens(Polkachain.Interlay, 'INTR'),
      id: getAssetIdFromPolkachainTokens(Polkachain.Interlay, 'INTR'),
      metadataId: 0,
    },
    {
      asset: getAssetFromPolkachainTokens(Polkachain.Interlay, 'GLMR'),
      decimals: getDecimalsFromPolkachainTokens(Polkachain.Interlay, 'GLMR'),
      id: getAssetIdFromPolkachainTokens(Polkachain.Interlay, 'GLMR'),
      metadataId: 0,
    },
  ] as ChainAssetsData[]
).concat(
  CLUSTER === 'mainnet'
    ? [
        {
          asset: getAssetFromPolkachainTokens(Polkachain.Interlay, 'DAI'),
          decimals: getDecimalsFromPolkachainTokens(Polkachain.Interlay, 'DAI'),
          id: getAssetIdFromPolkachainTokens(Polkachain.Interlay, 'DAI'),
          metadataId: 0,
        },
        {
          asset: getAssetFromPolkachainTokens(Polkachain.Interlay, 'USDC'),
          decimals: getDecimalsFromPolkachainTokens(Polkachain.Interlay, 'USDC'),
          id: getAssetIdFromPolkachainTokens(Polkachain.Interlay, 'USDC'),
          metadataId: 0,
        },
        {
          asset: getAssetFromPolkachainTokens(Polkachain.Interlay, 'WBTC'),
          decimals: getDecimalsFromPolkachainTokens(Polkachain.Interlay, 'WBTC'),
          id: getAssetIdFromPolkachainTokens(Polkachain.Interlay, 'WBTC'),
          metadataId: 0,
        },
        {
          asset: getAssetFromPolkachainTokens(Polkachain.Interlay, 'WETH'),
          decimals: getDecimalsFromPolkachainTokens(Polkachain.Interlay, 'WETH'),
          id: getAssetIdFromPolkachainTokens(Polkachain.Interlay, 'WETH'),
          metadataId: 0,
        },
      ]
    : [
        {
          asset: getAssetFromPolkachainTokens(Polkachain.Interlay, 'FTM'),
          decimals: getDecimalsFromPolkachainTokens(Polkachain.Interlay, 'FTM'),
          id: getAssetIdFromPolkachainTokens(Polkachain.Interlay, 'FTM'),
          metadataId: 0,
        },
      ],
);
const interlay = new Parachain({
  assetsData: interlayAssets,
  ecosystem: Ecosystem.Polkadot,
  genesisHash:
    CLUSTER === 'mainnet'
      ? '0xbf88efe70e9e0e916416e8bed61f2b45717f517d7f3523e33c7b001e5ffcbc72'
      : '0x418ae94c9fce02b1ab3b5bc211cd2f2133426f2861d97482bbdfdac1bbb0fb92',
  key: 'interlay',
  name: 'Interlay',
  parachainId: Polkachain.Interlay,
  ss58Format: 2032,
  ws: RPC_URLS[CLUSTER][Polkachain.Interlay],
});

const peaqAssets = (
  [
    {
      asset: getAssetFromPolkachainTokens(Polkachain.PeaqAgung, 'AGNG'),
      decimals: getDecimalsFromPolkachainTokens(Polkachain.PeaqAgung, 'AGNG'),
      id: getAssetIdFromPolkachainTokens(Polkachain.PeaqAgung, 'AGNG'),
      metadataId: 0,
    },
    {
      asset: getAssetFromPolkachainTokens(Polkachain.PeaqAgung, 'GLMR'),
      decimals: getDecimalsFromPolkachainTokens(Polkachain.PeaqAgung, 'GLMR'),
      id: getAssetIdFromPolkachainTokens(Polkachain.PeaqAgung, 'GLMR'),
      metadataId: 0,
    },
  ] as ChainAssetsData[]
).concat(
  CLUSTER === 'mainnet'
    ? []
    : [
        {
          asset: getAssetFromPolkachainTokens(Polkachain.PeaqAgung, 'USDC'),
          decimals: getDecimalsFromPolkachainTokens(Polkachain.PeaqAgung, 'USDC'),
          id: getAssetIdFromPolkachainTokens(Polkachain.PeaqAgung, 'USDC'),
          metadataId: 0,
        },
      ],
);
const peaq = new Parachain({
  assetsData: peaqAssets,
  ecosystem: Ecosystem.Polkadot,
  genesisHash: CLUSTER === 'mainnet' ? '' : '0x1afd4a50d946b99a0928dfb9072db71f2475f5e8dc341f271ca09494a3b17c03',
  key: 'peaq-agung',
  name: 'Peaq Agung',
  parachainId: Polkachain.PeaqAgung,
  ss58Format: 42,
  ws: RPC_URLS[CLUSTER][Polkachain.PeaqAgung],
});

export function getChainsConfigMap(options: {
  sourceChainId: Polkachain;
  targetChainId: Polkachain;
  randomXCMFee: number | undefined;
}) {
  const { sourceChainId, targetChainId, randomXCMFee } = options;
  const chainsConfigList: ChainConfig[] = [];
  const xcGLMRFun = parseFloat(
    ethers.utils.formatEther(
      (sourceChainId !== MOONBEAM_PARACHAIN_ID && targetChainId !== MOONBEAM_PARACHAIN_ID
        ? MOONBEAM_TRANSFER_MULTIASSETS_WEIGHTS.mul(2)
        : MOONBEAM_TRANSFER_MULTIASSETS_WEIGHTS
      ).add(randomXCMFee || 0),
    ),
  );

  const moonbeamConfig = new ChainConfig({
    assets: [
      getEvmAssetConfig({
        chainId: Polkachain.HydraDX,
        destinationChainId: Polkachain.HydraDX,
        symbol: 'GLMR',
        destinationFeeSymbol: 'GLMR',
        destinationFeeAmount: xcGLMRFun,
      }),
      getEvmAssetConfig({
        chainId: Polkachain.Interlay,
        destinationChainId: Polkachain.Interlay,
        symbol: 'GLMR',
        destinationFeeSymbol: 'GLMR',
        destinationFeeAmount: xcGLMRFun,
      }),
      getEvmAssetConfig({
        chainId: Polkachain.PeaqAgung,
        destinationChainId: Polkachain.PeaqAgung,
        symbol: 'GLMR',
        destinationFeeSymbol: 'GLMR',
        destinationFeeAmount: xcGLMRFun,
      }),
    ].concat(
      CLUSTER === 'mainnet'
        ? [
            // hydraDX asset configs
            getEvmAssetConfig({
              chainId: Polkachain.HydraDX,
              destinationChainId: Polkachain.HydraDX,
              symbol: 'DAI',
              feeSymbol: 'GLMR',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),
            getEvmAssetConfig({
              chainId: Polkachain.HydraDX,
              destinationChainId: Polkachain.HydraDX,
              symbol: 'USDC',
              feeSymbol: 'GLMR',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),
            getEvmAssetConfig({
              chainId: Polkachain.HydraDX,
              destinationChainId: Polkachain.HydraDX,
              symbol: 'WETH',
              feeSymbol: 'GLMR',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),
            getEvmAssetConfig({
              chainId: Polkachain.HydraDX,
              destinationChainId: Polkachain.HydraDX,
              symbol: 'WBTC',
              feeSymbol: 'GLMR',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),
            getEvmAssetConfig({
              chainId: Polkachain.HydraDX,
              destinationChainId: Polkachain.HydraDX,
              symbol: 'USDT',
              feeSymbol: 'GLMR',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),

            // interlay asset configs
            getEvmAssetConfig({
              chainId: Polkachain.Interlay,
              destinationChainId: Polkachain.Interlay,
              symbol: 'DAI',
              feeSymbol: 'GLMR',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),
            getEvmAssetConfig({
              chainId: Polkachain.Interlay,
              destinationChainId: Polkachain.Interlay,
              symbol: 'USDC',
              feeSymbol: 'GLMR',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),
            getEvmAssetConfig({
              chainId: Polkachain.Interlay,
              destinationChainId: Polkachain.Interlay,
              symbol: 'WETH',
              feeSymbol: 'GLMR',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),
            getEvmAssetConfig({
              chainId: Polkachain.Interlay,
              destinationChainId: Polkachain.Interlay,
              symbol: 'WBTC',
              feeSymbol: 'GLMR',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),
          ]
        : [
            // hydraDX asset configs
            getEvmAssetConfig({
              chainId: Polkachain.HydraDX,
              destinationChainId: Polkachain.HydraDX,
              symbol: 'FTM',
              feeSymbol: 'GLMR',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),
            getEvmAssetConfig({
              chainId: Polkachain.HydraDX,
              destinationChainId: Polkachain.HydraDX,
              symbol: 'USDC',
              feeSymbol: 'GLMR',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),

            // interlay asset configs
            getEvmAssetConfig({
              chainId: Polkachain.Interlay,
              destinationChainId: Polkachain.Interlay,
              symbol: 'FTM',
              feeSymbol: 'GLMR',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),

            // peaq asset configs
            getEvmAssetConfig({
              chainId: Polkachain.PeaqAgung,
              destinationChainId: Polkachain.PeaqAgung,
              symbol: 'USDC',
              feeSymbol: 'GLMR',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),
          ],
    ),
    chain: moonbeam,
  });
  const hydraDxConfig = new ChainConfig({
    assets: [
      getHydraDXAssetConfig({
        chainId: Polkachain.HydraDX,
        destinationChainId: MOONBEAM_PARACHAIN_ID,
        symbol: 'HDX',
        destinationFeeSymbol: 'HDX',
        destinationFeeAmount: FeeBuilder().assetManager().assetTypeUnitsPerSecond(),
      }),
      getHydraDXAssetConfig({
        chainId: Polkachain.HydraDX,
        destinationChainId: MOONBEAM_PARACHAIN_ID,
        symbol: 'GLMR',
        destinationFeeSymbol: 'GLMR',
        destinationFeeAmount: 0.01,
      }),
      getHydraDXAssetConfig({
        chainId: Polkachain.HydraDX,
        destinationChainId: Polkachain.Interlay,
        symbol: 'HDX',
        destinationFeeSymbol: 'HDX',
        destinationFeeAmount: FeeBuilder().assetManager().assetTypeUnitsPerSecond(),
      }),
      getHydraDXAssetConfig({
        chainId: Polkachain.HydraDX,
        destinationChainId: Polkachain.Interlay,
        symbol: 'GLMR',
        destinationFeeSymbol: 'GLMR',
        destinationFeeAmount: 0.01,
      }),
      getHydraDXAssetConfig({
        chainId: Polkachain.HydraDX,
        destinationChainId: Polkachain.PeaqAgung,
        symbol: 'HDX',
        destinationFeeSymbol: 'HDX',
        destinationFeeAmount: FeeBuilder().assetManager().assetTypeUnitsPerSecond(),
      }),
      getHydraDXAssetConfig({
        chainId: Polkachain.HydraDX,
        destinationChainId: Polkachain.PeaqAgung,
        symbol: 'GLMR',
        destinationFeeSymbol: 'GLMR',
        destinationFeeAmount: 0.01,
      }),
    ].concat(
      CLUSTER === 'mainnet'
        ? [
            // moonbeam asset configs
            getHydraDXAssetConfig({
              chainId: Polkachain.HydraDX,
              destinationChainId: MOONBEAM_PARACHAIN_ID,
              symbol: 'DAI',
              feeSymbol: 'HDX',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),
            getHydraDXAssetConfig({
              chainId: Polkachain.HydraDX,
              destinationChainId: MOONBEAM_PARACHAIN_ID,
              symbol: 'USDC',
              feeSymbol: 'HDX',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),
            getHydraDXAssetConfig({
              chainId: Polkachain.HydraDX,
              destinationChainId: MOONBEAM_PARACHAIN_ID,
              symbol: 'WETH',
              feeSymbol: 'HDX',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),
            getHydraDXAssetConfig({
              chainId: Polkachain.HydraDX,
              destinationChainId: MOONBEAM_PARACHAIN_ID,
              symbol: 'WBTC',
              feeSymbol: 'HDX',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),
            getHydraDXAssetConfig({
              chainId: Polkachain.HydraDX,
              destinationChainId: MOONBEAM_PARACHAIN_ID,
              symbol: 'USDT',
              feeSymbol: 'HDX',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),

            // interlay asset configs
            getHydraDXAssetConfig({
              chainId: Polkachain.HydraDX,
              destinationChainId: Polkachain.Interlay,
              symbol: 'DAI',
              feeSymbol: 'HDX',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),
            getHydraDXAssetConfig({
              chainId: Polkachain.HydraDX,
              destinationChainId: Polkachain.Interlay,
              symbol: 'USDC',
              feeSymbol: 'HDX',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),
            getHydraDXAssetConfig({
              chainId: Polkachain.HydraDX,
              destinationChainId: Polkachain.Interlay,
              symbol: 'WETH',
              feeSymbol: 'HDX',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),
            getHydraDXAssetConfig({
              chainId: Polkachain.HydraDX,
              destinationChainId: Polkachain.Interlay,
              symbol: 'WBTC',
              feeSymbol: 'HDX',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),
          ]
        : [
            // moonbeam asset configs
            getHydraDXAssetConfig({
              chainId: Polkachain.HydraDX,
              destinationChainId: MOONBEAM_PARACHAIN_ID,
              symbol: 'FTM',
              feeSymbol: 'HDX',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),
            getHydraDXAssetConfig({
              chainId: Polkachain.HydraDX,
              destinationChainId: MOONBEAM_PARACHAIN_ID,
              symbol: 'USDC',
              feeSymbol: 'HDX',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),

            // interlay asset configs
            getHydraDXAssetConfig({
              chainId: Polkachain.HydraDX,
              destinationChainId: Polkachain.Interlay,
              symbol: 'FTM',
              feeSymbol: 'HDX',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),

            // peaq asset configs
            getHydraDXAssetConfig({
              chainId: Polkachain.HydraDX,
              destinationChainId: Polkachain.PeaqAgung,
              symbol: 'USDC',
              feeSymbol: 'HDX',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),
          ],
    ),
    chain: hydraDX,
  });
  const interlayConfig = new ChainConfig({
    assets: [
      getInterlayAssetConfig({
        chainId: Polkachain.Interlay,
        destinationChainId: MOONBEAM_PARACHAIN_ID,
        symbol: 'INTR',
        destinationFeeSymbol: 'INTR',
        destinationFeeAmount: FeeBuilder().assetManager().assetTypeUnitsPerSecond(),
      }),
      getInterlayAssetConfig({
        chainId: Polkachain.Interlay,
        destinationChainId: MOONBEAM_PARACHAIN_ID,
        symbol: 'GLMR',
        destinationFeeSymbol: 'GLMR',
        destinationFeeAmount: 0.01,
      }),
      getInterlayAssetConfig({
        chainId: Polkachain.Interlay,
        destinationChainId: Polkachain.HydraDX,
        symbol: 'INTR',
        destinationFeeSymbol: 'INTR',
        destinationFeeAmount: FeeBuilder().assetManager().assetTypeUnitsPerSecond(),
      }),
      getInterlayAssetConfig({
        chainId: Polkachain.Interlay,
        destinationChainId: Polkachain.HydraDX,
        symbol: 'GLMR',
        destinationFeeSymbol: 'GLMR',
        destinationFeeAmount: 0.01,
      }),
    ].concat(
      CLUSTER === 'mainnet'
        ? [
            // moonbeam asset configs
            getInterlayAssetConfig({
              chainId: Polkachain.Interlay,
              destinationChainId: MOONBEAM_PARACHAIN_ID,
              symbol: 'DAI',
              feeSymbol: 'INTR',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),
            getInterlayAssetConfig({
              chainId: Polkachain.Interlay,
              destinationChainId: MOONBEAM_PARACHAIN_ID,
              symbol: 'USDC',
              feeSymbol: 'INTR',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),
            getInterlayAssetConfig({
              chainId: Polkachain.Interlay,
              destinationChainId: MOONBEAM_PARACHAIN_ID,
              symbol: 'WETH',
              feeSymbol: 'INTR',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),
            getInterlayAssetConfig({
              chainId: Polkachain.Interlay,
              destinationChainId: MOONBEAM_PARACHAIN_ID,
              symbol: 'WBTC',
              feeSymbol: 'INTR',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),

            // hydraDX asset configs
            getInterlayAssetConfig({
              chainId: Polkachain.Interlay,
              destinationChainId: Polkachain.HydraDX,
              symbol: 'DAI',
              feeSymbol: 'INTR',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),
            getInterlayAssetConfig({
              chainId: Polkachain.Interlay,
              destinationChainId: Polkachain.HydraDX,
              symbol: 'USDC',
              feeSymbol: 'INTR',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),
            getInterlayAssetConfig({
              chainId: Polkachain.Interlay,
              destinationChainId: Polkachain.HydraDX,
              symbol: 'WETH',
              feeSymbol: 'INTR',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),
            getInterlayAssetConfig({
              chainId: Polkachain.Interlay,
              destinationChainId: Polkachain.HydraDX,
              symbol: 'WBTC',
              feeSymbol: 'INTR',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),
          ]
        : [
            // moonbeam asset configs
            getInterlayAssetConfig({
              chainId: Polkachain.Interlay,
              destinationChainId: MOONBEAM_PARACHAIN_ID,
              symbol: 'FTM',
              feeSymbol: 'INTR',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),

            // interlay asset configs
            getInterlayAssetConfig({
              chainId: Polkachain.Interlay,
              destinationChainId: Polkachain.HydraDX,
              symbol: 'FTM',
              feeSymbol: 'INTR',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),
          ],
    ),
    chain: interlay,
  });

  const peaqConfig = new ChainConfig({
    assets: [
      getPeaqAssetConfig({
        chainId: Polkachain.PeaqAgung,
        destinationChainId: MOONBEAM_PARACHAIN_ID,
        symbol: 'AGNG',
        destinationFeeSymbol: 'AGNG',
        destinationFeeAmount: FeeBuilder().assetManager().assetTypeUnitsPerSecond(),
      }),
      getPeaqAssetConfig({
        chainId: Polkachain.PeaqAgung,
        destinationChainId: MOONBEAM_PARACHAIN_ID,
        symbol: 'GLMR',
        destinationFeeSymbol: 'GLMR',
        destinationFeeAmount: 0.01,
      }),
      getPeaqAssetConfig({
        chainId: Polkachain.PeaqAgung,
        destinationChainId: Polkachain.HydraDX,
        symbol: 'AGNG',
        destinationFeeSymbol: 'AGNG',
        destinationFeeAmount: FeeBuilder().assetManager().assetTypeUnitsPerSecond(),
      }),
      getPeaqAssetConfig({
        chainId: Polkachain.PeaqAgung,
        destinationChainId: Polkachain.HydraDX,
        symbol: 'GLMR',
        destinationFeeSymbol: 'GLMR',
        destinationFeeAmount: 0.01,
      }),
    ].concat(
      CLUSTER === 'mainnet'
        ? []
        : [
            getPeaqAssetConfig({
              chainId: Polkachain.PeaqAgung,
              destinationChainId: MOONBEAM_PARACHAIN_ID,
              symbol: 'USDC',
              feeSymbol: 'AGNG',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),

            // peaq asset configs
            getPeaqAssetConfig({
              chainId: Polkachain.PeaqAgung,
              destinationChainId: Polkachain.HydraDX,
              symbol: 'USDC',
              feeSymbol: 'AGNG',
              destinationFeeSymbol: 'GLMR',
              destinationFeeAmount: xcGLMRFun,
            }),
          ],
    ),
    chain: peaq,
  });

  chainsConfigList.push(moonbeamConfig, hydraDxConfig, interlayConfig, peaqConfig);

  const chainsConfigMap = new Map<string, ChainConfig>(chainsConfigList.map((config) => [config.chain.key, config]));
  console.log('getChainsConfigMap', moonbeamConfig, hydraDxConfig, interlayConfig, peaqConfig, chainsConfigMap);

  return chainsConfigMap;
}

export const assetsMap = new Map<string, Asset>(
  moonbeamAssets
    .concat(hydraDXAssets, interlayAssets, peaqAssets)
    .map((item) => item.asset)
    .map((asset) => [asset.key, asset]),
);

export const chainsMap = new Map<string, AnyChain>(
  [moonbeam, hydraDX, interlay, peaq].map((chain) => [chain.key, chain]),
);
