import React, { useState } from 'react';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { Modal } from '../common/Modal';
import { useCooMetadata } from './hooks/useCooMetadata';
import { css } from '@linaria/core';
import { Spinner } from '../common/Spinner';
import { CHAIN_ID_ETH, CHAIN_ID_POLYGON } from '@certusone/wormhole-sdk';
import { CLUSTER, CarrierChainId, cooNFTMintParams } from '../../utils/consts';
import { SVGIcon } from '../common/SVGIcon';

interface CooViewNFTModalProps {
  openModal: boolean;
  onCloseModal: () => void;
  tokenId: number | undefined;
}

export const CooViewNFTModal: React.SFC<CooViewNFTModalProps> = ({ openModal, onCloseModal, tokenId }) => {
  const [isMediaLoaded, setIsMediaLoaded] = useState(false);
  const { cooMetadata, isLoading: isMetadataLoading, error } = useCooMetadata(tokenId);

  const constructOpenseaLink = (tokenAddress: string, chainId: number, tokenId: number | undefined) => {
    const wormholeChainId = chainId as CarrierChainId;
    let openseaLink = '';

    if (!tokenId) {
      return openseaLink;
    }

    if (CLUSTER === 'mainnet') {
      if (wormholeChainId === CHAIN_ID_ETH) {
        openseaLink = `https://opensea.io/assets/ethereum/${tokenAddress}/${tokenId}`;
      } else if (wormholeChainId === CHAIN_ID_POLYGON) {
        openseaLink = `https://opensea.io/assets/polygon/${tokenAddress}/${tokenId}`;
      }
    } else {
      // testnet
      if (wormholeChainId === CHAIN_ID_ETH) {
        openseaLink = `https://testnets.opensea.io/assets/goerli/${tokenAddress}/${tokenId}`;
      } else if (wormholeChainId === CHAIN_ID_POLYGON) {
        openseaLink = `https://testnets.opensea.io/assets/mumbai/${tokenAddress}/${tokenId}`;
      }
    }
    return openseaLink;
  };

  const openseaLink = constructOpenseaLink(cooNFTMintParams.tokenAddress, cooNFTMintParams.chainId, tokenId);

  return (
    <Modal
      title={`Carrier Coo #${tokenId}`}
      maskClosable={true}
      open={openModal}
      modalClassName={styleModal}
      onCancel={onCloseModal}>
      <div className={modalContainer}>
        <div>
          <>
            {isMediaLoaded === false || isMetadataLoading ? (
              <div className={nftImageLoader}>
                <Spinner />
              </div>
            ) : null}
            <img
              className={isMediaLoaded ? nftImage : nftImageNone}
              src={cooMetadata ? cooMetadata.image : undefined}
              onLoad={() => setIsMediaLoaded(true)}
              alt={`Carrier Coo #${tokenId}`}
            />
          </>
        </div>
        <div className={viewOpenseaLinkWrapper}>
          <a className={openseaLinkStyle} href={openseaLink} target="_blank" rel="noopener noreferrer">
            <span className={openseaText}>View on OpenSea</span>
            <SVGIcon className={arrowUpRightIcon} iconName="arrow-up-right" />
          </a>
        </div>
      </div>
    </Modal>
  );
};

const arrowUpRightIcon = css`
  width: ${pxToPcVw(10)};
  height: ${pxToPcVw(10)};

  & > * {
    fill: currentColor;
  }

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(10)};
    height: ${pxToMobileVw(10)};
  }
`;

const styleModal = css`
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  min-height: ${pxToPcVw(300)};

  @media (max-width: 1024px) {
    width: 100%;
    height: 100%;
    min-height: none;
  }
`;

const modalContainer = css`
  padding: ${pxToPcVw(30)} ${pxToPcVw(30)} ${pxToPcVw(20)};
  gap: ${pxToPcVw(20)};

  @media (max-width: 1024px) {
    padding: ${pxToMobileVw(30)} ${pxToMobileVw(30)} ${pxToMobileVw(20)};
    gap: ${pxToMobileVw(20)};
  }
`;

const nftImage = css`
  width: ${pxToPcVw(300)};
  height: ${pxToPcVw(300)};
  object-fit: cover;
  border: ${pxToPcVw(2)} solid #2d41a7;
  border-radius: ${pxToPcVw(8)};
  background-color: var(--ant-background-3);

  margin-left: auto;
  margin-right: auto;

  @media (max-width: 1024px) {
    border: ${pxToMobileVw(2)} solid #2d41a7;
    border-radius: ${pxToMobileVw(8)};
    width: ${pxToMobileVw(300)};
    height: ${pxToMobileVw(300)};
  }
`;

const nftImageNone = css`
  display: none;
`;

const nftImageLoader = css`
  display: flex;
  justify-content: center;
  align-items: center;
  width: ${pxToPcVw(300)};
  height: ${pxToPcVw(300)};
  object-fit: cover;
  border: ${pxToPcVw(2)} solid #2d41a7;
  border-radius: ${pxToPcVw(8)};
  background-color: var(--ant-background-3);

  margin-left: auto;
  margin-right: auto;

  @media (max-width: 1024px) {
    border: ${pxToMobileVw(2)} solid #2d41a7;
    border-radius: ${pxToMobileVw(8)};
    width: ${pxToMobileVw(300)};
    height: ${pxToMobileVw(300)};
  }
`;

const viewOpenseaLinkWrapper = css`
  display: flex;
  align-items: center;
  justify-content: end;
  margin-top: ${pxToPcVw(20)};

  @media (max-width: 1024px) {
    margin-top: ${pxToMobileVw(20)};
  }
`;

const openseaText = css`
  margin-right: ${pxToPcVw(4)};

  @media (max-width: 1024px) {
    margin-right: ${pxToMobileVw(4)};
  }
`;

const openseaLinkStyle = css`
  display: flex;
  align-items: center;
  font-weight: 600;
  font-size: ${pxToPcVw(14)};
  line-height: ${pxToPcVw(22)};
  color: var(--ant-primary-5);

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(14)};
    line-height: ${pxToMobileVw(22)};
  }
`;
