import {
  CHAIN_ID_SOLANA,
  getEmitterAddressEth,
  getEmitterAddressSolana,
  parseNFTPayload,
  parseSequenceFromLogEth,
  parseSequenceFromLogSolana,
  parseTransferPayload,
  parseVaa,
  parseTokenTransferPayload,
  CHAIN_ID_MOONBEAM,
} from '@certusone/wormhole-sdk';
import {
  CarrierChainId,
  getBridgeAddressForChain,
  getNFTBridgeAddressForChain,
  getTokenBridgeAddressForChain,
  GUARDIANS_SERVER,
  SOL_NFT_BRIDGE_ADDRESS,
  SOL_TOKEN_BRIDGE_ADDRESS,
} from '../utils/consts';
import { getEthTransactionReceipt, parseLogs } from '../utils/ethereum';
import { getSolanaTransaction } from '../utils/solana';
import { errorNeedRetry, runWithErrorRetry } from '../utils/timer';
import { getPendingPromise, useData } from './useData';
import { TransactionDataResult } from './useTransaction';
import { isCarrierEVMChain, isCarrierPolkaChain, tryCarrierHexToNativeString } from '../utils/web3Utils';
import { CCTPConfigs, cctpSDK, getCCTPMessageData, getCCTPNetworkConfigsByChainId } from '../utils/cctp';
import { Interface } from 'ethers/lib/utils';
import WormholeCoreBridgeABI from '../abis/WormholeCoreBridge.json';

export enum VaaType {
  Attest,
  NFT,
  Token,
  USDC,
}

async function getSequenceByChainIdAndHash(options: { chainId: CarrierChainId; txHash: string }) {
  const { chainId, txHash } = options;

  if (chainId === CHAIN_ID_SOLANA) {
    const tx = await getSolanaTransaction({ txHash });
    const sequence = tx ? parseSequenceFromLogSolana(tx) : undefined;

    return sequence;
  } else if (isCarrierEVMChain(chainId)) {
    const tx = await getEthTransactionReceipt({ chainId, txHash });
    const sequence = parseSequenceFromLogEth(tx, getBridgeAddressForChain(chainId));

    return sequence;
  } else if (isCarrierPolkaChain(chainId)) {
    const tx = await getEthTransactionReceipt({ chainId: CHAIN_ID_MOONBEAM, txHash });
    const sequence = parseSequenceFromLogEth(tx, getBridgeAddressForChain(CHAIN_ID_MOONBEAM));

    return sequence;
  } else {
    throw new Error(`chain ${chainId} is not supported`);
  }
}

export const errorGettingVaaTimeout = new Error('getting vaa timeout');
export const errorIsNotAWormholeTx = new Error('not a valid wormhole transaction');
export const errorEmitterAddressNotFound = new Error('emitter address is not found');
export const errorCCTPNetworkConfigsNotFound = new Error('CCTP network configs is not found');
export const errorIsNotACCTPTx = new Error('not a valid CCTP transaction');

async function getGuardiansVAA(options: {
  signal: AbortSignal;
  chainId: CarrierChainId;
  txHash: string;
  vaaType: VaaType;
  tx?: TransactionDataResult;
  shouldFetchVaa?: boolean;
}) {
  const { signal, chainId, txHash, vaaType, tx, shouldFetchVaa } = options;

  if (!shouldFetchVaa) {
    return;
  }

  if (tx && tx.error) {
    throw tx.error;
  }

  if (tx && tx.loading) {
    return getPendingPromise(signal);
  }

  let sequence: string | undefined;

  try {
    sequence = tx?.data
      ? 'transactionHash' in tx.data
        ? isCarrierPolkaChain(chainId)
          ? parseSequenceFromLogEth(tx.data, getBridgeAddressForChain(CHAIN_ID_MOONBEAM))
          : parseSequenceFromLogEth(tx.data, getBridgeAddressForChain(chainId))
        : 'slot' in tx.data
        ? parseSequenceFromLogSolana(tx.data)
        : undefined
      : await getSequenceByChainIdAndHash({ chainId, txHash });
  } catch (e) {
    console.error(e);

    throw errorIsNotAWormholeTx;
  }

  if (!sequence) {
    throw errorIsNotAWormholeTx;
  }

  const emitterAddress = isCarrierEVMChain(chainId)
    ? getEmitterAddressEth(
        vaaType === VaaType.NFT
          ? getNFTBridgeAddressForChain(chainId)
          : vaaType === VaaType.USDC
          ? CCTPConfigs[chainId]?.wormholeContractAddress
          : getTokenBridgeAddressForChain(chainId),
      )
    : chainId === CHAIN_ID_SOLANA
    ? getEmitterAddressSolana(vaaType === VaaType.NFT ? SOL_NFT_BRIDGE_ADDRESS : SOL_TOKEN_BRIDGE_ADDRESS)
    : isCarrierPolkaChain(chainId)
    ? getEmitterAddressEth(
        vaaType === VaaType.NFT
          ? getNFTBridgeAddressForChain(CHAIN_ID_MOONBEAM)
          : getTokenBridgeAddressForChain(CHAIN_ID_MOONBEAM),
      )
    : undefined;

  if (!emitterAddress) {
    throw errorEmitterAddressNotFound;
  }

  const chainIdParsed = isCarrierPolkaChain(chainId) ? CHAIN_ID_MOONBEAM : chainId;

  return runWithErrorRetry(
    async () => {
      const response = await fetch(`${GUARDIANS_SERVER}/v1/signed_vaa/${chainIdParsed}/${emitterAddress}/${sequence}`);

      if (response.status !== 200) {
        throw errorNeedRetry;
      }

      const signedVaaResponse = await response.json();
      const decodedVaa = Buffer.from(signedVaaResponse.vaaBytes, 'base64');

      console.log('decodedVaa', decodedVaa.toString('hex'));

      const parsedVaa = parseVaa(decodedVaa);
      const parsedVaaPayload =
        vaaType === VaaType.NFT
          ? parseNFTPayload(parsedVaa.payload)
          : vaaType === VaaType.Token
          ? parseTransferPayload(parsedVaa.payload)
          : undefined;
      const formatedVaaPayload =
        parsedVaaPayload && 'originAddress' in parsedVaaPayload && 'originChain' in parsedVaaPayload
          ? {
              ...parsedVaaPayload,
              tokenId: 'tokenId' in parsedVaaPayload ? parsedVaaPayload.tokenId.toString() : undefined,
              originAddress: tryCarrierHexToNativeString(
                parsedVaaPayload.originAddress,
                parsedVaaPayload.originChain as CarrierChainId,
              ),
              targetAddress: tryCarrierHexToNativeString(
                parsedVaaPayload.targetAddress,
                parsedVaaPayload.targetChain as CarrierChainId,
              ),
            }
          : undefined;
      const payload =
        vaaType === VaaType.NFT
          ? undefined
          : vaaType === VaaType.Token
          ? parseTokenTransferPayload(parsedVaa.payload).tokenTransferPayload
          : undefined;

      const result = {
        vaaBytes: decodedVaa,
        parsedVaa,
        parsedVaaPayload: formatedVaaPayload,
        payload,
      };

      console.log('signedVaa', result);

      return result;
    },
    {
      signal,
      // polygon need more than 1 hour to finalize the transaction
      maxRetry: Infinity,
      timeoutError: errorGettingVaaTimeout,
      backoffStrategyFactor: 1.04,
    },
  );
}

