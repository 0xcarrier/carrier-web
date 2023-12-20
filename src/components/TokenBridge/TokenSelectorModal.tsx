import { css } from '@linaria/core';
import React from 'react';
import { tokenNotExisted, TokensData } from '../../hooks/useTokens';
import { formatAmount } from '../../utils/format-amount';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { TokenData } from '../../utils/tokenData/helper';
import { addressShortener, isCarrierPolkaChain } from '../../utils/web3Utils';
import { CurrencyIcon } from '../common/CurrencyIcon';
import { HintMessage } from '../common/HintMessage';
import { Loading } from '../common/Loading';
import { SelectionModal, SelectionModalTag } from '../common/SelectionModal';
import { Spinner } from '../common/Spinner';
import { A } from '../common/A';
import { CarrierChainId } from '../../utils/consts';

interface ModalProps {
  visible: boolean;
  sourceChainId?: CarrierChainId;
  sourceTokens: TokensData;
  onVisibleChanged: (visible: boolean) => void;
  onSearchToken: (options: { tokenAddress: string }) => void;
  onSelectToken: (options: { tokenAddress: string }) => void;
}

export const TokenSelectorModal: React.SFC<ModalProps> = ({
  visible,
  sourceChainId,
  sourceTokens,
  onVisibleChanged,
  onSearchToken,
  onSelectToken,
}) => {
  function renderToken(tokenData: TokenData, index: number) {
    return (
      <div
        key={`${tokenData.tokenAddress}-${index}`}
        className={ListItemWrapper}
        onClick={() => {
          onSelectToken({ tokenAddress: tokenData.tokenAddress });
          onVisibleChanged(false);
        }}>
        <CurrencyIcon className={ListItemLogo} src={tokenData.logo} symbol={tokenData.symbol} />
        <div className={styleTokenName}>
          <div className={styleTokenNameRow}>
            <div className={styleTokenSymbol}>{tokenData.symbol || 'Unknown'}</div>
            {tokenData.isUINativeAsset ? <SelectionModalTag>Native</SelectionModalTag> : null}
          </div>
          {!tokenData.isUINativeAsset && tokenData.tokenAddress ? (
            <div className={styleTokenAddress}>{addressShortener(tokenData.tokenAddress)}</div>
          ) : null}
        </div>
        {tokenData.uiAmount != null ? (
          <div className={TokenBalanceWrapper}>{formatAmount(tokenData.uiAmount)}</div>
        ) : null}
      </div>
    );
  }

  return (
    <SelectionModal
      visible={visible}
      title="Select Token"
      searchPlaceHolder={isCarrierPolkaChain(sourceChainId) ? 'Paste asset ID' : 'Paste token contract address'}
      searching={sourceTokens.searchTokenResult.loading}
      onVisibleChanged={onVisibleChanged}
      onSearch={(searchString) => {
        onSearchToken({ tokenAddress: searchString.toLowerCase() });
      }}>
      <div className={styleList}>
        {sourceTokens.searchTokenData ? (
          <Loading
            options={sourceTokens.searchTokenResult}
            renderLoading={() => (
              <div className={styleLoadingContainer}>
                <Spinner className={styleSpiner} /> Searching Tokens
              </div>
            )}
            render={(data) => {
              return data ? renderToken(data, 0) : <div>Token does not exist</div>;
            }}
            renderError={({ error, retry }) => {
              return error === tokenNotExisted ? (
                <div className={styleTips}>Token does not exist</div>
              ) : (
                <HintMessage
                  className={{ wrapper: styleLoadingContainer }}
                  type="error"
                  message={
                    <>
                      Search token failed. <A onClick={retry}>Retry</A>
                    </>
                  }
                />
              );
            }}
          />
        ) : (
          <Loading
            options={sourceTokens.cachedTokens}
            renderLoading={() => (
              <div className={styleLoadingContainer}>
                <Spinner className={styleSpiner} /> Fetching Tokens
              </div>
            )}
            renderError={({ error, retry }) => {
              return (
                <HintMessage
                  className={{ wrapper: styleLoadingContainer }}
                  type="error"
                  message={
                    <>
                      Load tokens failed. <A onClick={retry}>Retry</A>
                    </>
                  }
                />
              );
            }}
            render={(data) => {
              return (
                <>
                  {sourceTokens.cachedTokens.data?.errors.length ? (
                    <HintMessage
                      className={{ wrapper: styleLoadingContainer }}
                      type="error"
                      message={
                        <>
                          Partial tokens load failed. <A onClick={sourceTokens.cachedTokens.retry}>Retry</A>
                        </>
                      }
                    />
                  ) : sourceTokens.remoteTokens.loading ? (
                    <div className={styleLoadingContainer}>
                      <Spinner className={styleSpiner} /> Fetching More Tokens
                    </div>
                  ) : sourceTokens.remoteTokens.data?.errors.length ? (
                    <HintMessage
                      className={{ wrapper: styleLoadingContainer }}
                      type="error"
                      message={
                        <>
                          Fetch more tokens failed. <A onClick={sourceTokens.remoteTokens.retry}>Retry</A>
                        </>
                      }
                    />
                  ) : null}
                  {data && data.tokens.length ? (
                    data.tokens.map((item, index) => {
                      return renderToken(item, index);
                    })
                  ) : (
                    <div className={styleTips}>You don't have any tokens</div>
                  )}
                </>
              );
            }}
          />
        )}
      </div>
    </SelectionModal>
  );
};

const styleList = css`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const ListItemWrapper = css`
  display: flex;
  align-items: center;
  font-weight: 500;
  color: #fff;
  padding: ${pxToPcVw(13)} ${pxToPcVw(16)};
  gap: ${pxToPcVw(21)};
  font-size: ${pxToPcVw(20)};
  width: 100%;

  &:hover {
    cursor: pointer;
    background: var(--ant-primary-color);
    color: #fff;
  }

  @media (max-width: 1024px) {
    padding: ${pxToMobileVw(13)} ${pxToMobileVw(16)};
    gap: ${pxToMobileVw(21)};
    font-size: ${pxToMobileVw(20)};
  }
`;

const ListItemLogo = css`
  height: ${pxToPcVw(48)};
  width: ${pxToPcVw(48)};

  @media (max-width: 1024px) {
    height: ${pxToMobileVw(48)};
    width: ${pxToMobileVw(48)};
  }
`;

const styleTokenName = css`
  flex-shrink: 0;
`;

const styleTokenNameRow = css`
  display: flex;
  align-items: center;
  gap: ${pxToPcVw(21)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(21)};
  }
`;

const styleTokenSymbol = css`
  display: block;
  flex-grow: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: ${pxToPcVw(440)};

  @media (max-width: 1024px) {
    max-width: ${pxToMobileVw(235)};
  }
`;

const styleTokenAddress = css`
  color: var(--color-text-3);
  font-size: ${pxToPcVw(14)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(14)};
  }
`;

const TokenBalanceWrapper = css`
  margin-left: auto;
  font-weight: 100;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
`;

const styleSpiner = css`
  margin-right: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    margin-right: ${pxToMobileVw(8)};
  }
`;

const styleLoadingContainer = css`
  display: flex;
  align-items: center;
  line-height: 1.1em;
  margin-bottom: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    margin-bottom: ${pxToMobileVw(16)};
  }
`;

const styleTips = css`
  line-height: 1.1em;
`;
