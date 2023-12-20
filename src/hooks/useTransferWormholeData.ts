import {
  CHAIN_ID_MOONBEAM,
  CHAIN_ID_SOLANA,
  hexToUint8Array,
  parseTokenTransferPayload,
} from '@certusone/wormhole-sdk';
import {
  CarrierChainId,
  getDefaultNativeCurrencyAddress,
  getNFTBridgeAddressForChain,
  getTokenBridgeAddressForChain,
} from '../utils/consts';
import { getPendingPromise, useData } from './useData';
import WormholeCoreBridgeABI from '../abis/WormholeCoreBridge.json';
import TokenMessengerABI from '../abis/TokenMessenger.json';
import { getSolanaConnection } from '../utils/solana';
import { ParsedInstruction, PartiallyDecodedInstruction, PublicKey } from '@solana/web3.js';
import { ethers } from 'ethers';
import { errorIsNotAWormholeTx } from './useSignedVaa';
import { TransactionDataResult, TransactionReceipt } from './useTransaction';

import WormholeTokenBridgeABI from '../abis/WormholeTokenBridge.json';
import WormholeNFTBridgeABI from '../abis/WormholeNFTBridge.json';
import WormholeTbtcABI from '../abis/WormholeTbtc.json';
import { getTBTCAddressForChain, getTBTCGatewayForChain } from '../utils/tbtc';
import { decodeTx, getEthTransaction, parseLogs } from '../utils/ethereum';
import { Interface, base58 } from 'ethers/lib/utils';
import { isCarrierEVMChain, isCarrierPolkaChain } from '../utils/web3Utils';
import { ParachainBridgeType, isParachainTxHash, parseParachainTxHash } from '../utils/polkadot';

export enum BridgeType {
  NFT = 'nft',
  TOKEN = 'token',
  USDC = 'usdc',
}

enum TokenBridgeInstruction {
  Initialize,
  AttestToken,
  CompleteNative,
  CompleteWrapped,
  TransferWrapped,
  TransferNative,
  RegisterChain,
  CreateWrapped,
  UpgradeContract,
  CompleteNativeWithPayload,
  CompleteWrappedWithPayload,
  TransferWrappedWithPayload,
  TransferNativeWithPayload,
}

enum NftBridgeInstruction {
  Initialize,
  CompleteNative,
  CompleteWrapped,
  CompleteWrappedMeta,
  TransferWrapped,
  TransferNative,
  RegisterChain,
  UpgradeContract,
}

interface Instruction {
  name?: TokenBridgeInstruction | NftBridgeInstruction;
  instruction: ParsedInstruction | PartiallyDecodedInstruction;
}

function convertPayloadToUint8Array(options: { payload: string }) {
  const { payload } = options;
  let payloadNoZeroHex = payload;
  if (payloadNoZeroHex.startsWith('0x')) {
    payloadNoZeroHex = payload.toString().slice(2);
  }
  return hexToUint8Array(payloadNoZeroHex);
}

function getInstructions(options: {
  instruction: ParsedInstruction | PartiallyDecodedInstruction;
  validInstructions: (TokenBridgeInstruction | NftBridgeInstruction)[];
}) {
  const { instruction, validInstructions } = options;
  let instructionName;
  // let accounts = undefined;

  if (instruction && 'data' in instruction && 'accounts' in instruction) {
    const decodedData = base58.decode(instruction.data);
    // according to https://github.com/wormhole-foundation/wormhole/blob/main/sdk/js/src/solana/nftBridge/coder/instruction.ts#L59
    // first 1 byte is the unit8 instructionName
    const _instructionName = Buffer.from(decodedData).subarray(0, 1).readUInt8();
    // const _accounts = instruction.accounts;

    if (validInstructions.includes(_instructionName)) {
      instructionName = _instructionName;
      // accounts = _accounts;
    }
  }

  return {
    name: instructionName,
    instruction,
  };
}

function parseAddress(buf: Buffer) {
  const paddedAddressUnit8Array = new Uint8Array(buf);
  const unpaddedAddressUnit8Array = ethers.utils.stripZeros(paddedAddressUnit8Array);
  const address = ethers.utils.hexlify(unpaddedAddressUnit8Array);

  return address;
}

function parseTokenBridgeTransferNativeData(data: string) {
  const decodedData = base58.decode(data);
  const paramsHex = Buffer.from(decodedData.subarray(1)).toString('hex');
  const paramsBuffer = Buffer.from(paramsHex, 'hex');
  const nonce = paramsBuffer.readUInt32LE(0);
  const amount = paramsBuffer.readBigUInt64LE(4);
  const fee = paramsBuffer.readBigUInt64LE(12);
  // address > array > padded32array > string hex > buffer
  const targetAddressBuffer = paramsBuffer.subarray(20, 52);
  const targetAddress = parseAddress(targetAddressBuffer);
  const targetChain = paramsBuffer.readUInt16LE(52);

  return { nonce, amount, fee, targetAddress, targetChain };
}

type DecodeParam = {
  token: string;
};