async function getUSDCAttestation(options: {
  signal: AbortSignal;
  chainId: CarrierChainId;
  txHash: string;
  tx?: TransactionDataResult;
  shouldFetchVaa?: boolean;
}) {
  const { signal, chainId, txHash, tx, shouldFetchVaa } = options;

  if (!shouldFetchVaa) {
    return;
  }

  if (tx && tx.error) {
    throw tx.error;
  }

  if (tx && tx.loading) {
    return getPendingPromise(signal);
  }

  return runWithErrorRetry(
    async () => {
      const cctpSourceNetworkConfigs = getCCTPNetworkConfigsByChainId({ chainId });

      if (!cctpSourceNetworkConfigs) {
        throw errorCCTPNetworkConfigsNotFound;
      }

      const { messageHash, messageBytes, burnTx } = await cctpSDK.getMessageBytes({
        sourceDomain: cctpSourceNetworkConfigs.domain,
        burnTxHash: txHash,
      });

      if (!messageBytes || !messageHash) {
        throw errorNeedRetry;
      }

      // for wormhole wrapped transaction
      let wormholeSignedVAA: Buffer | undefined;
      const iface = new Interface(WormholeCoreBridgeABI);
      const logMessagePublishedLog = parseLogs({
        iface: iface,
        logs: burnTx.logs,
        methodName: 'LogMessagePublished',
      });

      if (logMessagePublishedLog) {
        const signedVaa = await getGuardiansVAA({
          signal,
          chainId,
          txHash,
          vaaType: VaaType.USDC,
          shouldFetchVaa: true,
        });

        wormholeSignedVAA = signedVaa?.vaaBytes;
      }

      const messageAttestation = await cctpSDK.fetchAttestation({ messageHash });

      if (!messageAttestation) {
        throw errorNeedRetry;
      }

      const result = {
        wormholeSignedVAA,
        cctpMessageAttestation: messageAttestation,
        cctpMessageHash: messageHash,
        cctpMessageBytes: messageBytes,
        parsedVaaPayload: getCCTPMessageData({ chainId, burnTx }),
      };

      console.log('cctp attestation result', result);

      return result;
    },
    {
      signal,
      // polygon need more than 1 hour to finalize the transaction
      maxRetry: 2000,
      timeoutError: errorGettingVaaTimeout,
      backoffStrategyFactor: 1.04,
    },
  );
}

export function useSignedVaa(options: {
  chainId?: CarrierChainId;
  txHash?: string;
  vaaType?: VaaType;
  tx?: TransactionDataResult;
  shouldFetchVaa?: boolean;
}) {
  const { chainId, txHash, vaaType, tx, shouldFetchVaa } = options;

  const data = useData(
    async (signal) => {
      // console.log('useSignedVaa', { txHash, vaaType, wallet });

      if (chainId && txHash && vaaType != null) {
        const data =
          vaaType === VaaType.USDC
            ? await getUSDCAttestation({ signal, chainId, txHash, tx, shouldFetchVaa })
            : await getGuardiansVAA({ signal, chainId, txHash, vaaType, tx, shouldFetchVaa });

        // console.log('useSignedVaa result', data);

        return data;
      }
    },
    [chainId, txHash, vaaType, tx, shouldFetchVaa],
  );

  return data;
}
