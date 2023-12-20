import React from 'react';

import {
  CHAIN_ID_ACALA,
  CHAIN_ID_ALGORAND,
  CHAIN_ID_ARBITRUM,
  CHAIN_ID_AURORA,
  CHAIN_ID_AVAX,
  CHAIN_ID_BASE,
  CHAIN_ID_BSC,
  CHAIN_ID_CELO,
  CHAIN_ID_ETH,
  CHAIN_ID_FANTOM,
  CHAIN_ID_KARURA,
  CHAIN_ID_KLAYTN,
  CHAIN_ID_MOONBEAM,
  CHAIN_ID_OASIS,
  CHAIN_ID_OPTIMISM,
  CHAIN_ID_POLYGON,
  CHAIN_ID_SOLANA,
  CHAIN_ID_TERRA,
} from '@certusone/wormhole-sdk';
import { ethers } from 'ethers';
import { ReactNode } from 'react';
import { CarrierChainId, ChainInfo, CHAINS, NFTBridgeChains, Polkachain, TokenBridgeChains } from '../../utils/consts';
import { PublicKey } from '@solana/web3.js';
import { css } from '@linaria/core';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import uniq from 'lodash/uniq';
import uniqWith from 'lodash/uniqWith';
import uniqBy from 'lodash/uniqBy';
import { TokensDataResult } from '../../hooks/useTokens';
import { NFTData } from '../../utils/tokenData/helper';
import { Wallet, errorIncorrectChain } from '../../hooks/useWallet';
import { WalletState } from '../../context/Wallet/types';
import { errorIncorrectWallet } from '../../hooks/useWallet';
import { isCarrierEVMChain } from '../../utils/web3Utils';

export interface Action {
  key: string;
  content: ReactNode;
  className: string;
  onClick?: () => void;
  children?: Action[];
}

interface ChainName {
  id: CarrierChainId;
  names: string[];
}

export const CHAIN_NAMES: ChainName[] = [
  {
    id: CHAIN_ID_ACALA,
    names: ['acala'],
  },
  {
    id: CHAIN_ID_AURORA,
    names: ['aurora'],
  },
  {
    id: CHAIN_ID_AVAX,
    names: ['avalanche', 'avax'],
  },
  {
    id: CHAIN_ID_BSC,
    names: ['bnb', 'bsc'],
  },
  {
    id: CHAIN_ID_BASE,
    names: ['base'],
  },
  {
    id: CHAIN_ID_CELO,
    names: ['celo'],
  },
  {
    id: CHAIN_ID_ETH,
    names: ['eth', 'ethereum'],
  },
  {
    id: CHAIN_ID_FANTOM,
    names: ['fantom'],
  },
  {
    id: CHAIN_ID_KARURA,
    names: ['karura'],
  },
  {
    id: CHAIN_ID_KLAYTN,
    names: ['klaytn'],
  },
  {
    id: CHAIN_ID_OASIS,
    names: ['oasis'],
  },
  {
    id: CHAIN_ID_POLYGON,
    names: ['polygon'],
  },
  {
    id: CHAIN_ID_SOLANA,
    names: ['solana', 'sol'],
  },
  {
    id: CHAIN_ID_ARBITRUM,
    names: ['arbitrum'],
  },
  {
    id: CHAIN_ID_MOONBEAM,
    names: ['moonbeam'],
  },
  {
    id: CHAIN_ID_TERRA,
    names: ['terra'],
  },
  {
    id: CHAIN_ID_ALGORAND,
    names: ['algorand', 'algo'],
  },
  {
    id: CHAIN_ID_OPTIMISM,
    names: ['optimism', 'op'],
  },
  {
    id: Polkachain.HydraDX,
    names: ['hydradx'],
  },
  {
    id: Polkachain.PeaqAgung,
    names: ['peaq'],
  },
  {
    id: Polkachain.Manta,
    names: ['manta'],
  },
  {
    id: Polkachain.Interlay,
    names: ['intr', 'interlay'],
  },
];

export interface ParsedCommand {
  unparsedCommand: string;
  command?: string;
  fromString?: string;
  sourceChain?: string;
  toString?: string;
  targetChain?: string;
  firstFragmentSplitter?: string;
  symbol?: string;
  amount?: string;
  contractAddress?: string;
  tokenId?: string;
}

export function parseTokenTransferCommand(commandStr: string): ParsedCommand {
  const [segment1, segment2] = commandStr.split(',');
  const [command, fromString, sourceChain, toString, targetChain] = segment1.trim().split(' ');
  const [amount, unparsedSymbol] = segment2 ? segment2.trim().split(' ') : [];

  let symbol: string | undefined, contractAddress: string | undefined;

  if (unparsedSymbol) {
    if (unparsedSymbol.includes('0x')) {
      contractAddress = unparsedSymbol;
    } else {
      symbol = unparsedSymbol;
    }
  }

  const hasFirstFragmentSplitter = segment1 && commandStr.indexOf(',') !== -1 ? true : false;

  return {
    unparsedCommand: commandStr,
    command,
    fromString,
    sourceChain,
    toString,
    targetChain,
    firstFragmentSplitter: hasFirstFragmentSplitter ? ',' : undefined,
    amount,
    symbol,
    contractAddress,
  };
}

