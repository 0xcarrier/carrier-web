import { CHAIN_ID_FANTOM, CHAIN_ID_MOONBEAM } from '@certusone/wormhole-sdk';
import {
  CLUSTER,
  CarrierChainId,
  Polkachain,
  getDefaultNativeCurrencyLogo,
  MOONBEAM_PARACHAIN_ID,
  MOONBEAM_BALANCE_PALLET,
  wormholeChainToEvmChain,
} from '../consts';
import { getPolkadotProviderWithWormholeChainId } from '../polkadot';

export interface PolkachainToken {
  assetId: string;
  location: any;
  tokenAddressOnMoonbeam: string;
  oringinAddress: string;
  originChainId: CarrierChainId;
  symbol: string;
  parachainSymbol?: string;
  name?: string;
  logo?: string;
  decimals: number;
  MRLFees: string;
  existentialDeposit?: string;
  coingeckoId: string;
  isNative: boolean;
  getBalance: (options: { chainId: CarrierChainId; assetId: string; walletAddress: string }) => Promise<string>;
}

type PolkachainTokens = {
  [chainId: number]: PolkachainToken[];
};

export const PolkachainTokens: PolkachainTokens =
  CLUSTER === 'mainnet'
    ? {
        [Polkachain.HydraDX]: [
          {
            assetId: '23',
            tokenAddressOnMoonbeam: '0xc30E9cA94CF52f3Bf5692aaCF81353a27052c46f',
            oringinAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            originChainId: 2,
            location: {
              V3: {
                parents: 1,
                interior: {
                  X3: [
                    {
                      Parachain: 2004,
                    },
                    {
                      PalletInstance: 110,
                    },
                    {
                      AccountKey20: {
                        network: null,
                        key: '0xc30E9cA94CF52f3Bf5692aaCF81353a27052c46f',
                      },
                    },
                  ],
                },
              },
            },
            symbol: 'USDT',
            name: 'USDT (Wormhole)',
            decimals: 6,
            logo: `https://logos.covalenthq.com/tokens/${wormholeChainToEvmChain[CHAIN_ID_MOONBEAM]}/0xc30E9cA94CF52f3Bf5692aaCF81353a27052c46f.png`,
            isNative: false,
            MRLFees: '2724',
            existentialDeposit: '10000',
            coingeckoId: 'tether',
            getBalance: getBalanceFromHydraDX,
          },
          {
            assetId: '18',
            tokenAddressOnMoonbeam: '0x06e605775296e851FF43b4dAa541Bb0984E9D6fD',
            oringinAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
            originChainId: 2,
            location: {
              V3: {
                parents: 1,
                interior: {
                  X3: [
                    {
                      Parachain: 2004,
                    },
                    {
                      PalletInstance: 110,
                    },
                    {
                      AccountKey20: {
                        network: null,
                        key: '0x06e605775296e851ff43b4daa541bb0984e9d6fd',
                      },
                    },
                  ],
                },
              },
            },
            symbol: 'DAI',
            name: 'DAI (Wormhole)',
            decimals: 18,
            logo: `https://logos.covalenthq.com/tokens/${wormholeChainToEvmChain[CHAIN_ID_MOONBEAM]}/0x06e605775296e851FF43b4dAa541Bb0984E9D6fD.png`,
            isNative: false,
            MRLFees: '2725092147435723',
            existentialDeposit: '10000000000000000',
            coingeckoId: 'dai',
            getBalance: getBalanceFromHydraDX,
          },
          {
            assetId: '19',
            tokenAddressOnMoonbeam: '0xE57eBd2d67B462E9926e04a8e33f01cD0D64346D',
            oringinAddress: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
            originChainId: 2,
            location: {
              V3: {
                parents: 1,
                interior: {
                  X3: [
                    {
                      Parachain: 2004,
                    },
                    {
                      PalletInstance: 110,
                    },
                    {
                      AccountKey20: {
                        network: null,
                        key: '0xe57ebd2d67b462e9926e04a8e33f01cd0d64346d',
                      },
                    },
                  ],
                },
              },
            },
            symbol: 'WBTC',
            name: 'WBTC (Wormhole)',
            logo: `https://logos.covalenthq.com/tokens/${wormholeChainToEvmChain[CHAIN_ID_MOONBEAM]}/0xE57eBd2d67B462E9926e04a8e33f01cD0D64346D.png`,
            decimals: 8,
            isNative: false,
            MRLFees: '9',
            existentialDeposit: '34',
            coingeckoId: 'bitcoin',
            getBalance: getBalanceFromHydraDX,
          },
          {
            assetId: '20',
            tokenAddressOnMoonbeam: '0xab3f0245B83feB11d15AAffeFD7AD465a59817eD',
            oringinAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            originChainId: 2,
            location: {
              V3: {
                parents: 1,
                interior: {
                  X3: [
                    {
                      Parachain: 2004,
                    },
                    {
                      PalletInstance: 110,
                    },
                    {
                      AccountKey20: {
                        network: null,
                        key: '0xab3f0245b83feb11d15aaffefd7ad465a59817ed',
                      },
                    },
                  ],
                },
              },
            },
            symbol: 'WETH',
            name: 'WETH (Wormhole)',
            logo: `https://logos.covalenthq.com/tokens/${wormholeChainToEvmChain[CHAIN_ID_MOONBEAM]}/0xab3f0245B83feB11d15AAffeFD7AD465a59817eD.png`,
            decimals: 18,
            isNative: false,
            MRLFees: '1469052370585',
            existentialDeposit: '5390835579515',
            coingeckoId: 'ethereum',
            getBalance: getBalanceFromHydraDX,
          },
          {
            assetId: '21',
            tokenAddressOnMoonbeam: '0x931715FEE2d06333043d11F658C8CE934aC61D0c',
            oringinAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            originChainId: 2,
            location: {
              V3: {
                parents: 1,
                interior: {
                  X3: [
                    {
                      Parachain: 2004,
                    },
                    {
                      PalletInstance: 110,
                    },
                    {
                      AccountKey20: {
                        network: null,
                        key: '0x931715fee2d06333043d11f658c8ce934ac61d0c',
                      },
                    },
                  ],
                },
              },
            },
            symbol: 'USDC',
            name: 'USD Coin (Ethereum)',
            logo: `https://logos.covalenthq.com/tokens/${wormholeChainToEvmChain[CHAIN_ID_MOONBEAM]}/0x931715FEE2d06333043d11F658C8CE934aC61D0c.png`,
            decimals: 6,
            isNative: false,
            MRLFees: '2725',
            existentialDeposit: '10000',
            coingeckoId: 'usd-coin',
            getBalance: getBalanceFromHydraDX,
          },
        ],
        [Polkachain.Interlay]: [
          {
            assetId: '4',
            tokenAddressOnMoonbeam: '0x06e605775296e851FF43b4dAa541Bb0984E9D6fD',
            oringinAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
            originChainId: 2,
            location: {
              V3: {
                parents: 1,
                interior: {
                  X3: [
                    {
                      Parachain: 2004,
                    },
                    {
                      PalletInstance: 110,
                    },
                    {
                      AccountKey20: {
                        network: null,
                        key: '0x06e605775296e851ff43b4daa541bb0984e9d6fd',
                      },
                    },
                  ],
                },
              },
            },
            symbol: 'DAI',
            name: 'DAI (Wormhole)',
            decimals: 18,
            logo: `https://logos.covalenthq.com/tokens/${wormholeChainToEvmChain[CHAIN_ID_MOONBEAM]}/0x06e605775296e851FF43b4dAa541Bb0984E9D6fD.png`,
            isNative: false,
            MRLFees: '9510848000000000',
            existentialDeposit: '0',
            coingeckoId: 'dai',
            getBalance: getBalanceFromInterlay,
          },
          {
            assetId: '9',
            tokenAddressOnMoonbeam: '0xE57eBd2d67B462E9926e04a8e33f01cD0D64346D',
            oringinAddress: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
            originChainId: 2,
            location: {
              V3: {
                parents: 1,
                interior: {
                  X3: [
                    {
                      Parachain: 2004,
                    },
                    {
                      PalletInstance: 110,
                    },
                    {
                      AccountKey20: {
                        network: null,
                        key: '0xe57ebd2d67b462e9926e04a8e33f01cd0d64346d',
                      },
                    },
                  ],
                },
              },
            },
            symbol: 'WBTC',
            name: 'WBTC (Wormhole)',
            logo: `https://logos.covalenthq.com/tokens/${wormholeChainToEvmChain[CHAIN_ID_MOONBEAM]}/0xE57eBd2d67B462E9926e04a8e33f01cD0D64346D.png`,
            decimals: 8,
            isNative: false,
            MRLFees: '32',
            existentialDeposit: '0',
            coingeckoId: 'bitcoin',
            getBalance: getBalanceFromInterlay,
          },
          {
            assetId: '6',
            tokenAddressOnMoonbeam: '0xab3f0245B83feB11d15AAffeFD7AD465a59817eD',
            oringinAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            originChainId: 2,
            location: {
              V3: {
                parents: 1,
                interior: {
                  X3: [
                    {
                      Parachain: 2004,
                    },
                    {
                      PalletInstance: 110,
                    },
                    {
                      AccountKey20: {
                        network: null,
                        key: '0xab3f0245b83feb11d15aaffefd7ad465a59817ed',
                      },
                    },
                  ],
                },
              },
            },
            symbol: 'WETH',
            name: 'WETH (Wormhole)',
            logo: `https://logos.covalenthq.com/tokens/${wormholeChainToEvmChain[CHAIN_ID_MOONBEAM]}/0xab3f0245B83feB11d15AAffeFD7AD465a59817eD.png`,
            decimals: 18,
            isNative: false,
            MRLFees: '6',
            existentialDeposit: '0',
            coingeckoId: 'ethereum',
            getBalance: getBalanceFromInterlay,
          },
          {
            assetId: '8',
            tokenAddressOnMoonbeam: '0x931715FEE2d06333043d11F658C8CE934aC61D0c',
            oringinAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            originChainId: 2,
            location: {
              V3: {
                parents: 1,
                interior: {
                  X3: [
                    {
                      Parachain: 2004,
                    },
                    {
                      PalletInstance: 110,
                    },
                    {
                      AccountKey20: {
                        network: null,
                        key: '0x931715fee2d06333043d11f658c8ce934ac61d0c',
                      },
                    },
                  ],
                },
              },
            },
            symbol: 'USDC',
            name: 'USD Coin (Ethereum)',
            logo: `https://logos.covalenthq.com/tokens/${wormholeChainToEvmChain[CHAIN_ID_MOONBEAM]}/0x931715FEE2d06333043d11F658C8CE934aC61D0c.png`,
            decimals: 6,
            isNative: false,
            MRLFees: '9510',
            existentialDeposit: '0',
            coingeckoId: 'usd-coin',
            getBalance: getBalanceFromInterlay,
          },
        ],
      }
    : {
        [Polkachain.Manta]: [
          {
            assetId: '9',
            tokenAddressOnMoonbeam: '0x566c1cebc6A4AFa1C122E039C4BEBe77043148Ee',
            oringinAddress: '0xf1277d1ed8ad466beddf92ef448a132661956621',
            originChainId: 10,
            location: {
              V1: {
                parents: 1,
                interior: {
                  X3: [
                    { Parachain: 1000 },
                    { PalletInstance: 48 },
                    { AccountKey20: { network: 'Any', key: '0x566c1cebc6a4afa1c122e039c4bebe77043148ee' } },
                  ],
                },
              },
            },
            symbol: 'FTM',
            name: 'FTM (Wormhole)',
            logo: getDefaultNativeCurrencyLogo(CHAIN_ID_FANTOM),
            decimals: 18,
            isNative: false,
            MRLFees: '59510025949516395',
            coingeckoId: 'fantom',
            getBalance: getBalanceFromManta,
          },
          {
            assetId: '8',
            tokenAddressOnMoonbeam: '0xe5de10c4b744bac6b783faf8d9b9fdff14acc3c9',
            oringinAddress: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
            originChainId: 2,
            location: {
              V1: {
                parents: 1,
                interior: {
                  X3: [
                    { Parachain: 1000 },
                    { PalletInstance: 48 },
                    { AccountKey20: { network: 'Any', key: '0xe5de10c4b744bac6b783faf8d9b9fdff14acc3c9' } },
                  ],
                },
              },
            },
            symbol: 'USDC',
            name: 'USDC (Wormhole)',
            decimals: 6,
            isNative: false,
            MRLFees: '0',
            coingeckoId: 'usd-coin',
            getBalance: getBalanceFromManta,
          },
        ],
        [Polkachain.HydraDX]: [
          {
            assetId: '1000002',
            tokenAddressOnMoonbeam: '0x566c1cebc6A4AFa1C122E039C4BEBe77043148Ee',
            oringinAddress: '0xf1277d1ed8ad466beddf92ef448a132661956621',
            originChainId: 10,
            location: {
              V3: {
                parents: 1,
                interior: {
                  X3: [
                    { Parachain: 1000 },
                    { PalletInstance: 48 },
                    { AccountKey20: { network: null, key: '0x566c1cebc6a4afa1c122e039c4bebe77043148ee' } },
                  ],
                },
              },
            },
            symbol: 'FTM',
            name: 'FTM (Wormhole)',
            logo: getDefaultNativeCurrencyLogo(CHAIN_ID_FANTOM),
            decimals: 18,
            isNative: false,
            MRLFees: '3773886688833023',
            coingeckoId: 'fantom',
            getBalance: getBalanceFromHydraDX,
          },
          {
            assetId: '1000001',
            tokenAddressOnMoonbeam: '0xe5de10c4b744bac6b783faf8d9b9fdff14acc3c9',
            oringinAddress: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
            originChainId: 2,
            location: {
              V3: {
                parents: 1,
                interior: {
                  X3: [
                    { Parachain: 1000 },
                    { PalletInstance: 48 },
                    { AccountKey20: { network: null, key: '0xe5de10c4b744bac6b783faf8d9b9fdff14acc3c9' } },
                  ],
                },
              },
            },
            symbol: 'USDC',
            name: 'USDC (Wormhole)',
            decimals: 6,
            isNative: false,
            MRLFees: '1554',
            coingeckoId: 'usd-coin',
            getBalance: getBalanceFromHydraDX,
          },
        ],
        [Polkachain.Interlay]: [
          {
            assetId: '2',
            tokenAddressOnMoonbeam: '0x566c1cebc6A4AFa1C122E039C4BEBe77043148Ee',
            oringinAddress: '0xf1277d1ed8ad466beddf92ef448a132661956621',
            originChainId: 10,
            location: {
              V3: {
                parents: 1,
                interior: {
                  X3: [
                    { Parachain: 1000 },
                    { PalletInstance: 48 },
                    { AccountKey20: { network: null, key: '0x566c1cebc6A4AFa1C122E039C4BEBe77043148Ee' } },
                  ],
                },
              },
            },
            symbol: 'FTM',
            name: 'FTM (Wormhole)',
            logo: getDefaultNativeCurrencyLogo(CHAIN_ID_FANTOM),
            decimals: 18,
            isNative: false,
            MRLFees: '800000000000000',
            coingeckoId: 'fantom',
            getBalance: getBalanceFromInterlay,
          },
        ],
        [Polkachain.PeaqAgung]: [
          {
            assetId: '131',
            tokenAddressOnMoonbeam: '0xe5de10c4b744bac6b783faf8d9b9fdff14acc3c9',
            oringinAddress: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
            originChainId: 2,
            location: {
              V3: {
                parents: 1,
                interior: {
                  X3: [
                    { Parachain: 1000 },
                    { PalletInstance: 48 },
                    { AccountKey20: { network: null, key: '0xe5de10c4b744bac6b783faf8d9b9fdff14acc3c9' } },
                  ],
                },
              },
            },
            symbol: 'USDC',
            parachainSymbol: 'XCUSDC',
            name: 'USDC (Wormhole)',
            decimals: 6,
            isNative: false,
            MRLFees: '0',
            existentialDeposit: '500',
            coingeckoId: 'usd-coin',
            getBalance: getBalanceFromPeaq,
          },
        ],
      };

