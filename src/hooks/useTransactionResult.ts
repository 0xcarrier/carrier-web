import { CHAIN_ID_SOLANA } from '@certusone/wormhole-sdk';
import { TransactionStatus } from '../context/Wallet/types';
import { getEthTransactionStatus } from '../utils/ethereum';
import { getSolanaTransactionStatus } from '../utils/solana';
import { errorNeedRetry, runWithErrorRetry } from '../utils/timer';
import { useData } from './useData';
import { CarrierChainId } from '../utils/consts';
import { isCarrierEVMChain } from '../utils/web3Utils';

export function useTransactionStatus(options: { chainId?: CarrierChainId; txHash?: string }) {
  const { chainId, txHash } = options;

  const data = useData(
    async (signal) => {
      // console.log('useTransactionStatus', { wallet, txHash });

      if (chainId && txHash) {
        const _data = await runWithErrorRetry(
          async () => {
            try {
              const status =
                chainId === CHAIN_ID_SOLANA
                  ? await getSolanaTransactionStatus({ txHash })
                  : isCarrierEVMChain(chainId)
                  ? await getEthTransactionStatus({ chainId, txHash })
                  : undefined;

              if (status != null && status === TransactionStatus.Pending) {
                throw errorNeedRetry;
              }

              return status;
            } catch (e) {
              console.log(e);

              throw errorNeedRetry;
            }
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
