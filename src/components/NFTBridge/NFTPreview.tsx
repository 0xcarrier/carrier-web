import React, { useState } from 'react';

import { css } from '@linaria/core';

import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { renderNFTName } from '../../utils/web3Utils';
import { Modal } from '../common/Modal';
import { Spinner } from '../common/Spinner';
import SVGUnselectedNFTPlaceholder from '../../assets/svgs/unselected-nft-placeholder.svg';
import { NFTData } from '../../utils/tokenData/helper';
import { NFTCover } from '../common/NFTCover';
import { SVGIcon } from '../common/SVGIcon';

interface IProps {
  sourceToken?: NFTData;
}

export const NFTPreview: React.SFC<IProps> = ({ sourceToken }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMediaLoaded, setIsMediaLoaded] = useState(false);

  return (
    <div className={MediaWrapper}>
      {sourceToken ? (
        <>
          {!isMediaLoaded ? (
            <div className={styleSpinner}>
              <Spinner />
            </div>
          ) : null}
          <NFTCover
            className={isMediaLoaded ? NFTImage : NFTImageNone}
            image={sourceToken.image}
            image256={sourceToken.image_256}
            videoProps={{
              onPlaying: () => {
                if (!isMediaLoaded) {
                  setIsMediaLoaded(true);
                }
              },
            }}
            onLoad={() => setIsMediaLoaded(true)}
          />
          <div className={Overlay} onClick={() => setIsModalOpen(true)}>
            <SVGIcon className={styleMaxIcon} iconName="maximize-icon" />
          </div>
        </>
      ) : (
        <img src={SVGUnselectedNFTPlaceholder} className={NFTPlaceholder} alt="" />
      )}

      {/* show enlarged NFT image */}
      <Modal
        title={sourceToken ? <>{renderNFTName(sourceToken)}</> : <div>NFT</div>}
        maskClosable={true}
        open={isModalOpen}
        modalClassName={styleModal}
        onCancel={() => {
          setIsModalOpen(false);
        }}>
        <div className={styleModalBody}>
          <div className={Avatar}>
            {!isMediaLoaded ? (
              <div className={styleSpinner}>
                <Spinner />
              </div>
            ) : null}
            {sourceToken ? (
              <NFTCover
                className={isMediaLoaded ? AvatarImage : NFTImageNone}
                image={sourceToken.image}
                image256={sourceToken.image_256}
                onLoad={() => setIsMediaLoaded(true)}
              />
            ) : null}
          </div>
        </div>
      </Modal>
    </div>
  );
};

const styleModal = css`
  display: flex;
  flex-direction: column;
  min-height: ${pxToPcVw(200)};

  @media (max-width: 1024px) {
    width: 100%;
    height: 100%;
    min-height: none;
  }
`;

const Overlay = css`
  position: absolute;
  display: flex;
  justify-content: center;
  align-items: center;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  -ms-transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: 0.2s ease;
  background: rgba(0, 0, 0, 0.5);
  cursor: pointer;

  &:hover {
    opacity: 0.75;
  }
`;

const MediaWrapper = css`
  position: relative;
`;

const NFTPlaceholder = css`
  width: ${pxToPcVw(48)};
  height: ${pxToPcVw(48)};
  border: 0;
  object-fit: fill;

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(48)};
    height: ${pxToMobileVw(48)};
  }
`;

const NFTImageNone = css`
  display: none;
`;

const NFTImage = css`
  width: ${pxToPcVw(48)};
  height: ${pxToPcVw(48)};
  border-radius: ${pxToPcVw(4)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(48)};
    height: ${pxToMobileVw(48)};
    border-radius: ${pxToMobileVw(4)};
  }
`;

const styleModalBody = css`
  flex-grow: 1;
  overflow-y: auto;
`;

const Avatar = css`
  position: relative;
  margin: ${pxToPcVw(32)};
  width: ${pxToPcVw(359)};

  &::before {
    display: block;
    content: '';
    padding-top: 100%;
  }

  @media (max-width: 1024px) {
    margin: ${pxToMobileVw(16)};
    width: auto;
  }
`;

const AvatarImage = css`
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border: ${pxToPcVw(8)} solid #2d41a7;
  border-radius: ${pxToPcVw(8)};

  margin-left: auto;
  margin-right: auto;

  @media (max-width: 1024px) {
    border: ${pxToMobileVw(8)} solid #2d41a7;
    border-radius: ${pxToMobileVw(8)};
  }
`;

const styleMaxIcon = css`
  width: ${pxToPcVw(24)};
  height: ${pxToPcVw(24)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(24)};
    height: ${pxToMobileVw(24)};
  }
`;

const styleSpinner = css`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translateX(-50%) translateY(-50%);
`;