export interface XcGLMR {
  assetId: string;
  location: any;
  decimals: number;
  symbol: string;
  getBalance: (options: { chainId: CarrierChainId; assetId: string; walletAddress: string }) => Promise<string>;
}

type PolkachainXcGLMR = {
  [chainId: number]: XcGLMR;
};

export const PolkachainXcGLMR: PolkachainXcGLMR =
  CLUSTER === 'mainnet'
    ? {
        [Polkachain.HydraDX]: {
          assetId: '16',
          location: {
            V3: {
              parents: 1,
              interior: {
                X2: [{ Parachain: MOONBEAM_PARACHAIN_ID }, { PalletInstance: MOONBEAM_BALANCE_PALLET }],
              },
            },
          },
          symbol: 'GLMR',
          decimals: 18,
          getBalance: getBalanceFromHydraDX,
        },
        [Polkachain.Interlay]: {
          assetId: '10',
          location: {
            V3: {
              parents: 1,
              interior: {
                X2: [{ Parachain: MOONBEAM_PARACHAIN_ID }, { PalletInstance: MOONBEAM_BALANCE_PALLET }],
              },
            },
          },
          symbol: 'GLMR',
          decimals: 18,
          getBalance: getBalanceFromInterlay,
        },
      }
    : {
        [Polkachain.HydraDX]: {
          assetId: '1',
          location: {
            V3: {
              parents: 1,
              interior: {
                X2: [{ Parachain: MOONBEAM_PARACHAIN_ID }, { PalletInstance: MOONBEAM_BALANCE_PALLET }],
              },
            },
          },
          symbol: 'DEV',
          decimals: 18,
          getBalance: getBalanceFromHydraDX,
        },
        [Polkachain.Manta]: {
          assetId: '10',
          location: {
            V1: {
              parents: 1,
              interior: {
                X2: [{ Parachain: MOONBEAM_PARACHAIN_ID }, { PalletInstance: MOONBEAM_BALANCE_PALLET }],
              },
            },
          },
          symbol: 'DEV',
          decimals: 18,
          getBalance: getBalanceFromManta,
        },
        [Polkachain.Interlay]: {
          assetId: '1',
          location: {
            V3: {
              parents: 1,
              interior: {
                X2: [{ Parachain: MOONBEAM_PARACHAIN_ID }, { PalletInstance: MOONBEAM_BALANCE_PALLET }],
              },
            },
          },
          symbol: 'DEV',
          decimals: 18,
          getBalance: getBalanceFromInterlay,
        },
        [Polkachain.PeaqAgung]: {
          assetId: '130',
          location: {
            V3: {
              parents: 1,
              interior: {
                X2: [{ Parachain: MOONBEAM_PARACHAIN_ID }, { PalletInstance: MOONBEAM_BALANCE_PALLET }],
              },
            },
          },
          symbol: 'MBA',
          decimals: 18,
          getBalance: getBalanceFromPeaq,
        },
      };

