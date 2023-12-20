import React, { useMemo, useState } from 'react';

import { css, cx } from '@linaria/core';
import { Tabs, TabsProps } from 'antd';

import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { Spinner } from '../common/Spinner';
import { InputStyle, SearchWrapper, SectionHeader } from './WalletManagement';
import { formatAmount } from '../../utils/format-amount';
import { CurrencyIcon } from '../common/CurrencyIcon';
import { NFTCover } from '../common/NFTCover';
import { SVGIcon } from '../common/SVGIcon';
import { useTokens } from '../../hooks/useTokens';
import { NFTData } from '../../utils/tokenData/helper';
import { CarrierChainId } from '../../utils/consts';

interface IProps {
  chainId: CarrierChainId;
  walletAddress: string;
}

const WalletBalances = ({ walletAddress, chainId }: IProps) => {
  const [search, setSearch] = useState<string>('');
  const [tab, setTab] = useState<string>('tokens');
  const tokenAccounts = useTokens({ walletAddress, chainId, isNFT: false });
  const nftTokenAccounts = useTokens({ walletAddress, chainId, isNFT: true });
  const tokenFilteredItems: NFTData[] = useMemo(() => {
    let searchStr = search.toLowerCase();
    return (
      tokenAccounts.cachedTokens.data?.tokens?.filter((item) => {
        if (item.tokenAddress.toLowerCase().includes(searchStr)) {
          return item;
        }
        if (item.name?.toLowerCase().includes(searchStr)) {
          return item;
        }
        if (item.symbol?.toLowerCase().startsWith(searchStr)) {
          return item;
        }
      }) || []
    );
  }, [tokenAccounts.cachedTokens.data?.tokens, search]);
  const nftTokenFilteredItems: NFTData[] = useMemo(() => {
    return (
      nftTokenAccounts.cachedTokens.data?.tokens?.filter((item) =>
        item.tokenAddress.toLowerCase().includes(search.toLowerCase()),
      ) || []
    );
  }, [nftTokenAccounts.cachedTokens.data?.tokens, search]);

  //eth wallet '0x3ef63a41dc067492051ec24be4da8281f7dbb18f' for testing, he has many nfts and balances
  //sol wallet '2xmdxjo4XDmP2tGb2xQXUv5mRC52QkWdGYVu8S1ixyTr' has many tokens
  //bsc wallet '0xf9211ffbd6f741771393205c1c3f6d7d28b90f03' 521 items
  //polygon wallet '0x75d4c0318aa29ad5dae306069131571540299421'
  //avax wallet '0x757AC2b3B193262923676f86B6C372517FCf7694'
  const TAB_ITEMS: TabsProps['items'] = [
    {
      label: `Tokens${
        tokenAccounts.cachedTokens.loading || tokenAccounts.remoteTokens.loading
          ? ''
          : ` (${tokenAccounts.cachedTokens.data?.tokens.length || 0})`
      }`,
      key: 'tokens',
      children: '',
    },
    {
      label: `NFTs${
        nftTokenAccounts.cachedTokens.loading || nftTokenAccounts.remoteTokens.loading
          ? ''
          : ` (${nftTokenAccounts.cachedTokens.data?.tokens.length || 0})`
      }`,
      key: 'nft',
      children: '',
    },
  ];

  const handleInputChange = (input: string) => {
    setSearch(input);
  };

  const onChange = (tabKey: string) => {
    setTab(tabKey);
  };

  const renderNoAssets = () => (
    <div className={NoAssetsWrapper}>
      <SVGIcon className={styleNoAssetsIcon} iconName="house" />
      No assets here yet
    </div>
  );

  const renderTokensList = () => {
    if (tokenFilteredItems.length > 0) {
      return tokenFilteredItems.map((item) => {
        return (
          <div key={item.tokenAddress} className={TokensBalanceItem}>
            <div className="logo">
              <CurrencyIcon className={styleLogo} src={item.logo} symbol={item.symbol} />
            </div>
            <div className="amountSectionToken">
              <div className="tokenFirstRowInfo">
                <div className="tokenName">{item.name || 'UNKNOWN'}</div>
                {item.isUINativeAsset && <div className="nativePill">Native</div>}
              </div>
              <div className="tokenBalance">
                {formatAmount(item.uiAmount)} {item.symbol || 'UNKNOWN'}
              </div>
            </div>
          </div>
        );
      });
    } else {
      return renderNoAssets();
    }
  };

  const renderNFTList = () => {
    if (nftTokenFilteredItems.length > 0) {
      return nftTokenFilteredItems.map((item) => {
        return (
          <div key={`${item.tokenAddress}${item.tokenId}`} className={TokensBalanceItem}>
            <div className="logo">
              <NFTCover className={styleNFTLogo} image={item.image} image256={item.image_256} />
            </div>
            <div>{item.name}</div>
            <div className="amountSectionNFT">#{item.tokenId}</div>
          </div>
        );
      });
    } else {
      return renderNoAssets();
    }
  };

  return (
    <div className={AssetsWrapper}>
      <div className={SectionHeader}>
        Assets
        <Tabs className={TabsStyle} defaultActiveKey="tokens" onChange={onChange} items={TAB_ITEMS} />
      </div>
      <div className={SearchWrapper}>
        <SVGIcon iconName="search" />
        <input
          className={InputStyle}
          placeholder={'Search assets'}
          spellCheck="false"
          onChange={(e) => handleInputChange(e.target.value)}
        />
      </div>
      {(
        tab === 'tokens'
          ? tokenAccounts.cachedTokens.loading || tokenAccounts.remoteTokens.loading
          : nftTokenAccounts.cachedTokens.loading || nftTokenAccounts.remoteTokens.loading
      ) ? (
        <div className={styleLoadingTips}>
          <div>This may take a while...</div>
          <Spinner />
        </div>
      ) : (
        <div
          className={cx(
            TokensBalanceWrapper,
            ((tab === 'tokens' && !tokenFilteredItems.length) || (tab === 'nft' && !nftTokenFilteredItems.length)) &&
              EmptyTokensBalanceWrapper,
          )}>
          {tab === 'tokens' && renderTokensList()}
          {tab === 'nft' && renderNFTList()}
        </div>
      )}
    </div>
  );
};

