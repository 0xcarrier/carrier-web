import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import TransactionHistory from '../TransactionHistory/TransactionHistory';
import { InputStyle, SearchWrapper, SectionHeader } from './WalletManagement';
import { css } from '@linaria/core';
import React, { useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { SVGIcon } from '../common/SVGIcon';
import { convertValidEVMToChecksumAddress } from '../../utils/web3Utils';
import { CarrierChainId } from '../../utils/consts';

interface Props {
  chainId: CarrierChainId;
  walletAddress: string;
}

const WalletTransactions = ({ chainId, walletAddress }: Props) => {
  const [txnSearchStr, setTxnSearchStr] = useState('');
  const setTxnSearchStrWithDebounce = useDebouncedCallback(setTxnSearchStr, 1000, { leading: false });

  const onChangeTxnSearch = (str: string) => {
    // add delay as the user may be continue typing
    let newStr = convertValidEVMToChecksumAddress(str);
    setTxnSearchStrWithDebounce(newStr);
  };

  return (
    <div className={TransactionsWrapper}>
      <div className={SectionHeader}>Transactions</div>
      {/* search */}
      <div className={SearchWrapper}>
        <SVGIcon iconName="search" />
        <input
          className={InputStyle}
          placeholder={'Address, transaction ID, etc.'}
          spellCheck="false"
          onChange={(e) => onChangeTxnSearch(e.target.value)}
        />
      </div>
      {/* transaction history */}
      <TransactionHistory chainId={chainId} walletAddress={walletAddress} searchStr={txnSearchStr} />
    </div>
  );
};

export default WalletTransactions;

const TransactionsWrapper = css`
  flex-shrink: 0;
  display: flex;
  flex-direction: column;

  // make sure this width and AssetsWrapper add to 100% - gap
  width: 70%;
  gap: ${pxToPcVw(24)};

  @media (max-width: 1024px) {
    width: 100%;
    gap: ${pxToMobileVw(24)};
  }
`;
