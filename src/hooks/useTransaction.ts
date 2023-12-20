import { CHAIN_ID_MOONBEAM, CHAIN_ID_SOLANA } from '@certusone/wormhole-sdk';
import { getEthTransactionReceipt, getTransactionStatusFromReceipt } from '../utils/ethereum';
import { getSolanaTransaction, getSolanaTransactionStatus } from '../utils/solana';
import { errorNeedRetry, runWithErrorRetry } from '../utils/timer';
import { DataResult, useData } from './useData';
import { TransactionResponse } from '@solana/web3.js';
import { ethers } from 'ethers';
import { TransactionStatus } from '../context/Wallet/types';
import { CarrierChainId, MOONBEAM_PARACHAIN_ID } from '../utils/consts';
import { isCarrierEVMChain, isCarrierPolkaChain } from '../utils/web3Utils';
import {
  ParachainBridgeType,
  PolkadotExtrinsic,
  getPolkadotExtrinsic,
  isParachainTxHash,
  parseParachainTxHash,
} from '../utils/polkadot';

export interface Log {
  blockNumber: number;
  blockHash: string;
  transactionIndex: number;

  removed: boolean;

  address: string;
  data: string;

  topics: Array<string>;

  transactionHash: string;
  logIndex: number;
}

export interface TransactionReceipt {
  to: string;
  from: string;
  contractAddress: string;
  transactionIndex: number;
  root?: string;
  gasUsed: ethers.BigNumber;
  logsBloom: string;
  blockHash: string;
  transactionHash: string;
  logs: Array<Log>;
  blockNumber: number;
  confirmations: number;
  cumulativeGasUsed: ethers.BigNumber;
  effectiveGasPrice: ethers.BigNumber;
  byzantium: boolean;
  type: number;
  status?: number;
}

export type TransactionDataResult = DataResult<
  TransactionReceipt | TransactionResponse | PolkadotExtrinsic | undefined
>;

export const errorTransactionReverted = new Error('Transaction reverted on chain');

export function useTransaction(options: { chainId?: CarrierChainId; txHash?: string }): TransactionDataResult {
  const { chainId, txHash } = options;

  const data = useData(
    async (signal) => {
      // console.log('useTransactionResult', { wallet, txHash });

      if (chainId && txHash) {
        const _data = await runWithErrorRetry(
          async () => {
            let txn: TransactionReceipt | TransactionResponse | PolkadotExtrinsic | null | undefined = undefined;

            if (chainId === CHAIN_ID_SOLANA) {
              const transactionStatus = await getSolanaTransactionStatus({ txHash });

              if (transactionStatus === TransactionStatus.Successful) {
                const transaction = await getSolanaTransaction({ txHash });

                txn = transaction || undefined;
              } else if (transactionStatus === TransactionStatus.Pending) {
                throw errorNeedRetry;
              } else if (transactionStatus === TransactionStatus.Failed) {
                throw errorTransactionReverted;
              }
            } else if (isCarrierPolkaChain(chainId) || (chainId === CHAIN_ID_MOONBEAM && isParachainTxHash(txHash))) {
              const txHashParsed = parseParachainTxHash(txHash);

              console.log('polka chain transaction params', txHashParsed);

              if (txHashParsed?.bridgeType === ParachainBridgeType.MRL) {
                if ('moonbeamTransactionHash' in txHashParsed) {
                  const receipt = await getEthTransactionReceipt({
                    chainId: CHAIN_ID_MOONBEAM,
                    txHash: txHashParsed.moonbeamTransactionHash,
                  });
                  const status = getTransactionStatusFromReceipt(receipt);

                  if (status === TransactionStatus.Successful) {
                    txn = receipt;
                  } else if (status === TransactionStatus.Pending) {
                    throw errorNeedRetry;
                  } else if (status === TransactionStatus.Failed) {
                    throw errorTransactionReverted;
                  }
                }
              } else if (txHashParsed?.bridgeType === ParachainBridgeType.XCM) {
                const blockHash =
                  'sourceParachainBlockHash' in txHashParsed ? txHashParsed.sourceParachainBlockHash : undefined;
                const extrinsicHash =
                  'sourceParachainExtrinsicHash' in txHashParsed
                    ? txHashParsed.sourceParachainExtrinsicHash
                    : undefined;

                if (blockHash && extrinsicHash) {
                  const extrinsic = await getPolkadotExtrinsic({
                    chainId: chainId === CHAIN_ID_MOONBEAM ? MOONBEAM_PARACHAIN_ID : chainId,
                    blockHash,
                    extrinsicHash,
                  });

                  txn = extrinsic;
                }
              }
            } else if (isCarrierEVMChain(chainId)) {
              const receipt = await getEthTransactionReceipt({ chainId, txHash });
              const status = getTransactionStatusFromReceipt(receipt);
              if (status === TransactionStatus.Successful) {
                txn = receipt;
              } else if (status === TransactionStatus.Pending) {
                throw errorNeedRetry;
              } else if (status === TransactionStatus.Failed) {
                throw errorTransactionReverted;
              }
            }

            return txn;
          },
          { signal, maxRetry: Infinity, throttleInterval: 3 * 1000, backoffStrategyFactor: 1.5 },
        );

        // console.log('useTransactionResult result', _data);

        return _data;
      }
    },
    [chainId, txHash],
  );

  return data;
}