export function parseNFTTransferCommand(commandStr: string): ParsedCommand {
  const [segment1, segment2] = commandStr.split(',');
  const [command, fromString, sourceChain, toString, targetChain] = segment1.trim().split(' ');
  const [unparsedSymbol, tokenId] = segment2 ? segment2.trim().split('#') : [];
  const sourceChainInfo = getChainByShortName(sourceChain);

  let symbol: string | undefined, contractAddress: string | undefined;

  if (unparsedSymbol) {
    if (sourceChainInfo && sourceChainInfo.id === CHAIN_ID_SOLANA) {
      contractAddress = unparsedSymbol;
    } else if (unparsedSymbol.includes('0x')) {
      contractAddress = unparsedSymbol;
    } else {
      symbol = unparsedSymbol;
    }
  }

  const hasFirstFragmentSplitter = segment1 && commandStr.indexOf(',') !== -1 ? true : false;

  return {
    unparsedCommand: commandStr,
    command,
    fromString,
    sourceChain,
    toString,
    targetChain,
    firstFragmentSplitter: hasFirstFragmentSplitter ? ',' : undefined,
    amount: '1',
    symbol,
    contractAddress,
    tokenId: sourceChainInfo && sourceChainInfo.id !== CHAIN_ID_SOLANA ? tokenId : undefined,
  };
}

export enum Command {
  Bridge = 'bridge',
}

export const validCommands = [Command.Bridge];
const validFromString = 'from';
const validToString = 'to';
const amountRegexp = /^[0-9.]*$/;

export function validateCommand(parsedCommand: ParsedCommand, isNFT: boolean) {
  const { command, fromString, toString, sourceChain, targetChain, amount, contractAddress } = parsedCommand;
  const isValidCommand = command
    ? validCommands.some((item) => item.toLowerCase().startsWith(command.toLowerCase()))
    : true;
  const isValidFromString = fromString ? validFromString.startsWith(fromString.toLowerCase()) : true;
  const isValidToString = toString ? validToString.startsWith(toString.toLowerCase()) : true;
  const chains = isNFT ? NFTBridgeChains : TokenBridgeChains;
  const isValidSourceChain = sourceChain ? fuzzyMatchChainByShortName({ name: sourceChain, chains }) != null : true;
  const { exactlyMatchedChain: exactlyMatchedTargetChain } = fuzzyMatchChainByShortName({ name: targetChain, chains });
  const isValidTargetChain =
    targetChain && exactlyMatchedTargetChain ? exactlyMatchedTargetChain.matchedName !== sourceChain : true;
  const isValidAmount = amount ? amountRegexp.test(amount) : true;
  let isValidContractAddress = true;

  const sourceChainInfo = getChainByShortName(sourceChain);

  if (contractAddress && sourceChainInfo) {
    if (isCarrierEVMChain(sourceChainInfo.id)) {
      try {
        ethers.utils.getAddress(contractAddress);
      } catch (e) {
        isValidContractAddress = false;
      }
    } else if (sourceChainInfo.id === CHAIN_ID_SOLANA) {
      try {
        new PublicKey(contractAddress);
      } catch (e) {
        isValidContractAddress = false;
      }
    }
  }

  return {
    isValidCommand,
    isValidFromString,
    isValidToString,
    isValidSourceChain,
    isValidTargetChain,
    isValidAmount,
    isValidContractAddress,
  };
}

