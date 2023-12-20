import { useEffect, useMemo } from 'react';
import { NFTData } from '../../../utils/tokenData/helper';
import { useData } from '../../../hooks/useData';
import { Wallet } from '../../../hooks/useWallet';
import { errorNeedRetry, runWithErrorRetry } from '../../../utils/timer';
import { getNFTBridgeAddressForChain } from '../../../utils/consts';

export interface ApprovedData {
  loading: boolean;
  error: Error | undefined;
  data: {
    approvalRequired: boolean;
  };
}

export function useNFTApproved(options: { sourceWallet: Wallet; sourceToken: NFTData | undefined }) {
  const { sourceWallet, sourceToken } = options;
  const needFetchAllowance = useMemo(() => {
    return !sourceWallet.wallet ? false : !sourceToken ? false : true;
  }, [sourceWallet.wallet, sourceToken]);

  const approvedData = useData(
    async (signal, _, retryTimes) => {
      if (sourceToken && needFetchAllowance && sourceWallet.wallet) {
        const maxRetry = retryTimes !== 0 ? 10 : 0;
        const approved = await runWithErrorRetry(
          async ({ retryCount }) => {
            const spenderAddress = sourceWallet.expectedChainId
              ? getNFTBridgeAddressForChain(sourceWallet.expectedChainId)
              : undefined;
            const result = spenderAddress
              ? await sourceWallet.wallet?.getNFTApproved({
                  tokenAddress: sourceToken.tokenAddress,
                  tokenId: sourceToken.tokenId,
                  spenderAddress,
                })
              : undefined;

            if (retryCount < maxRetry && result && !result.approved) {
              throw errorNeedRetry;
            }

            return result;
          },
          { signal, maxRetry },
        );

        return approved;
      }
    },
    [needFetchAllowance, sourceWallet.wallet?.getNFTApproved, sourceToken?.tokenAddress, sourceToken?.tokenId],
  );

  useEffect(() => {
    // reset when tokenAddress, tokenId changed
    approvedData.resetRetryTimes();
  }, [sourceToken?.tokenAddress, sourceToken?.tokenId]);

  useEffect(() => {
    if (sourceWallet.wallet?.approveNFTResult.result?.txHash) {
      approvedData.retry();
    }
  }, [sourceWallet.wallet?.approveNFTResult.result?.txHash]);

  return useMemo((): ApprovedData => {
    const approvalRequired = needFetchAllowance
      ? approvedData.data == null
        ? false
        : !approvedData.data.approved
      : false;

    const obj = {
      loading: approvedData.loading,
      error: approvedData.error,
      data: {
        approvalRequired,
      },
    };

    return obj;
  }, [approvedData, needFetchAllowance]);
}
