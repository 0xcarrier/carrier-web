import { CHAIN_ID_MOONBEAM, CHAIN_ID_SOLANA, EVMChainId } from '@certusone/wormhole-sdk';
import { BigNumber, Contract } from 'ethers/lib/ethers';
import { commify, formatUnits } from 'ethers/lib/utils';

import abi from '../../../abis/WormholeTokenBridge.json';
import { AmountData } from '../../../hooks/useAmountData';
// import { getOriginAssetsOnChain } from '../../../hooks/useTargetAsset';
import { CarrierChainId, getTokenBridgeAddressForChain } from '../../../utils/consts';
import { TokenData } from '../../../utils/tokenData/helper';
import { getEvmProviderWithWormholeChainId, isCarrierEVMChain, isCarrierPolkaChain } from '../../../utils/web3Utils';
import { getPendingPromise, useData } from '../../../hooks/useData';
import { PolkachainTokens } from '../../../utils/tokenData/mrl';

type BridgeLimitOption = {
  signal: AbortSignal;
  amountData?: AmountData;
  sourceChainId?: CarrierChainId;
  sourceToken?: TokenData;
};

type BridgeLimitData =
  | {
      limitExceeded: boolean;
      maxBridgeLimit: BigNumber;
      maxBridgeLimitUI: string;
      outstandingBridgedAmount?: BigNumber;
    }
  | undefined;

export type UseBridgeLimitDataHook = typeof useBridgeLimitData;

const MAX_UINT64 = BigNumber.from(2).pow(64).sub(1);

async function getBridgeLimitData({ signal, amountData, sourceChainId, sourceToken }: Required<BridgeLimitOption>) {
  if (amountData.amountValidationInfo.error) {
    throw amountData.amountValidationInfo.error;
  }

  if (amountData.amountValidationInfo.loading) {
    return getPendingPromise(signal);
  }

  const {
    amountValidationInfo: { data: amountValidationInfoData },
  } = amountData;
  const { decimals, tokenAddress } = sourceToken;

  let bridgeAmount: BigNumber | undefined;
  if (amountValidationInfoData /*  && transferAmountString */) {
    const { transferAmountParsed } = amountValidationInfoData;
    if (transferAmountParsed) {
      bridgeAmount = normalizeAmount(transferAmountParsed, decimals);
    }
  }

  let outstandingBridgedAmount;
  if (isCarrierEVMChain(sourceChainId)) {
    outstandingBridgedAmount = await getOutstandingBridgedAmount(sourceChainId, tokenAddress);
  } else if (sourceChainId === CHAIN_ID_SOLANA) {
    outstandingBridgedAmount = BigNumber.from(0);
  } else if (isCarrierPolkaChain(sourceChainId)) {
    const polkadotTokenData = PolkachainTokens[sourceChainId].find((item) => item.assetId === tokenAddress);
    outstandingBridgedAmount = polkadotTokenData
      ? await getOutstandingBridgedAmount(CHAIN_ID_MOONBEAM, polkadotTokenData.tokenAddressOnMoonbeam)
      : undefined;
  }

  const maxBridgeLimit = outstandingBridgedAmount ? MAX_UINT64.sub(outstandingBridgedAmount) : MAX_UINT64;
  // display only 4 decimal points max
  const maxBridgeLimitUI = getHumanReadableMaxBridgeAmount(maxBridgeLimit, decimals, 4);

  let limitExceeded = false;
  if (outstandingBridgedAmount && bridgeAmount) {
    limitExceeded = outstandingBridgedAmount.add(bridgeAmount).gt(MAX_UINT64);
  }

  return {
    limitExceeded,
    maxBridgeLimit,
    maxBridgeLimitUI,
    outstandingBridgedAmount,
  } as BridgeLimitData;
}

export function useBridgeLimitData({ amountData, sourceChainId, sourceToken }: Omit<BridgeLimitOption, 'signal'>) {
  const result = useData(
    async (signal) => {
      if (!amountData || !sourceChainId || !sourceToken) {
        return;
      }

      const data = await getBridgeLimitData({ signal, amountData, sourceChainId, sourceToken });

      return data;
    },
    [amountData, amountData, sourceChainId, sourceToken],
  );

  // console.group('debug: bridgeLimitData');
  // console.log('loading: ', result.loading);
  // console.log('data: ', result.data);
  // console.groupEnd();

  return result;
}

// Borrowed from Bridge.sol#L276-L281<https://github.com/wormhole-foundation/wormhole/blob/e695fad0bed8f0962adca40df24baa979e52c639/ethereum/contracts/bridge/Bridge.sol#L276-L281>
function normalizeAmount(amount: BigNumber, decimals: number) {
  if (decimals > 8) {
    return amount.div(BigNumber.from(10).pow(decimals - 8));
  }
  return amount;
}

// Borrowed from Bridge.sol#L283-L288<https://github.com/wormhole-foundation/wormhole/blob/e695fad0bed8f0962adca40df24baa979e52c639/ethereum/contracts/bridge/Bridge.sol#L283-L288>
function deNormalizeAmount(amount: BigNumber, decimals: number) {
  if (decimals > 8) {
    return amount.mul(BigNumber.from(10).pow(decimals - 8));
  }
  return amount;
}

async function getOutstandingBridgedAmount(sourceChainId: CarrierChainId, sourceTokenAddress: string) {
  const ethProvider = getEvmProviderWithWormholeChainId(sourceChainId);
  const contractAddress = getTokenBridgeAddressForChain(sourceChainId);
  const contract = new Contract(contractAddress, abi, ethProvider);
  const outstandingBridge = await contract.outstandingBridged(sourceTokenAddress);

  if (!outstandingBridge) {
    return;
  }

  return outstandingBridge as BigNumber;
}

function getHumanReadableMaxBridgeAmount(amount: BigNumber, tokenDecimals: number, uiDecimals = 8) {
  let commifiedAmount = commify(formatUnits(deNormalizeAmount(amount, tokenDecimals || 18), tokenDecimals));
  if (commifiedAmount.indexOf('.')) {
    const decimalPosition = commifiedAmount.indexOf('.');
    if (decimalPosition === 0) {
      commifiedAmount = commifiedAmount.substring(0, decimalPosition);
    } else {
      commifiedAmount = commifiedAmount.substring(0, decimalPosition + 1 + uiDecimals);
    }
  }
  return commifiedAmount;
}