export function validateCommandFinshed(parsedCommand: ParsedCommand, isNFT: boolean) {
  const {
    command,
    fromString,
    sourceChain,
    toString,
    targetChain,
    firstFragmentSplitter,
    symbol,
    amount,
    contractAddress,
    tokenId,
  } = parsedCommand;
  const isValidCommand = command
    ? validCommands.map((item) => item.toLowerCase()).includes(command.toLowerCase())
    : false;
  const isValidFromString = fromString ? fromString === 'from' : false;
  const isValidToString = toString ? toString === 'to' : false;
  const isValidSourceChain = sourceChain ? getChainByShortName(sourceChain) != null : false;
  const isValidTargetChain = targetChain
    ? sourceChain !== targetChain && getChainByShortName(targetChain) != null
    : false;
  const isValidFirstFragmentSplitter = firstFragmentSplitter === ',';
  const isValidAmount = amount ? amountRegexp.test(amount) : false;

  let isValidContractAddress = symbol ? true : false;
  const sourceChainInfo = getChainByShortName(sourceChain);

  if (contractAddress && sourceChainInfo) {
    if (isCarrierEVMChain(sourceChainInfo.id)) {
      try {
        ethers.utils.getAddress(contractAddress);

        isValidContractAddress = true;
      } catch (e) {}
    } else if (sourceChainInfo.id === CHAIN_ID_SOLANA) {
      try {
        new PublicKey(contractAddress);

        isValidContractAddress = true;
      } catch (e) {}
    } else {
      isValidContractAddress = true;
    }
  }

  const isValidSymbol = contractAddress ? true : !!symbol;
  const isValidTokenId = isNFT && sourceChainInfo?.id !== CHAIN_ID_SOLANA ? !!tokenId : true;

  console.log('validateCommandFinshed', {
    isValidCommand,
    isValidFromString,
    isValidToString,
    isValidSourceChain,
    isValidTargetChain,
    isValidFirstFragmentSplitter,
    isValidAmount,
    isValidSymbol,
    isValidTokenId,
    isValidContractAddress,
  });

  return {
    isValidCommand,
    isValidFromString,
    isValidToString,
    isValidSourceChain,
    isValidTargetChain,
    isValidFirstFragmentSplitter,
    isValidAmount,
    isValidSymbol,
    isValidTokenId,
    isValidContractAddress,
    error:
      !isValidCommand ||
      !isValidFromString ||
      !isValidToString ||
      !isValidSourceChain ||
      !isValidTargetChain ||
      !isValidFirstFragmentSplitter ||
      !isValidAmount ||
      !isValidSymbol ||
      !isValidTokenId ||
      !isValidContractAddress
        ? new Error(
            !isValidCommand
              ? `Invalid command: ${parsedCommand.command}`
              : !isValidSourceChain
              ? `Invalid source chain: ${parsedCommand.sourceChain}`
              : !isValidTargetChain
              ? `Invalid destination chain: ${parsedCommand.targetChain}`
              : !isValidFirstFragmentSplitter
              ? `Invalid destination chain: ${parsedCommand.targetChain}`
              : !isValidAmount
              ? `Invalid amount: ${parsedCommand.amount}`
              : !isValidSymbol
              ? `Invalid symbol`
              : !isValidTokenId
              ? `Invalid token Id`
              : !isValidContractAddress
              ? `Invalid address: ${parsedCommand.contractAddress}`
              : `Invalid command: ${parsedCommand.unparsedCommand}`,
          )
        : undefined,
  };
}

export function getSourceChainByCommand(parsedCommand: ParsedCommand) {
  const { sourceChain } = parsedCommand;

  const chain = getChainByShortName(sourceChain);

  return chain;
}

export function getTargetChainByCommand(parsedCommand: ParsedCommand) {
  const { targetChain } = parsedCommand;

  const chain = getChainByShortName(targetChain);

  return chain;
}

const recentlyUsedTokenCommandKey = 'recentlyUsedTokenCommand';
const recentlyUsedNFTCommandKey = 'recentlyUsedNFTCommand';
const commandsCacheCount = 10;

export function setRecentlyUsedCommand(command: string, isNFT: boolean) {
  const commands = getRecentlyUsedCommand(isNFT);

  commands.unshift(command);

  const uniqueCommands = uniq(commands).slice(0, commandsCacheCount);

  localStorage.setItem(isNFT ? recentlyUsedNFTCommandKey : recentlyUsedTokenCommandKey, JSON.stringify(uniqueCommands));
}

export function getRecentlyUsedCommand(isNFT: boolean): string[] {
  const commands = localStorage.getItem(isNFT ? recentlyUsedNFTCommandKey : recentlyUsedTokenCommandKey);
  const parsedCommands = commands ? JSON.parse(commands) : [];

  return parsedCommands;
}

const recentlyUsedSourceChainKey = 'recentlyUsedSourceChain';
const sourceChainCacheCount = 10;

export function setRecentlyUsedSourceChain(chainId: number) {
  const sourceChains = getRecentlyUsedSourceChain();

  sourceChains.unshift(chainId);

  const uniqueSourceChains = uniq(sourceChains).slice(0, sourceChainCacheCount);

  localStorage.setItem(recentlyUsedSourceChainKey, JSON.stringify(uniqueSourceChains));
}

export function getRecentlyUsedSourceChain(): number[] {
  const sourceChains = localStorage.getItem(recentlyUsedSourceChainKey);
  const parsedSourceChains = sourceChains ? JSON.parse(sourceChains) : [];

  return parsedSourceChains;
}

const recentlyUsedTargetChainKey = 'recentlyUsedTargetChain';
const targetChainCacheCount = 10;

export function setRecentlyUsedTargetChain(chainId: number) {
  const targetChains = getRecentlyUsedTargetChain();

  targetChains.unshift(chainId);

  const uniqueTargetChains = uniq(targetChains).slice(0, targetChainCacheCount);

  localStorage.setItem(recentlyUsedTargetChainKey, JSON.stringify(uniqueTargetChains));
}

