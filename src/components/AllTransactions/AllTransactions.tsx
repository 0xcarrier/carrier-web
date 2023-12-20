import React, { useMemo, useState } from 'react';
import { css } from '@linaria/core';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import TransactionHistory from '../TransactionHistory/TransactionHistory';
import { InputStyle, SearchWrapper } from '../WalletManagement/WalletManagement';
import uniqWith from 'lodash/uniqWith';
import { useRexContext } from '@jimengio/rex';
import { IStore } from '../../store';
import { convertValidEVMToChecksumAddress } from '../../utils/web3Utils';
import { SVGIcon } from '../common/SVGIcon';
import { useDebouncedCallback } from 'use-debounce';
import { Link } from 'react-router-dom';
import { routes } from '../../utils/routes';

/**
 * display transactions and token balance for a specific wallet address
 */
export const AllTransactions = () => {
  const { walletCache } = useRexContext((store: IStore) => store);
  const [searchStr, setSearchStr] = useState('');
  const setSearchStrWithDebounce = useDebouncedCallback(setSearchStr, 1000, { leading: false });
  const filteredWalletAddresses = useMemo(() => {
    const uniqueAddresses = uniqWith(walletCache, (a, b) => a.address.toLowerCase() === b.address.toLowerCase()).map(
      (item) => item.address,
    );
    const newSearchStr = convertValidEVMToChecksumAddress(searchStr);
    const matchedWallets = uniqueAddresses.filter((walletAddress) => walletAddress === newSearchStr);

    return matchedWallets.length ? matchedWallets : uniqueAddresses;
  }, [searchStr]);

  const otherSearchString = useMemo(() => {
    // if search value is wallet address, then it's not the txn and other filter
    return filteredWalletAddresses.includes(searchStr) ? '' : searchStr;
  }, [searchStr, filteredWalletAddresses]);

  return (
    <div className={styleContainer}>
      <div className={styleHeader}>
        <div className={styleTitle}>All transactions</div>
        <Link to={routes.syncTransaction.getPath()}>Transaction lost?</Link>
      </div>
      {filteredWalletAddresses.length === 0 ? (
        <div className={flexCenter}>Connect a wallet in the home page to view past transactions!</div>
      ) : (
        <>
          <div className={SearchWrapper}>
            <SVGIcon iconName="search" />
            <input
              className={InputStyle}
              placeholder={'Search (address, transaction ID, etc.)'}
              spellCheck="false"
              onChange={(e) => setSearchStrWithDebounce(e.target.value)}
            />
          </div>
          <div className={styleTable}>
            <TransactionHistory walletAddresses={filteredWalletAddresses} searchStr={otherSearchString} />
          </div>
        </>
      )}
    </div>
  );
};

const styleHeader = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${pxToPcVw(24)};

  @media (max-width: 1024px) {
    margin-bottom: ${pxToMobileVw(24)};
  }
`;

const styleTitle = css`
  font-weight: 600;
  color: #fff;
  font-size: ${pxToPcVw(24)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(24)};
  }
`;

const styleTable = css`
  margin-top: ${pxToPcVw(24)};

  @media (max-width: 1024px) {
    margin-top: ${pxToMobileVw(24)};
  }
`;

const styleContainer = css`
  max-width: ${pxToPcVw(1198)};
  margin-left: auto;
  margin-right: auto;

  @media (max-width: 1024px) {
    padding: 0 ${pxToMobileVw(12)};
  }
`;

const flexCenter = css`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 50%;
  font-size: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(16)};
  }
`;
