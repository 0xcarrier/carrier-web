import React from 'react';

import { css } from '@linaria/core';

import { CHAINS, CarrierChainId } from '../../utils/consts';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { ChainSelector } from '../common/ChainSelector/ChainSelector';

type Props = {
  label?: string;
  chainId: CarrierChainId;
  onSelectChain: (options: { chainId: CarrierChainId }) => void;
};

export const SourceSelect = ({ label = 'Source chain', chainId, onSelectChain }: Props) => {
  return (
    <>
      <div className={chainSelectRow}>
        <div className={inputLabel}>{label}</div>
      </div>

      <div className={chainSelectRow}>
        <ChainSelector className={inputChainSelect} chains={CHAINS} chainId={chainId} onSelectChain={onSelectChain} />
      </div>
    </>
  );
};

const chainSelectRow = css`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(8)};
  }
`;

const inputLabel = css`
  font-weight: 500;
  line-height: 1.25;
  font-size: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(16)};
  }
`;

const inputChainSelect = css`
  background-color: transparent;
  border: ${pxToPcVw(2)} solid var(--ant-primary-color);

  @media (max-width: 1024px) {
    border: ${pxToMobileVw(2)} solid var(--ant-primary-color);
  }
`;