function parseDecodeParams(chainId: CarrierChainId, data?: string): DecodeParam | undefined {
  let token = ethers.constants.AddressZero;

  const decodeData = data ? decodeTx([WormholeTbtcABI, WormholeTokenBridgeABI, WormholeNFTBridgeABI], data) : undefined;
  console.log('decode data: ', decodeData);

  // might not be able to decode
  // e.g. chain calls
  if (!decodeData) {
    return;
  }

  try {
    if (decodeData.functionFragment.name === 'sendTbtc') {
      token = getTBTCAddressForChain(chainId);
    } else if (
      decodeData.functionFragment.name === 'wrapAndTransferETH' ||
      decodeData.functionFragment.name === 'wrapAndTransferETHWithPayload'
    ) {
      token = getDefaultNativeCurrencyAddress(chainId);
    } else if (
      decodeData.functionFragment.name === 'transferTokens' ||
      decodeData.functionFragment.name === 'transferTokensWithPayload'
    ) {
      // for usdc cctp: https://github.com/wormhole-foundation/wormhole-circle-integration/blob/main/evm/src/circle_integration/CircleIntegration.sol#LL50C40-L50C58
      if (decodeData.functionFragment.inputs[0].name === 'transferParams') {
        token = decodeData.args[0][0];
      } else {
        token = decodeData.args[0];
      }
    } else if (decodeData.functionFragment.name === 'transferNFT') {
      token = decodeData.args[0];
    } else {
      console.log('not found decoded method: ', decodeData.functionFragment.name);
    }
  } catch (e) {
    console.error(e);
  }

  return { token: ethers.utils.getAddress(token) };
}

export const errorReceiptNotFound = new Error('receipt not found');

