import React from 'react';

import { css } from '@linaria/core';

import { CarrierChainId, getExplorerName, getExplorerTxAddress } from '../../utils/consts';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { txShortener } from '../../utils/web3Utils';
import { SVGIcon } from '../common/SVGIcon';
import { A } from '../common/A';

type Props = {
  chainId: CarrierChainId;
  txHash: string;
  showHash?: boolean;
};

/**
 * Used for BridgeProgress component, shows a link to the chain explorer
 * and can also show a shorten transaction hash if `showHash` is set to true.
 *
 * @param {CarrierChainId} chainId
 * @param {Transaction} txHash  transaction hash
 * @param {Boolean} showHash either show hash or not, default to false
 */
const BridgeShowTx = ({ chainId, txHash, showHash = false }: Props) => {
  const explorerAddress = getExplorerTxAddress(chainId, txHash);

  const explorerName = getExplorerName(chainId);

  return (
    <span className={mainWrapper}>
      {showHash && <span>Txn: {txShortener(txHash)}</span>}

      <A className={explorerLink} href={explorerAddress} target="_blank" rel="noreferrer">
        View on {explorerName}
        <SVGIcon className={styleExplorerIcon} iconName="arrow-up-right" />
      </A>
    </span>
  );
};

const mainWrapper = css`
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-shrink: 0;
  font-weight: 600;
  gap: ${pxToPcVw(8)};
  font-size: ${pxToPcVw(13)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(8)};
    font-size: ${pxToMobileVw(13)};
  }
`;

const explorerLink = css`
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: ${pxToPcVw(13)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(13)};
  }
`;

const styleExplorerIcon = css`
  width: ${pxToPcVw(10)};
  height: ${pxToPcVw(10)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(10)};
    height: ${pxToMobileVw(10)};
  }
`;

export default BridgeShowTx;
