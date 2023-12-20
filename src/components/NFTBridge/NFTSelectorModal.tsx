import { css } from '@linaria/core';
import React, { useEffect, useState } from 'react';
import { tokenNotExisted, TokensData } from '../../hooks/useTokens';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { NFTData } from '../../utils/tokenData/helper';
import { isCarrierEVMChain, nftNameShortener } from '../../utils/web3Utils';
import { HintMessage } from '../common/HintMessage';
import { Loading } from '../common/Loading';
import { InputStyle, SearchWrapper, SelectionModal, styleInputWrapper } from '../common/SelectionModal';
import { Spinner } from '../common/Spinner';
import { NFTCover } from '../common/NFTCover';
import { SVGIcon } from '../common/SVGIcon';
import { useDebouncedCallback } from 'use-debounce';
import { CHAIN_ID_SOLANA } from '@certusone/wormhole-sdk';
import { A } from '../common/A';
import { CarrierChainId } from '../../utils/consts';

interface ModalProps {
  visible: boolean;
  sourceChainId?: CarrierChainId;
  sourceTokens: TokensData;
  onVisibleChanged: (visible: boolean) => void;
  onSearchToken: (options: { tokenAddress: string; tokenId?: string }) => void;
  onSelectToken: (options: { tokenAddress: string; tokenId?: string }) => void;
}

