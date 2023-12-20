import { CHAIN_ID_SOLANA, getIsTransferCompletedEth, getIsTransferCompletedSolana } from '@certusone/wormhole-sdk';
import {
  getIsTransferCompletedEth as getIsNFTTransferCompletedEth,
  getIsTransferCompletedSolana as getIsNFTTransferCompletedSolana,
} from '@certusone/wormhole-sdk/lib/esm/nft_bridge/getIsTransferCompleted';
import { CarrierChainId, getNFTBridgeAddressForChain, getTokenBridgeAddressForChain } from '../../../utils/consts';
import { getSolanaConnection } from '../../../utils/solana';
import { getEvmProviderWithWormholeChainId, isCarrierEVMChain } from '../../../utils/web3Utils';
import { useEffect, useState } from 'react';
import { setTimer } from '../../../utils/timer';
import { VaaType } from '../../../hooks/useSignedVaa';
import { carrierChainIdCCTPDomainMap, cctpSDK } from '../../../utils/cctp';

async function getIsTransferCompleted(options: { chainId: CarrierChainId; vaaType: VaaType; signedVAA: Uint8Array }) {
  const { chainId, vaaType, signedVAA } = options;

  if (isCarrierEVMChain(chainId)) {
    const provider = getEvmProviderWithWormholeChainId(chainId);

    if (vaaType === VaaType.NFT) {
      return getIsNFTTransferCompletedEth(getNFTBridgeAddressForChain(chainId), provider, signedVAA);
    } else {
      return getIsTransferCompletedEth(getTokenBridgeAddressForChain(chainId), provider, signedVAA);
    }
  } else if (chainId === CHAIN_ID_SOLANA) {
    const connection = getSolanaConnection();

    if (vaaType === VaaType.NFT) {
      return getIsNFTTransferCompletedSolana(getNFTBridgeAddressForChain(chainId), signedVAA, connection);
    } else {
      return getIsTransferCompletedSolana(getTokenBridgeAddressForChain(chainId), signedVAA, connection);
    }
  } else {
    throw new Error(`chain ${chainId} is not supported`);
  }
}

async function getIsCCTPTransferCompleted(options: { chainId: CarrierChainId; burnTxHash: string }) {
  const { chainId, burnTxHash } = options;

  return cctpSDK.isTransferCompleted({ sourceDomain: carrierChainIdCCTPDomainMap[chainId], burnTxHash });
}

export default function usePollingTransferStatus(options: {
  sourceChainId?: CarrierChainId;
  targetChainId?: CarrierChainId;
  vaaType: VaaType;
  signedVAA?: Uint8Array;
  cctpBurnTxhash?: string;
}) {
  const { sourceChainId, targetChainId, vaaType, signedVAA, cctpBurnTxhash } = options;
  const [isTransferCompleted, setIsTransferCompleted] = useState<boolean>();

  useEffect(() => {
    let stopTimer: (() => void) | undefined;
    let currentAbortController: AbortController | undefined;

    if (!isTransferCompleted && sourceChainId && targetChainId && (signedVAA != null || cctpBurnTxhash != null)) {
      stopTimer = setTimer(
        async () => {
          currentAbortController?.abort();

          const abortController = new AbortController();

          currentAbortController = abortController;

          const completed = signedVAA
            ? await getIsTransferCompleted({ chainId: targetChainId, vaaType, signedVAA })
            : cctpBurnTxhash && vaaType === VaaType.USDC
            ? await getIsCCTPTransferCompleted({ chainId: sourceChainId, burnTxHash: cctpBurnTxhash })
            : false;

          if (!abortController.signal.aborted) {
            setIsTransferCompleted(completed);
          }

          if (completed && stopTimer) {
            stopTimer();
          }
        },
        10 * 1000,
        1.04,
      );
    }

    return () => {
      currentAbortController?.abort();

      if (stopTimer) {
        stopTimer();
      }
    };
  }, [isTransferCompleted, sourceChainId, targetChainId, signedVAA, cctpBurnTxhash]);

  useEffect(() => {
    setIsTransferCompleted(undefined);
  }, [, sourceChainId, targetChainId, signedVAA, cctpBurnTxhash]);

  return isTransferCompleted;
}
