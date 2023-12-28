import { TransactionStatus } from '../context/Wallet/types';
import { getEvmProviderWithWormholeChainId } from './web3Utils';
import { TransactionReceipt } from '../hooks/useTransaction';
import { CarrierChainId } from './consts';
import { Fragment, Interface } from 'ethers/lib/utils';
import { JsonFragment } from '@ethersproject/abi';

export async function getEthTransactionReceipt(options: { chainId: CarrierChainId; txHash: string }) {
  const { chainId, txHash } = options;
  const provider = getEvmProviderWithWormholeChainId(chainId);

  return provider.getTransactionReceipt(txHash);
}

export async function getEthTransaction(options: { chainId: CarrierChainId; txHash: string }) {
  const { chainId, txHash } = options;
  const provider = getEvmProviderWithWormholeChainId(chainId);

  const txn = await provider.getTransaction(txHash);

  return txn ? txn : null;
}

export async function getEthTransactionStatus(options: { chainId?: CarrierChainId; txHash: string }) {
  const { chainId, txHash } = options;

  if (!chainId) {
    return;
  }

  const provider = getEvmProviderWithWormholeChainId(chainId);

  const receipt = await provider.getTransactionReceipt(txHash);

  return getTransactionStatusFromReceipt(receipt);
}

export function getTransactionStatusFromReceipt(receipt: TransactionReceipt) {
  return receipt && receipt.status != null
    ? receipt.status === 0
      ? TransactionStatus.Failed
      : TransactionStatus.Successful
    : TransactionStatus.Pending;
}

export function decodeTx(abis: (string | ReadonlyArray<Fragment | JsonFragment | string>)[], data: string) {
  for (let i = 0; i < abis.length; i++) {
    try {
      const iface = new Interface(abis[i]);

      return iface.parseTransaction({ data });
    } catch (e) {}
  }
}

export function parseLogs(options: { iface: Interface; logs: Array<any>; methodName: string }) {
  const { iface, logs, methodName } = options;

  for (const receiptLog of logs) {
    try {
      const log = iface.parseLog(receiptLog);

      if (log.name === methodName) {
        return log;
      }
    } catch (e) {
      // the correct log might be the other logs in the list
      continue;
    }
  }
}

export function checkSrcAndDestChain(sourceChainId: CarrierChainId, destinationChain: CarrierChainId) {
  if (sourceChainId === destinationChain) {
    throw new Error(`source chain and destination chain can't be the same. chain ID: ${sourceChainId}`);
  }
}