export const NFTSelectorModal: React.SFC<ModalProps> = ({
  visible,
  sourceChainId,
  sourceTokens,
  onVisibleChanged,
  onSearchToken,
  onSelectToken,
}) => {
  const [tokenAddressInputValue, setTokenAddressInputValue] = useState('');
  const [tokenIdInputValue, setTokenIdInputValue] = useState('');
  const onSearchTokenDebounce = useDebouncedCallback(onSearchToken, 1000);

  useEffect(() => {
    if (
      sourceChainId &&
      isCarrierEVMChain(sourceChainId) &&
      ((tokenAddressInputValue && !tokenIdInputValue) || (!tokenAddressInputValue && tokenIdInputValue))
    ) {
      return;
    }

    onSearchTokenDebounce({
      tokenAddress: tokenAddressInputValue.toLowerCase(),
      tokenId: sourceChainId === CHAIN_ID_SOLANA ? undefined : tokenIdInputValue,
    });
  }, [tokenAddressInputValue, tokenIdInputValue, sourceChainId]);

  useEffect(() => {
    if (!visible) {
      setTokenAddressInputValue('');
      setTokenIdInputValue('');
    }
  }, [visible]);

  function renderToken(nftData: NFTData) {
    return (
      <div
        key={`${nftData.tokenAddress}-${nftData.tokenId}`}
        className={NFTListItemWrapper}
        onClick={() => {
          onSelectToken({ tokenAddress: nftData.tokenAddress, tokenId: nftData.tokenId });
          onVisibleChanged(false);
        }}>
        <NFTCover className={NFTListItemImage} image={nftData.image} image256={nftData.image_256} />
        <div className={NFTListItemOverlay}>{renderNFTName(nftData)}</div>
      </div>
    );
  }

  return (
    <SelectionModal visible={visible} title="Select NFT" onVisibleChanged={onVisibleChanged}>
      <div className={SearchWrapper}>
        <SVGIcon iconName="search" />
        <div className={styleInputWrapper}>
          <input
            className={InputStyle}
            value={tokenAddressInputValue}
            placeholder="Search NFT contract address"
            spellCheck="false"
            onChange={(e) => setTokenAddressInputValue(e.target.value)}
          />
        </div>
      </div>
      {sourceChainId && isCarrierEVMChain(sourceChainId) ? (
        <div className={SearchWrapper}>
          <div className={styleInputWrapper}>
            <input
              className={InputStyle}
              value={tokenIdInputValue}
              placeholder="Search NFT ID"
              spellCheck="false"
              onChange={(e) => setTokenIdInputValue(e.target.value)}
            />
          </div>
        </div>
      ) : null}
      <div className={styleList}>
        {sourceTokens.searchTokenData ? (
          <Loading
            options={sourceTokens.searchTokenResult}
            renderLoading={() => (
              <div className={styleLoadingContainer}>
                <Spinner className={styleSpiner} /> Searching NFT
              </div>
            )}
            render={(data) => {
              return data ? <div className={NFTListWrapper}>{renderToken(data)}</div> : <div>NFT is not Existed</div>;
            }}
            renderError={({ error, retry }) => {
              return error === tokenNotExisted ? (
                <div className={styleTips}>NFT is not Existed</div>
              ) : (
                <HintMessage
                  className={{ wrapper: styleLoadingContainer }}
                  type="error"
                  message={
                    <>
                      Search NFT failed. <A onClick={retry}>Retry</A>
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
                <Spinner className={styleSpiner} /> Fetching NFTs
              </div>
            )}
            renderError={({ error, retry }) => {
              return (
                <HintMessage
                  className={{ wrapper: styleLoadingContainer }}
                  type="error"
                  message={
                    <>
                      Load NFTs failed. <A onClick={retry}>Retry</A>
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
                          Partial NFTs load failed. <A onClick={sourceTokens.cachedTokens.retry}>Retry</A>
                        </>
                      }
                    />
                  ) : sourceTokens.remoteTokens.loading ? (
                    <div className={styleLoadingContainer}>
                      <Spinner className={styleSpiner} /> Fetching More NFTs
                    </div>
                  ) : sourceTokens.remoteTokens.error ? (
                    <HintMessage
                      className={{ wrapper: styleLoadingContainer }}
                      type="error"
                      message={
                        <>
                          Fetch more NFTs failed. <A onClick={sourceTokens.remoteTokens.retry}>Retry</A>
                        </>
                      }
                    />
                  ) : null}
                  {data && data.tokens.length ? (
                    <div className={NFTListWrapper}>
                      {data.tokens.map((item) => {
                        return renderToken(item);
                      })}
                    </div>
                  ) : (
                    <div className={styleTips}>You don't have any NFTs</div>
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

function renderNFTName(nftData: NFTData) {
  const { name, nftName, tokenId } = nftData;
  const _name = name || nftName;

  return (
    <div>
      {!tokenId ? (
        <span>{_name ? `${nftNameShortener(_name)}` : '???'}</span>
      ) : (
        <>
          <span>{_name ? `${nftNameShortener(_name)}` : '???'}</span>
          <br />
          <span>{tokenId ? `#${nftNameShortener(tokenId)}` : 'UNKNOWN_ID'}</span>
        </>
      )}
    </div>
  );
}

const styleList = css`
  display: flex;
  flex-direction: column;
  align-items: center;
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
  margin-bottom: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    margin-bottom: ${pxToMobileVw(16)};
  }
`;

const NFTListItemWrapper = css`
  position: relative;
  background-color: var(--ant-primary-color);
  font-weight: 600;
  aspect-ratio: 1;
  overflow: hidden;
  width: 100%;
  border-radius: ${pxToPcVw(8)};
  font-size: ${pxToPcVw(14)};

  @media (max-width: 1024px) {
    border-radius: ${pxToMobileVw(8)};
    font-size: ${pxToMobileVw(14)};
  }
`;

const NFTListItemOverlay = css`
  position: absolute;
  display: flex;
  text-align: center;
  justify-content: center;
  align-items: center;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: 0.2s ease;
  background: rgb(0, 0, 0);
  background: rgba(0, 0, 0, 0.5);

  &:hover {
    cursor: pointer;

    opacity: 0.85;
  }
`;

const NFTListItemImage = css`
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 100%;
  border-radius: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    border-radius: ${pxToPcVw(8)};
  }
`;

const NFTListWrapper = css`
  width: 100%;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: max-content;
  overflow-y: auto;
  justify-items: center;
  align-items: center;
  padding-left: ${pxToPcVw(16)};
  padding-right: ${pxToPcVw(16)};
  padding-bottom: ${pxToPcVw(16)};
  gap: ${pxToPcVw(12)};

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
    padding-left: ${pxToMobileVw(16)};
    padding-right: ${pxToMobileVw(16)};
    padding-bottom: ${pxToMobileVw(16)};
    gap: ${pxToMobileVw(12)};
  }
`;

const styleTips = css`
  line-height: 1.1em;
`;