export function getRecentlyUsedTargetChain(): number[] {
  const targetChains = localStorage.getItem(recentlyUsedTargetChainKey);
  const parsedTargetChains = targetChains ? JSON.parse(targetChains) : [];

  return parsedTargetChains;
}

const recentlyUsedTokenKey = 'recentlyUsedToken';
const recentlyUsedNFTKey = 'recentlyUsedNFT';
const tokenCacheCount = 5;

interface RecentlyUsedToken {
  symbol?: string;
  contractAddress?: string;
  tokenId?: string;
}

export function setRecentlyUsedToken(token: RecentlyUsedToken, isNFT: boolean) {
  const tokens = getRecentlyUsedToken(isNFT);

  tokens.unshift(token);

  const uniqueTargetChains = uniqWith(tokens, (a, b) => {
    return a.symbol === b.symbol && a.contractAddress === b.contractAddress && a.tokenId === b.tokenId;
  }).slice(0, tokenCacheCount);

  localStorage.setItem(isNFT ? recentlyUsedNFTKey : recentlyUsedTokenKey, JSON.stringify(uniqueTargetChains));
}

export function getRecentlyUsedToken(isNFT: boolean): RecentlyUsedToken[] {
  const tokens = localStorage.getItem(isNFT ? recentlyUsedNFTKey : recentlyUsedTokenKey);
  const parsedTokens = tokens ? JSON.parse(tokens) : [];

  return parsedTokens;
}

export function getChainByShortName(name?: string) {
  const chainName = name
    ? CHAIN_NAMES.find((item) => item.names.some((item) => item.toLowerCase() === name.toLowerCase()))
    : undefined;
  const chain = chainName ? CHAINS.find((item) => item.id === chainName.id) : undefined;

  return chain;
}

interface FuzzyChainNameMatchedResult {
  matchedName: string;
  chainName: ChainName;
}

interface FuzzyChainMatchedResult {
  matchedName: string;
  chain: ChainInfo;
}

export function fuzzyMatchChainByShortName(options: { name?: string; chains: ChainInfo[] }) {
  const { name, chains } = options;
  const exactlyMatchedChainName = name
    ? (CHAIN_NAMES.map((item) => {
        const matchedChainName = item.names
          .sort((a, b) => a.length - b.length)
          .find((item) => {
            const matched = item.toLowerCase() === name.toLowerCase();

            return matched;
          });

        if (matchedChainName) {
          return {
            matchedName: matchedChainName,
            chainName: item,
          };
        }
      }).find((item) => item != null) as FuzzyChainNameMatchedResult)
    : undefined;
  const fuzzyMatchedChainNames =
    !exactlyMatchedChainName && name
      ? (CHAIN_NAMES.map((item) => {
          const matchedChainName = item.names
            .sort((a, b) => a.length - b.length)
            .find((item) => {
              const matched =
                item.toLowerCase() !== name.toLowerCase() && item.toLowerCase().startsWith(name.toLowerCase());

              return matched;
            });

          if (matchedChainName) {
            return {
              matchedName: matchedChainName,
              chainName: item,
            };
          }
        }).filter((item) => item != null) as FuzzyChainNameMatchedResult[])
      : undefined;
  const chain = chains.find((chain) => chain.id === exactlyMatchedChainName?.chainName.id);
  const exactlyMatchedChain =
    chain && exactlyMatchedChainName
      ? {
          matchedName: exactlyMatchedChainName.matchedName,
          chain,
        }
      : undefined;
  const fuzzyMatchedChains =
    fuzzyMatchedChainNames && fuzzyMatchedChainNames.length
      ? (fuzzyMatchedChainNames
          .map((item) => {
            const chain = chains.find((chain) => chain.id === item.chainName.id);

            if (chain) {
              return {
                matchedName: item.matchedName,
                chain,
              };
            }
          })
          .filter((item) => item != null) as FuzzyChainMatchedResult[])
      : undefined;

  return { exactlyMatchedChain, fuzzyMatchedChains };
}

