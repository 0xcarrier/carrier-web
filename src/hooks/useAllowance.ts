import { ethers } from 'ethers';
import { useEffect, useMemo } from 'react';
import { CarrierChainId, getTokenBridgeAddressForChain } from '../utils/consts';
import { getTBTCAddressForChain, getTBTCGatewayForChain } from '../utils/tbtc';
import { errorNeedRetry, runWithErrorRetry } from '../utils/timer';
import { TokenData } from '../utils/tokenData/helper';
import { AmountData } from './useAmountData';
import { DataResult, useData } from './useData';
import { Wallet } from './useWallet';
import { isPolkachainTokens } from '../utils/tokenData/mrl';
import { ProviderFeeData } from './useProviderFeeData';
import { needTransferByXCM } from '../utils/polkadot';
import { carrierChainIdCCTPDomainMap, cctpSDK, getCCTPNetworkConfigs } from '../utils/cctp';

export interface Allowance {
  approvalRequired: boolean;
  allowance: ethers.BigNumber | undefined;
}

export interface AllowanceData {
  loading: boolean;
  error: Error | undefined;
  data: {
    approvalRequired: boolean;
    allowance: ethers.BigNumber | undefined;
  };
}

export function useAllowance(options: {
  sourceChainId?: CarrierChainId;
  targetChainId: CarrierChainId;
  sourceWallet: Wallet;
  sourceToken: TokenData | undefined;
  amountData: AmountData;
  providerFeeData: DataResult<ProviderFeeData | undefined>;
}) {
  const { sourceChainId, targetChainId, sourceWallet, sourceToken, amountData, providerFeeData } = options;
  const needFetchAllowance = useMemo(() => {
    return !sourceWallet.wallet ||
      !sourceToken ||
      sourceToken.isNativeAsset ||
      (sourceChainId &&
        (needTransferByXCM(sourceChainId, targetChainId) ||
          isPolkachainTokens({ chainId: sourceChainId, tokenAddress: sourceToken.tokenAddress })))
      ? false
      : true;
  }, [sourceChainId, targetChainId, sourceWallet.wallet, sourceToken]);

  const allowanceData = useData(
    async (signal, __, retryTimes) => {
      if (
        sourceChainId &&
        sourceToken &&
        needFetchAllowance &&
        sourceWallet.wallet &&
        amountData.amountValidationInfo.data?.transferAmountParsed
      ) {
        const maxRetry = retryTimes !== 0 ? 10 : 0;
        const allowance = await runWithErrorRetry(
          async ({ retryCount }) => {
            const TBTCGateway = getTBTCGatewayForChain(sourceChainId);
            const cctpSourceDomain =
              sourceWallet.expectedChainId && carrierChainIdCCTPDomainMap[sourceWallet.expectedChainId];
            const cctpNetworkConfigs =
              sourceWallet.expectedChainId && targetChainId
                ? getCCTPNetworkConfigs({ sourceChainId: sourceWallet.expectedChainId, targetChainId })
                : undefined;
            const spenderAddress = sourceWallet.expectedChainId
              ? cctpNetworkConfigs &&
                cctpNetworkConfigs.cctpSourceNetworkConfigs.usdcContractAddress.toLowerCase() ===
                  sourceToken.tokenAddress.toLowerCase()
                ? cctpNetworkConfigs.cctpSourceNetworkConfigs.cctpMessengerContractAddress
                : TBTCGateway &&
                  getTBTCAddressForChain(sourceChainId).toLowerCase() === sourceToken.tokenAddress.toLowerCase()
                ? TBTCGateway
                : getTokenBridgeAddressForChain(sourceWallet.expectedChainId)
              : undefined;
            const result = spenderAddress
              ? await sourceWallet.wallet?.getTokenAllowance({
                  tokenAddress: sourceToken.tokenAddress,
                  spenderAddress,
                })
              : undefined;

            if (
              retryCount < maxRetry &&
              amountData.amountValidationInfo.data?.transferAmountParsed &&
              result &&
              result.allowance.lt(
                amountData.amountValidationInfo.data.transferAmountParsed.add(
                  providerFeeData.data?.hasFees && providerFeeData.data.totalFeeParsed
                    ? providerFeeData.data.totalFeeParsed
                    : ethers.BigNumber.from(0),
                ),
              )
            ) {
              throw errorNeedRetry;
            }

            return result;
          },
          { signal, maxRetry },
        );

        return allowance;
      }
    },
    [
      sourceChainId,
      targetChainId,
      needFetchAllowance,
      sourceWallet.wallet?.getTokenAllowance,
      sourceToken?.tokenAddress,
      amountData.amountValidationInfo.data?.transferAmountParsed,
      providerFeeData.data?.hasFees,
    ],
  );

  useEffect(() => {
    // reset when tokenAddress, transferAmountString changed
    allowanceData.resetRetryTimes();
  }, [sourceToken?.tokenAddress, amountData.amountValidationInfo.data?.transferAmountParsed]);

  useEffect(() => {
    if (sourceWallet.wallet?.approveTokenResult.result?.txHash) {
      allowanceData.retry();
    }
  }, [sourceWallet.wallet?.approveTokenResult.result?.txHash]);

  return useMemo((): AllowanceData => {
    const allowanceExceedsAmount =
      amountData.amountValidationInfo.loading || !amountData.amountValidationInfo.data?.transferAmountParsed
        ? true
        : providerFeeData.loading || !providerFeeData.data
        ? true
        : allowanceData.data?.allowance && amountData.amountValidationInfo.data?.transferAmountParsed
        ? allowanceData.data?.allowance.gte(
            amountData.amountValidationInfo.data.transferAmountParsed.add(
              providerFeeData.data.hasFees && providerFeeData.data.totalFeeParsed
                ? providerFeeData.data.totalFeeParsed
                : ethers.BigNumber.from(0),
            ),
          )
        : false;
    const approvalRequired = needFetchAllowance ? !allowanceExceedsAmount : false;

    const obj = {
      loading: amountData.amountValidationInfo.loading || allowanceData.loading || false,
      error: amountData.amountValidationInfo.error || allowanceData.error || undefined,
      data: {
        approvalRequired,
        allowance: allowanceData.data?.allowance,
      },
    };

    return obj;
  }, [amountData.amountValidationInfo, providerFeeData, allowanceData, needFetchAllowance]);
}