export default WalletBalances;

const AssetsWrapper = css`
  flex-shrink: 0;
  display: flex;
  flex-direction: column;

  // make sure this width and TransactionsWrapper add to 100% - gap
  width: 28%;
  gap: ${pxToPcVw(24)};

  @media (max-width: 1024px) {
    width: 100%;
    gap: ${pxToMobileVw(24)};
  }
`;

const TokensBalanceWrapper = css`
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
  max-height: ${pxToPcVw(450)};
  border: ${pxToPcVw(2)} solid var(--color-border);
  padding-top: ${pxToPcVw(16)};
  padding-bottom: ${pxToPcVw(16)};
  padding-left: ${pxToPcVw(16)};
  padding-right: ${pxToPcVw(16)};
  gap: ${pxToPcVw(25)};
  border-radius: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    max-height: none;
    border: none;
    padding-top: 0;
    padding-bottom: 0;
    padding-left: 0;
    padding-right: 0;
    gap: ${pxToMobileVw(16)};
    border-radius: 0;
  }
`;

const EmptyTokensBalanceWrapper = css`
  border: 0;
`;

const TokenTabStyle = css`
  font-size: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(16)};
  }
`;

const TabsStyle = css`
  width: ${pxToPcVw(298)};

  .ant-tabs-nav {
    margin: 0;
    margin-left: auto;
  }

  .ant-tabs-tab {
    & + .ant-tabs-tab {
      margin-right: 0;
      margin-left: ${pxToPcVw(24)};
    }

    padding: 0 0 ${pxToPcVw(10)} 0;
  }

  .ant-tabs-tab-btn {
    font-size: ${pxToPcVw(16)};
    line-height: 1.21em;
    color: var(--color-text-3);
  }

  .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn {
    color: var(--color-text);
  }

  .ant-tabs-ink-bar {
    background: var(--ant-primary-4);
    height: ${pxToPcVw(3)} !important;
  }

  @media (max-width: 1024px) {
    width: auto;

    .ant-tabs-tab {
      & + .ant-tabs-tab {
        margin-left: ${pxToMobileVw(24)};
      }

      padding: 0 0 ${pxToMobileVw(10)} 0;
    }

    .ant-tabs-tab-btn {
      font-size: ${pxToMobileVw(16)};
    }

    .ant-tabs-ink-bar {
      height: ${pxToMobileVw(3)} !important;
    }
  }
`;

