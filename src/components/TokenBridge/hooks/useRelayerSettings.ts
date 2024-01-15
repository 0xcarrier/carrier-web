import { useEffect, useMemo, useState } from 'react';
import { getLocalStorageAdvanceOptions } from '../../../utils/localStorageAdvanceOptions';
import { CarrierChainId } from '../../../utils/consts';
import { needTransferByMRL, needTransferByXCM } from '../../../utils/polkadot';
import { isCarrierEVMChain } from '../../../utils/web3Utils';
import { CHAIN_ID_SOLANA } from '@certusone/wormhole-sdk';

export function useRelayerSettings(options: { sourceChainId?: CarrierChainId; targetChainId?: CarrierChainId }) {
  const { sourceChainId, targetChainId } = options;
  const advanceOptions = getLocalStorageAdvanceOptions();

  const [isUsingRelayer, setIsUsingRelayer] = useState(advanceOptions?.isUsingRelayer || false);
  const [isRelayerSettingDisabled, setIsRelayerSettingDisabled] = useState(false);

  useEffect(() => {
    if (sourceChainId && targetChainId) {
      if (
        // if the source chain or target chain is polkachain, then we enable the relayer by default.
        needTransferByMRL(sourceChainId, targetChainId)
      ) {
        if (targetChainId === CHAIN_ID_SOLANA) {
          setIsUsingRelayer(false);
          setIsRelayerSettingDisabled(true);
        } else {
          setIsUsingRelayer(true);
          setIsRelayerSettingDisabled(false);
        }
      } else if (needTransferByXCM(sourceChainId, targetChainId)) {
        setIsUsingRelayer(false);
        setIsRelayerSettingDisabled(true);
      } else {
        setIsUsingRelayer(advanceOptions ? advanceOptions.isUsingRelayer : false);
        setIsRelayerSettingDisabled(false);
      }
    }
  }, [sourceChainId, targetChainId]);

  return useMemo(() => {
    return {
      isRelayerSettingDisabled,
      isUsingRelayer,
      setIsUsingRelayer,
    };
  }, [isUsingRelayer, isRelayerSettingDisabled, setIsUsingRelayer]);
}
