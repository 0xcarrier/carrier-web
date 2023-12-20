# Carrier

[![Logo](./src/assets/svgs/carrier-logo.svg)](https://www.carrier.so/)

A powerful token and NFT cross-chain bridge built for Web 3 natives

Powered by [wormhole-foundation](https://github.com/wormhole-foundation). Built by [automata-network](https://github.com/automata-network).

## Document

https://docs.carrier.so

## Install dependency

```
npm i
```

## Configuration

Carrier uses [dotenv-webpack](https://github.com/mrsteele/dotenv-webpack) for configuration.

You can add an .env file on project root with following configurations:

[Example](.env.sample)

## Run on dev mode

```
npm run serve
```

and open localhost:8080 on browser

## Build dist

```
npm run build
```

## Production build

```
npm run build:production
```

## Enviroment

Carrier has two enviroments:

- Staging: Can switch between test net and main net mode, deployed on https://staging.carrier.so
- Production: Carrier Official Website, deployed on https://www.carrier.so

## Tech stack

This app use the following frameworks and tools:

- [Webpack](https://webpack.js.org/)
- [Typescript](https://www.typescriptlang.org/)
- [React](https://react.dev/)
- [Babel](https://babeljs.io/)
- [Ethers](https://github.com/ethers-io/ethers.js/)
- [Linaria](https://github.com/callstack/linaria)

## Project structure

```
├── CODEOWNERS
├── README.md
├── architecture-diagram (architecture design)
├── babel.config.js (babel configuration file)
├── global.d.ts
├── package-lock.json
├── package.json
├── src
│   ├── abis (contract abis)
│   ├── assets (icons and logos)
│   ├── components (UI components)
│   ├── context (contexts and providers)
│   ├── declaration.d.ts
│   ├── global.d.ts
│   ├── hooks (global hooks)
│   ├── index.tsx (main entry)
│   ├── store (global store)
│   └── utils (utils)
├── staticwebapp.config.json (azure static web app configuration file)
├── tsconfig.json (typescript configuration file)
└── webpack.config.js (webpack configuration file)
```

## Workflow

- Select network, wallet, and token
- Attest/register token on source/target network (if already done, skip)
- Create associated account for solana wallet (if existed or target network is not solana, skip)
- Input the amount and do the additional check
- Send the token to the wormhole contract
- Wait for confirmation and finality
- Wait for wormhole to generate the VAA
- Redeem the token by using the vaa on the target network

## Page structure

- [Token bridge](./src/components/TokenBridge/)
- [NFT bridge](./src/components/NFTBridge/)
- [Swap](./src/components/Swap/)
- [Wallet management](./src/components/WalletManagement/)
- [Transaction history](./src/components/TransactionHistory/)
  - [Transaction detail](./src/components/TransactionDetail/)
- [Bridge progress](./src/components/BridgeProgress/)
- [Transaction recovery](./src/components/RecoverySetup/)

## Network Support

Visit [Network configs](./src/utils/consts.ts#L86) to check all supported networks

## USDC CCTP and tBTC

Redeem USDC and tBTC on the supported target network will get the native token (not the wormhole wrapped token)

### USDC CCTP supported networks:

- [Ethereum](https://etherscan.io/address/0xAaDA05BD399372f0b0463744C09113c137636f6a)
- [Avalanche](https://snowtrace.io/address/0x09fb06a271faff70a651047395aaeb6265265f13)
- [Arbitrum](https://arbiscan.io/address/0x2703483b1a5a7c577e8680de9df8be03c6f30e3c)
- [Optimism](https://optimistic.etherscan.io/address/0x2703483B1a5a7c577e8680de9Df8Be03c6f30e3c)

### tBTC supported network:

- [Ethereum](https://etherscan.io/token/0x18084fbA666a33d37592fA2633fD49a74DD93a88)
- [Polygon](https://polygonscan.com/address/0x236aa50979D5f3De3Bd1Eeb40E81137F22ab794b)
- [Arbitrum](https://arbiscan.io/address/0x6c84a8f1c29108f47a79964b5fe888d4f4d0de40)
- [Optimism](https://optimistic.etherscan.io/address/0x6c84a8f1c29108F47a79964b5Fe888D4f4D0dE40)
- [Solana](https://solscan.io/token/6DNSN2BJsaPFdFFc1zP37kkeNe4Usc1Sqkzr9C9vPWcU)

## MRL Bridging

Carrier tokens can be bridged to polkadot parachain via [Moonbeam Routed Liquidity](https://docs.moonbeam.network/builders/interoperability/mrl/).

## Networks that support MRL:

- EVM networks except moonbeam
- HydraDX
- Interlay

## Tokens that support MRL:

- [WETH](https://etherscan.io/address/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2)
- [WBTC](https://etherscan.io/address/0x2260fac5e5542a773aa44fbcfedf7c193bc2c599)
- [USDC](https://etherscan.io/address/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48)
- [DAI](https://etherscan.io/address/0x6b175474e89094c44da98b954eedeac495271d0f)
- [USDT](https://etherscan.io/address/0xdAC17F958D2ee523a2206206994597C13D831ec7) (HydraDX only)

## Copyright and License

See [LICENSE](./LICENSE) file.