const TokensBalanceItem = css`
  display: flex;
  align-items: center;
  gap: ${pxToPcVw(16)};
  font-size: ${pxToPcVw(16)};

  .logo {
    display: flex;
    flex-direction: row;
    gap: ${pxToPcVw(16)};

    // chain name
    div {
      font-weight: 500;
      color: #f4f4ff;
    }
  }

  .amountSectionToken {
    display: flex;
    flex-direction: column;
    font-weight: 400;
    color: var(--color-text-3);
    /* min-width needed to truncate token name into ellipsis if its too long */
    min-width: 0;
  }

  .tokenFirstRowInfo {
    display: inline-flex;
    align-items: center;
    gap: ${pxToPcVw(8)};
    width: 100%;
  }

  .nativePill {
    display: flex;
    justify-content: center;
    align-items: center;
    color: var(--ant-primary-4);
    padding: ${pxToPcVw(4)} ${pxToPcVw(8)};
    border-radius: ${pxToPcVw(12)};
    border: ${pxToPcVw(2)} solid var(--ant-primary-4);
    font-weight: 600;
    font-size: ${pxToPcVw(11)};
    line-height: 1;
  }

  .tokenName {
    color: var(--color-text);
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tokenBalance {
    width: ${pxToPcVw(265)};
    font-size: ${pxToPcVw(14)};
    text-overflow: ellipsis;
    overflow: hidden;
  }

  .amountSectionNFT {
    margin-left: auto;
  }

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(16)};
    font-size: ${pxToMobileVw(16)};

    .logo {
      gap: ${pxToMobileVw(16)};
    }

    .tokenFirstRowInfo {
    }

    .nativePill {
      padding: ${pxToMobileVw(4)} ${pxToMobileVw(8)};
      border-radius: ${pxToMobileVw(12)};
      border-width: ${pxToMobileVw(2)};
      font-size: ${pxToMobileVw(11)};
    }

    .tokenBalance {
      width: ${pxToMobileVw(267)};
      font-size: ${pxToMobileVw(14)};
    }
  }
`;

const NoAssetsWrapper = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  font-weight: 500;
  margin-top: ${pxToPcVw(68)};
  gap: ${pxToPcVw(28)};
  font-size: ${pxToPcVw(24)};

  @media (max-width: 1024px) {
    margin-top: ${pxToMobileVw(68)};
    gap: ${pxToMobileVw(28)};
    font-size: ${pxToMobileVw(24)};
  }
`;

const styleLoadingTips = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(8)};
  }
`;

const styleNoAssetsIcon = css`
  width: ${pxToPcVw(50)};
  height: ${pxToPcVw(50)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(50)};
    height: ${pxToMobileVw(50)};
  }
`;

const styleLogo = css`
  width: ${pxToPcVw(48)};
  height: ${pxToPcVw(48)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(48)};
    height: ${pxToMobileVw(48)};
  }
`;

const styleNFTLogo = css`
  width: ${pxToPcVw(48)};
  height: ${pxToPcVw(48)};
  border: solid ${pxToPcVw(4)} var(--ant-primary-1);
  border-radius: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(48)};
    height: ${pxToMobileVw(48)};
    border: solid ${pxToMobileVw(4)} var(--ant-primary-1);
    border-radius: ${pxToMobileVw(8)};
  }
`;