async function getBalanceFromManta(options: {
  chainId: CarrierChainId;
  assetId: string;
  walletAddress: string;
}): Promise<string> {
  const { chainId, assetId, walletAddress } = options;
  const parachainAPI = await getPolkadotProviderWithWormholeChainId(chainId);
  const result = await parachainAPI.query.assets.account<any>(BigInt(assetId), walletAddress);
  const resultUnwrapped = result.isSome ? result.unwrap() : undefined;
  const balance = resultUnwrapped ? resultUnwrapped.balance : undefined;

  return balance ? balance.toString() : '0';
}

async function getBalanceFromHydraDX(options: {
  chainId: CarrierChainId;
  assetId: string;
  walletAddress: string;
}): Promise<string> {
  const { chainId, assetId, walletAddress } = options;
  const parachainAPI = await getPolkadotProviderWithWormholeChainId(chainId);
  const result = await parachainAPI.query.tokens.accounts<any>(walletAddress, BigInt(assetId));

  return result?.free?.toString() || '0';
}

async function getBalanceFromInterlay(options: {
  chainId: CarrierChainId;
  assetId: string;
  walletAddress: string;
}): Promise<string> {
  const { chainId, assetId, walletAddress } = options;
  const parachainAPI = await getPolkadotProviderWithWormholeChainId(chainId);
  const result = await parachainAPI.query.tokens.accounts<any>(walletAddress, {
    ForeignAsset: BigInt(assetId),
  });

  console.log('getBalanceFromInterlay', result?.free?.toString());

  return result?.free?.toString() || '0';
}

async function getBalanceFromPeaq(options: {
  chainId: CarrierChainId;
  assetId: string;
  walletAddress: string;
}): Promise<string> {
  const { chainId, assetId, walletAddress } = options;
  const parachainAPI = await getPolkadotProviderWithWormholeChainId(chainId);
  const token = PolkachainTokens[chainId].find((item) => item.assetId === assetId);
  const xcGLMR = PolkachainXcGLMR[chainId];
  const result = await parachainAPI.query.tokens.accounts<any>(walletAddress, {
    TOKEN: xcGLMR.assetId === assetId ? xcGLMR.symbol : token?.parachainSymbol || token?.symbol,
  });

  return result?.free?.toString() || '0';
}

export function isPolkachainTokens(options: { chainId: CarrierChainId; tokenAddress: string }) {
  const { chainId, tokenAddress } = options;
  return PolkachainTokens[chainId]?.some((item) => item.assetId === tokenAddress);
}