export function getActions(options: {
  command: string;
  parsedCommand: ParsedCommand;
  executionError: string;
  isNFT: boolean;
  processing: boolean;
  sourceChainId: CarrierChainId;
  cachedTokens: TokensDataResult;
  wallet: Wallet;
  onChange: (command: string) => void;
  onFinish: () => void;
}) {
  const {
    command,
    parsedCommand,
    executionError,
    isNFT,
    processing,
    sourceChainId,
    cachedTokens,
    wallet,
    onChange,
    onFinish,
  } = options;
  const _actions: Action[] = [];
  const chains = isNFT ? NFTBridgeChains : TokenBridgeChains;
  const { exactlyMatchedChain: exactlyMatchedSourceChain, fuzzyMatchedChains: fuzzyMatchedSourceChains } =
    fuzzyMatchChainByShortName({ name: parsedCommand.sourceChain, chains });
  const { exactlyMatchedChain: exactlyMatchedTargetChain, fuzzyMatchedChains: fuzzyMatchedTargetChains } =
    fuzzyMatchChainByShortName({ name: parsedCommand.targetChain, chains });
  const {
    isValidCommand,
    isValidFromString,
    isValidSourceChain,
    isValidToString,
    isValidTargetChain,
    isValidAmount,
    isValidContractAddress,
  } = validateCommand(parsedCommand, isNFT);
  let parsedError = false;

  const recentlyUsedCommands = getRecentlyUsedCommand(isNFT);
  const recentlyUsedSourceChains = getRecentlyUsedSourceChain();
  const recentlyUsedTargetChains = getRecentlyUsedTargetChain();
  const recentlyUsedTokens = getRecentlyUsedToken(isNFT);

  if (executionError) {
    _actions.push({
      key: executionError,
      content: executionError,
      className: styleError,
    });
  } else if (processing) {
    _actions.push({
      key: 'loading',
      content: 'In progress. Please wait...',
      className: styleTips,
    });
  } else if (!command) {
    if (isNFT) {
      _actions.push({
        key: 'tips',
        content: (
          <>
            Format: Bridge from <span className={styleHighlight}>[source]</span> to{' '}
            <span className={styleHighlight}>[destination]</span>,{' '}
            <span className={styleHighlight}>[NFT name]#[NFT Id]</span>
          </>
        ),
        className: styleTips,
      });
    } else {
      _actions.push({
        key: 'tips',
        content: (
          <>
            Format: Bridge from <span className={styleHighlight}>[source]</span> to{' '}
            <span className={styleHighlight}>[destination]</span>,{' '}
            <span className={styleHighlight}>[quantity] [symbol]</span>
          </>
        ),
        className: styleTips,
      });
    }

    const childActions = recentlyUsedCommands
      .map((item, index) => {
        const parsedItem: ParsedCommand = isNFT ? parseNFTTransferCommand(item) : parseTokenTransferCommand(item);
        const { error } = validateCommandFinshed(parsedItem, isNFT);

        if (!error) {
          return {
            key: `recently-used-command-${index}`,
            content: (
              <>
                {parsedItem.command} from <span className={styleHighlight}>{parsedItem.sourceChain}</span> to{' '}
                <span className={styleHighlight}>{parsedItem.targetChain}</span>,{' '}
                <span className={styleHighlight}>
                  {isNFT ? (
                    <>
                      {parsedItem.contractAddress || parsedItem.symbol}
                      {parsedItem.tokenId ? `#${parsedItem.tokenId}` : ''}
                    </>
                  ) : (
                    <>
                      {parsedItem.amount} {parsedItem.contractAddress || parsedItem.symbol}
                    </>
                  )}
                </span>
              </>
            ),
            className: styleContent,
            onClick: () => {
              onChange(item);
            },
          };
        }
      })
      .filter((item) => item != null) as Action[];

    if (childActions.length) {
      _actions.push({
        key: 'Recently used commands',
        content: 'Recently used:',
        className: styleActionGroupLabel,
        children: childActions,
      });
    }
  } else if (!isValidCommand) {
    _actions.push({
      key: 'err',
      content: (
        <>
          Invalid command <span className={styleBold}>{parsedCommand.command}</span>, available commands:{' '}
          {validCommands.join(',')}
        </>
      ),
      className: styleError,
    });

    parsedError = true;
  } else if (!isValidFromString) {
    _actions.push({
      key: 'err',
      content: (
        <>
          Invalid command{' '}
          <span className={styleBold}>
            {parsedCommand.command} {parsedCommand.fromString}
          </span>
        </>
      ),
      className: styleError,
      onClick: () => {
        onChange(`${parsedCommand.command} from`);
      },
    });

    parsedError = true;
  } else if (parsedCommand.command?.toLowerCase() !== 'bridge' || parsedCommand.fromString?.toLowerCase() !== 'from') {
    const command = 'Bridge from ';

    _actions.push({
      key: command,
      content: command,
      className: styleContent,
      onClick: () => {
        onChange(command);
      },
    });
  } else if (!isValidSourceChain) {
    _actions.push({
      key: 'err',
      content: (
        <>
          Invalid source chain <span className={styleBold}>{parsedCommand.sourceChain}</span>
        </>
      ),
      className: styleError,
    });

    parsedError = true;
  } else if (!parsedCommand.sourceChain) {
    CHAIN_NAMES.sort((a, b) => {
      const aIsCurrentSource = a.id === sourceChainId;
      const bIsCurrentSource = b.id === sourceChainId;
      const aIndex = recentlyUsedSourceChains.findIndex((item) => item === a.id);
      const bIndex = recentlyUsedSourceChains.findIndex((item) => item === b.id);

      return aIsCurrentSource
        ? -1
        : bIsCurrentSource
        ? 1
        : aIndex !== -1 && bIndex === -1
        ? -1
        : aIndex === -1 && bIndex !== -1
        ? 1
        : aIndex !== -1 && bIndex !== -1
        ? aIndex - bIndex
        : 0;
    })
      .slice(0, 10)
      .forEach((item) => {
        const command = `${parsedCommand.command} from ${item.names[0]} to `;

        _actions.push({
          key: command,
          content: (
            <>
              {parsedCommand.command} from <span className={styleHighlight}>{item.names[0]}</span> to
            </>
          ),
          className: styleContent,
          onClick: () => {
            onChange(command);
          },
        });
      });
  } else if (fuzzyMatchedSourceChains) {
    fuzzyMatchedSourceChains.forEach((item) => {
      const command = `${parsedCommand.command} from ${item.matchedName} to `;

      _actions.push({
        key: command,
        content: (
          <>
            {parsedCommand.command} from <span className={styleHighlight}>{item.matchedName}</span> to
          </>
        ),
        className: styleContent,
        onClick: () => {
          onChange(command);
        },
      });
    });
  } else if (!fuzzyMatchedSourceChains && !exactlyMatchedSourceChain) {
    _actions.push({
      key: 'err',
      content: (
        <>
          Invalid source chain <span className={styleBold}>{parsedCommand.sourceChain}</span>
        </>
      ),
      className: styleError,
    });

    parsedError = true;
  } else if (!isValidToString) {
    _actions.push({
      key: 'err',
      content: (
        <>
          Invalid command{' '}
          <span className={styleBold}>
            {parsedCommand.command} from {parsedCommand.sourceChain} {parsedCommand.toString}
          </span>
        </>
      ),
      className: styleError,
      onClick: () => {
        onChange(`${parsedCommand.command} from ${parsedCommand.sourceChain} to `);
      },
    });

    parsedError = true;
  } else if (parsedCommand.toString?.toLowerCase() !== 'to') {
    const command = ``;

    _actions.push({
      key: command,
      content: (
        <>
          {parsedCommand.command} from <span className={styleHighlight}>{parsedCommand.sourceChain}</span> to
        </>
      ),
      className: styleContent,
      onClick: () => {
        onChange(command);
      },
    });
  } else if (!isValidTargetChain) {
    _actions.push({
      key: 'err',
      content: (
        <>
          Invalid target chain <span className={styleBold}>{parsedCommand.targetChain}</span>
        </>
      ),
      className: styleError,
    });

    parsedError = true;
  } else if (!parsedCommand.targetChain) {
    CHAIN_NAMES.filter((item) => !parsedCommand.sourceChain || !item.names.includes(parsedCommand.sourceChain))
      .sort((a, b) => {
        const aIndex = recentlyUsedTargetChains.findIndex((item) => item === a.id);
        const bIndex = recentlyUsedTargetChains.findIndex((item) => item === b.id);

        return aIndex !== -1 && bIndex === -1
          ? -1
          : aIndex === -1 && bIndex !== -1
          ? 1
          : aIndex !== -1 && bIndex !== -1
          ? aIndex - bIndex
          : 0;
      })
      .slice(0, 10)
      .forEach((item) => {
        const command = `${parsedCommand.command} from ${parsedCommand.sourceChain} to ${item.names[0]}, `;

        _actions.push({
          key: command,
          content: (
            <>
              {parsedCommand.command} from <span className={styleHighlight}>{parsedCommand.sourceChain}</span> to{' '}
              <span className={styleHighlight}>{item.names[0]}</span>,
            </>
          ),
          className: styleContent,
          onClick: () => {
            onChange(command);
          },
        });
      });
  } else if (fuzzyMatchedTargetChains) {
    fuzzyMatchedTargetChains
      .filter(
        (item) =>
          !parsedCommand.sourceChain || item.matchedName.toLowerCase() !== parsedCommand.sourceChain.toLowerCase(),
      )
      .forEach((item) => {
        const command = `${parsedCommand.command} from ${parsedCommand.sourceChain} to ${item.matchedName}, `;

        _actions.push({
          key: command,
          content: (
            <>
              {parsedCommand.command} from <span className={styleHighlight}>{parsedCommand.sourceChain}</span> to{' '}
              <span className={styleHighlight}>{item.matchedName}</span>,
            </>
          ),
          className: styleContent,
          onClick: () => {
            onChange(command);
          },
        });
      });
  } else if (!fuzzyMatchedTargetChains && !exactlyMatchedTargetChain) {
    _actions.push({
      key: 'err',
      content: (
        <>
          Invalid target chain <span className={styleBold}>{parsedCommand.targetChain}</span>
        </>
      ),
      className: styleError,
    });

    parsedError = true;
  } else if (!parsedCommand.firstFragmentSplitter) {
    const command = `${parsedCommand.command} from ${parsedCommand.sourceChain} to ${parsedCommand.targetChain}, `;

    _actions.push({
      key: command,
      content: (
        <>
          {parsedCommand.command} from <span className={styleHighlight}>{parsedCommand.sourceChain}</span> to{' '}
          <span className={styleHighlight}>{parsedCommand.targetChain}</span>,
        </>
      ),
      className: styleContent,
      onClick: () => {
        onChange(command);
      },
    });
  } else if (!isValidAmount) {
    _actions.push({
      key: 'err',
      content: (
        <>
          Invalid amount <span className={styleBold}>{parsedCommand.amount}</span>
        </>
      ),
      className: styleError,
    });

    parsedError = true;
  } else if (!isNFT && !parsedCommand.amount) {
    _actions.push({
      key: 'tips',
      content: (
        <>
          Format: {parsedCommand.command} from <span className={styleHighlight}>{parsedCommand.sourceChain}</span> to{' '}
          <span className={styleHighlight}>{parsedCommand.targetChain}</span>,{' '}
          <span className={styleHighlight}>[quantity] [symbol]</span>
        </>
      ),
      className: styleTips,
    });
  } else if (!isNFT && !parsedCommand.symbol && !parsedCommand.contractAddress) {
    _actions.push({
      key: 'tips',
      content: (
        <>
          Format: {parsedCommand.command} from <span className={styleHighlight}>{parsedCommand.sourceChain}</span> to{' '}
          <span className={styleHighlight}>{parsedCommand.targetChain}</span>,{' '}
          <span className={styleHighlight}>{parsedCommand.amount} [symbol]</span>
        </>
      ),
      className: styleTips,
    });

    const recentlyUsedTokenActions = recentlyUsedTokens
      .filter((item) => item.symbol || item.contractAddress)
      .map((token) => {
        const command = `${parsedCommand.command} from ${parsedCommand.sourceChain} to ${parsedCommand.targetChain}, ${
          parsedCommand.amount
        } ${token.symbol || token.contractAddress}`;

        return {
          key: command,
          content: (
            <>
              {parsedCommand.command} from <span className={styleHighlight}>{parsedCommand.sourceChain}</span> to{' '}
              <span className={styleHighlight}>{parsedCommand.targetChain}</span>,{' '}
              <span className={styleHighlight}>
                {parsedCommand.amount} {token.symbol || token.contractAddress}
              </span>
            </>
          ),
          className: styleContent,
          onClick: () => {
            onChange(command);
          },
        };
      });

    if (recentlyUsedTokenActions.length) {
      _actions.push({
        key: 'Recently used tokens',
        content: 'Recently used:',
        className: styleActionGroupLabel,
        children: recentlyUsedTokenActions,
      });
    }

    const userTokenActions =
      exactlyMatchedSourceChain &&
      sourceChainId &&
      sourceChainId === exactlyMatchedSourceChain.chain.id &&
      !wallet.error &&
      cachedTokens.data
        ? uniqBy(
            cachedTokens.data.tokens.filter((item) => item.symbol && item.uiAmount),
            'symbol',
          ).map((token) => {
            const command = `${parsedCommand.command} from ${parsedCommand.sourceChain} to ${parsedCommand.targetChain}, ${parsedCommand.amount} ${token.symbol}`;

            return {
              key: `${command}-${token.symbol}`,
              content: (
                <>
                  {parsedCommand.command} from <span className={styleHighlight}>{parsedCommand.sourceChain}</span> to{' '}
                  <span className={styleHighlight}>{parsedCommand.targetChain}</span>,{' '}
                  <span className={styleHighlight}>
                    {parsedCommand.amount} {token.symbol}
                  </span>
                </>
              ),
              className: styleContent,
              onClick: () => {
                onChange(command);
              },
            };
          })
        : [];

    if (userTokenActions.length) {
      _actions.push({
        key: 'From your wallet',
        content: 'From your wallet:',
        className: styleActionGroupLabel,
        children: userTokenActions,
      });
    }
  } else if (!isValidContractAddress) {
    _actions.push({
      key: 'err',
      content: (
        <>
          Invalid contract address <span className={styleBold}>{parsedCommand.contractAddress}</span>
        </>
      ),
      className: styleError,
    });

    parsedError = true;
  } else if (isNFT && !parsedCommand.contractAddress && !parsedCommand.symbol) {
    _actions.push({
      key: 'tips',
      content: (
        <>
          Format: {parsedCommand.command} from <span className={styleHighlight}>{parsedCommand.sourceChain}</span> to{' '}
          <span className={styleHighlight}>{parsedCommand.targetChain}</span>,{' '}
          <span className={styleHighlight}>
            {exactlyMatchedSourceChain?.chain.id === CHAIN_ID_SOLANA ? '[Solana Public Key]' : '[NFT name]#[NFT Id]'}
          </span>
        </>
      ),
      className: styleTips,
    });

    const recentlyUsedTokenActions = recentlyUsedTokens
      .filter((item) =>
        exactlyMatchedSourceChain
          ? isCarrierEVMChain(exactlyMatchedSourceChain.chain.id)
            ? ((item.contractAddress && item.contractAddress.startsWith('0x')) || item.symbol) && item.tokenId
            : exactlyMatchedSourceChain.chain.id === CHAIN_ID_SOLANA
            ? item.contractAddress && !item.contractAddress.startsWith('0x')
            : false
          : false,
      )
      .map((token) => {
        const command = `${parsedCommand.command} from ${parsedCommand.sourceChain} to ${parsedCommand.targetChain}, ${
          token.contractAddress || token.symbol
        }${token.tokenId ? `#${token.tokenId}` : ''}`;

        return {
          key: command,
          content: (
            <>
              {parsedCommand.command} from <span className={styleHighlight}>{parsedCommand.sourceChain}</span> to{' '}
              <span className={styleHighlight}>{parsedCommand.targetChain}</span>,{' '}
              <span className={styleHighlight}>
                {token.contractAddress || token.symbol}
                {token.tokenId ? `#${token.tokenId}` : ''}
              </span>
            </>
          ),
          className: styleContent,
          onClick: () => {
            onChange(command);
          },
        };
      });

    if (recentlyUsedTokenActions.length) {
      _actions.push({
        key: 'Recently used tokens',
        content: 'Recently used:',
        className: styleActionGroupLabel,
        children: recentlyUsedTokenActions,
      });
    }

    const userTokenActions =
      exactlyMatchedSourceChain &&
      sourceChainId &&
      sourceChainId === exactlyMatchedSourceChain.chain.id &&
      !wallet.error &&
      cachedTokens.data
        ? (cachedTokens.data.tokens as NFTData[])
            .filter((item) => {
              const hasSymbolOrMintKey =
                sourceChainId === CHAIN_ID_SOLANA ? item.tokenAddress : item.symbol || item.tokenAddress;

              return hasSymbolOrMintKey && !item.isNativeAsset && item.uiAmount;
            })
            .map((token) => {
              const command = `${parsedCommand.command} from ${parsedCommand.sourceChain} to ${
                parsedCommand.targetChain
              }, ${sourceChainId === CHAIN_ID_SOLANA ? token.tokenAddress : token.symbol || token.tokenAddress}${
                token.tokenId ? `#${token.tokenId}` : ''
              }`;

              return {
                key: `${command}-${token.tokenAddress}`,
                content: (
                  <>
                    {parsedCommand.command} from <span className={styleHighlight}>{parsedCommand.sourceChain}</span> to{' '}
                    <span className={styleHighlight}>{parsedCommand.targetChain}</span>,{' '}
                    <span className={styleHighlight}>
                      {sourceChainId === CHAIN_ID_SOLANA ? token.tokenAddress : token.symbol || token.tokenAddress}
                      {token.tokenId ? `#${token.tokenId}` : ''}
                    </span>
                  </>
                ),
                className: styleContent,
                onClick: () => {
                  onChange(command);
                },
              };
            })
        : [];

    if (userTokenActions.length) {
      _actions.push({
        key: 'From your wallet',
        content: 'From your wallet:',
        className: styleActionGroupLabel,
        children: userTokenActions,
      });
    }
  } else if (isNFT && exactlyMatchedSourceChain?.chain.id !== CHAIN_ID_SOLANA && !parsedCommand.tokenId) {
    _actions.push({
      key: 'tips',
      content: (
        <>
          Format: {parsedCommand.command} from <span className={styleHighlight}>{parsedCommand.sourceChain}</span> to{' '}
          <span className={styleHighlight}>{parsedCommand.targetChain}</span>,{' '}
          <span className={styleHighlight}>{parsedCommand.symbol || parsedCommand.contractAddress}#[NFT Id]</span>
        </>
      ),
      className: styleTips,
    });
  } else {
    _actions.push({
      key: 'tips',
      className: styleTips,
      content: `Press enter or click here ${
        wallet.error === errorIncorrectChain ||
        wallet.error === errorIncorrectWallet ||
        wallet.state === WalletState.DISCONNECTED ||
        !wallet.wallet
          ? wallet.error === errorIncorrectChain || wallet.error === errorIncorrectWallet
            ? 'to connect to network'
            : wallet.state === WalletState.DISCONNECTED || !wallet.wallet
            ? 'to connect wallet'
            : 'to set up transaction'
          : 'to set up transaction'
      }`,
      onClick: onFinish,
    });
  }

  return { actions: _actions, error: parsedError || executionError };
}

const styleContent = css`
  color: #fff;
  font-weight: 500;
  font-size: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(16)};
  }
`;

const styleTips = css`
  color: var(--color-text-3);
  font-weight: 500;
  font-size: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(16)};
  }
`;

const styleError = css`
  color: #ff6868;
  font-weight: 500;
  font-size: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(16)};
  }
`;

const styleActionGroupLabel = css`
  color: var(--color-text-3);
  font-weight: 500;
  font-size: ${pxToPcVw(12)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(12)};
  }
`;

const styleHighlight = css`
  color: #fff;
  font-weight: 700;
`;

const styleBold = css`
  font-weight: 700;
`;