async function parseTransaction(options: {
  signal: AbortSignal;
  chainId: CarrierChainId;
  txHash: string;
  transferTx?: TransactionDataResult;
}) {
  const { signal, chainId, txHash, transferTx } = options;

  if (transferTx && transferTx.error) {
    throw transferTx.error;
  }

  if (transferTx && transferTx.loading) {
    return getPendingPromise(signal);
  }

  let bridgeType: undefined | BridgeType = undefined;
  let isUsingRelayer: undefined | boolean = undefined;
  let tokenAddress: undefined | string = undefined;

  if (isCarrierPolkaChain(chainId) || (chainId === CHAIN_ID_MOONBEAM && isParachainTxHash(txHash))) {
    const txHashParsed = parseParachainTxHash(txHash);

    bridgeType = BridgeType.TOKEN;
    isUsingRelayer = txHashParsed?.bridgeType === ParachainBridgeType.MRL ? true : false;
    // TODO: mrl token address
    tokenAddress =
      txHashParsed?.bridgeType === ParachainBridgeType.MRL && 'sourceAssetId' in txHashParsed
        ? txHashParsed.sourceAssetId
        : '';
  } else if (isCarrierEVMChain(chainId)) {
    if (!transferTx?.data) {
      throw errorReceiptNotFound;
    }

    const transaction = await getEthTransaction({ chainId, txHash });

    const receipt = transferTx.data as TransactionReceipt;
    const cctpTokenMessengerIface = new Interface(TokenMessengerABI);
    const cctpTokenMessengerLog = parseLogs({
      iface: cctpTokenMessengerIface,
      logs: receipt.logs,
      methodName: 'DepositForBurn',
    });

    if (cctpTokenMessengerLog) {
      bridgeType = BridgeType.USDC;
      isUsingRelayer = false;
      tokenAddress = cctpTokenMessengerLog.args.burnToken;
    } else {
      let iface = new Interface(WormholeCoreBridgeABI);
      const logMessageEventLog = parseLogs({ iface, logs: receipt.logs, methodName: 'LogMessagePublished' });

      if (logMessageEventLog) {
        const { sender: emitterAddress, payload } = logMessageEventLog.args;
        // console.log(`parse transaction - emitter address: ${emitterAddress}, payload: ${payload}`);

        const isTokenBridge = emitterAddress.toLowerCase() === getTokenBridgeAddressForChain(chainId).toLowerCase();
        const isNFTBridge = emitterAddress.toLowerCase() === getNFTBridgeAddressForChain(chainId).toLowerCase();

        tokenAddress = parseDecodeParams(chainId, transaction?.data)?.token;

        try {
          if (isTokenBridge) {
            const payloadBuffer = convertPayloadToUint8Array({ payload });
            const transferPayload = parseTokenTransferPayload(Buffer.from(payloadBuffer));
            const arbiterFee = transferPayload.fee ? parseInt(transferPayload.fee.toString()) : 0;
            bridgeType = BridgeType.TOKEN;
            isUsingRelayer = arbiterFee > 0 ? true : false;
          } else if (isNFTBridge) {
            // const nftTransferPayload = parseNftTransferPayload(Buffer.from(payloadBuffer));
            bridgeType = BridgeType.NFT;
            isUsingRelayer = false; // nft has no relayer currently
          } else {
            throw errorIsNotAWormholeTx;
          }
        } catch (e) {
          console.error(e);
          throw errorIsNotAWormholeTx;
        }
      }
    }
  } else if (chainId === CHAIN_ID_SOLANA) {
    const connection = getSolanaConnection();
    const tokenBridgePublicKey = new PublicKey(getTokenBridgeAddressForChain(CHAIN_ID_SOLANA));
    const nftBridgePublicKey = new PublicKey(getNFTBridgeAddressForChain(CHAIN_ID_SOLANA));

    const transaction = await connection.getParsedTransaction(txHash, {
      maxSupportedTransactionVersion: 0,
    });

    if (transaction) {
      try {
        // will be undefined if programId is not found
        const instructionsList = transaction.transaction.message.instructions;

        const tokenBridgeInstruction = instructionsList.find(
          (item) => item.programId.toString() === tokenBridgePublicKey.toString(),
        );

        const nftBridgeInstruction = instructionsList.find(
          (item) => item.programId.toString() === nftBridgePublicKey.toString(),
        );

        const tbtcBridgeInstruction = instructionsList.find(
          (item) => item.programId.toString() === getTBTCGatewayForChain(CHAIN_ID_SOLANA),
        );

        console.log('token bridge instruction: ', tokenBridgeInstruction);
        console.log('nft bridge instruction: ', nftBridgeInstruction);
        console.log('tbtc bridge instruction: ', tbtcBridgeInstruction);

        if (tbtcBridgeInstruction) {
          tokenAddress = getTBTCAddressForChain(CHAIN_ID_SOLANA);
          bridgeType = BridgeType.TOKEN;
          isUsingRelayer = false;
        } else if (tokenBridgeInstruction) {
          let validInstructions: (TokenBridgeInstruction | NftBridgeInstruction)[] = [
            TokenBridgeInstruction.TransferNative,
            TokenBridgeInstruction.TransferWrapped,
            TokenBridgeInstruction.TransferNativeWithPayload,
            TokenBridgeInstruction.TransferWrappedWithPayload,
          ];
          const instruction: Instruction = getInstructions({ instruction: tokenBridgeInstruction, validInstructions });

          if (
            instruction &&
            (instruction.name === TokenBridgeInstruction.TransferNative ||
              instruction.name === TokenBridgeInstruction.TransferWrapped ||
              instruction.name === TokenBridgeInstruction.TransferNativeWithPayload ||
              instruction.name === TokenBridgeInstruction.TransferWrappedWithPayload) &&
            'data' in instruction.instruction
          ) {
            const { nonce, amount, fee, targetAddress, targetChain } = parseTokenBridgeTransferNativeData(
              instruction.instruction.data,
            );

            tokenAddress = instruction.instruction.accounts
              ? instruction.name === TokenBridgeInstruction.TransferNative ||
                instruction.name === TokenBridgeInstruction.TransferNativeWithPayload
                ? instruction.instruction.accounts[3].toString()
                : instruction.instruction.accounts[4].toString()
              : undefined;
            bridgeType = BridgeType.TOKEN;
            isUsingRelayer = fee > 0 ? true : false;
          }
        } else if (nftBridgeInstruction) {
          let validInstructions: (TokenBridgeInstruction | NftBridgeInstruction)[] = [
            NftBridgeInstruction.TransferNative,
            NftBridgeInstruction.TransferWrapped,
          ];
          const instruction: Instruction = getInstructions({ instruction: nftBridgeInstruction, validInstructions });
          if (
            instruction &&
            (instruction.name === NftBridgeInstruction.TransferNative ||
              instruction.name === NftBridgeInstruction.TransferWrapped) &&
            'data' in instruction.instruction
          ) {
            tokenAddress = instruction.instruction.accounts
              ? instruction.name === NftBridgeInstruction.TransferNative
                ? instruction.instruction.accounts[3].toString()
                : instruction.instruction.accounts[4].toString()
              : undefined;
            bridgeType = BridgeType.NFT;
            isUsingRelayer = false;
          }
        } else {
          throw errorIsNotAWormholeTx;
        }
      } catch (e) {
        console.error(e);
        throw errorIsNotAWormholeTx;
      }
    }
  } else {
    // @TODO support other chains
  }

  console.log('useTransactionHash bridgeType:', bridgeType);
  console.log('useTransactionHash isUsingRelayer:', isUsingRelayer);
  console.log('useTransactionHash tokenAddress:', tokenAddress);

  if (!bridgeType) {
    throw errorIsNotAWormholeTx;
  }

  return {
    bridgeType,
    isUsingRelayer,
    tokenAddress,
  };
}

/**
 * parse transaction hash to determine if it is nft and if relayer is used
 * @param options
 * @returns
 */
export function useTransferWormholeData(options: {
  chainId?: CarrierChainId;
  txHash?: string;
  transferTx?: TransactionDataResult;
}) {
  const { chainId, txHash, transferTx } = options;

  const data = useData(
    async (signal) => {
      if (chainId && txHash) {
        const data = await parseTransaction({ signal, chainId, txHash, transferTx });
        return data;
      }
    },
    [chainId, txHash, transferTx],
  );

  return data;
}
