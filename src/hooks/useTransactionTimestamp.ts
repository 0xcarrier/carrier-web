import { getEvmProviderWithWormholeChainId, isCarrierEVMChain, isCarrierPolkaChain } from '../utils/web3Utils';
import { getPendingPromise, useData } from './useData';
import { useTransaction } from './useTransaction';
import { CarrierChainId, MOONBEAM_PARACHAIN_ID } from '../utils/consts';
import { CHAIN_ID_MOONBEAM } from '@certusone/wormhole-sdk';
import { getPolkadotProviderWithWormholeChainId } from '../utils/polkadot';

async function getTimestamp(options: {
  signal: AbortSignal;
  chainId: CarrierChainId;
  tx: ReturnType<typeof useTransaction>;
}) {
  const { signal, chainId, tx } = options;

  if (tx.error) {
    throw tx.error;
  }

  if (tx.loading) {
    return getPendingPromise(signal);
  }

  if (tx.data) {
    if ('block' in tx.data && 'extrinsic' in tx.data) {
      const api = await getPolkadotProviderWithWormholeChainId(
        chainId === CHAIN_ID_MOONBEAM ? MOONBEAM_PARACHAIN_ID : chainId,
      );
      const timestamp = await api.query.timestamp.now.at(tx.data.block.block.hash.toHex());
      return timestamp.toNumber();
    } else if ('blockTime' in tx.data) {
      return tx.data.blockTime ? tx.data.blockTime * 1000 : undefined;
    } else if ('blockNumber' in tx.data) {
      const blockNumber = tx.data.blockNumber;

      if (blockNumber) {
        if (isCarrierEVMChain(chainId) || isCarrierPolkaChain(chainId)) {
          const provider = isCarrierPolkaChain(chainId)
            ? getEvmProviderWithWormholeChainId(CHAIN_ID_MOONBEAM)
            : getEvmProviderWithWormholeChainId(chainId);
          const block = await provider.getBlock(blockNumber);

          if (block && block.timestamp) {
            return block.timestamp * 1000;
          }
        }
      }
    }
  }
}

export function useTransactionTimestamp(options: { chainId?: CarrierChainId; tx: ReturnType<typeof useTransaction> }) {
  const { chainId, tx } = options;

  const data = useData(
    async (signal) => {
      if (chainId) {
        return getTimestamp({ signal, chainId, tx });
      }
    },
    [chainId, tx],
  );

  return data;
}
