import { useMemo } from 'react';
import Srand from 'seeded-rand';
import { CarrierChainId } from '../../../utils/consts';
import { needTransferByXCM } from '../../../utils/polkadot';

export function useRandomXCMFee(options: {
  sourceChainId: CarrierChainId;
  targetChainId: CarrierChainId;
  transferAmountString: string;
}): number | undefined {
  const { sourceChainId, targetChainId, transferAmountString } = options;

  // We generate a random small amount for the xcm fee (by GLMR) to avoid the message hash being duplicated
  return useMemo(() => {
    if (needTransferByXCM(sourceChainId, targetChainId)) {
      // time based seed
      const rnd = new Srand(Date.now());

      // generate random int between 0 and 10,000,000
      // it will be added to transferMultiAssets feeItem to avoid duplicated message hash
      return rnd.intInRange(0, 10000000);
    }
  }, [sourceChainId, targetChainId, transferAmountString]);
}
