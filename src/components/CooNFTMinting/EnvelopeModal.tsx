import React from 'react';
import { css, cx } from '@linaria/core';
import { Modal } from '../common/Modal';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { CooContractData } from './hooks/useFetchCooContract';
import { Button } from '../common/Button';
import { SVGIcon } from '../common/SVGIcon';
import { isEventEnded } from './cooHelper';
import { routes } from '../../utils/routes';
import cooCongratsMintLogo from '../../assets/coo_congrats_mint.png';
import cooFledLogo from '../../assets/coo_fled.png';

interface EnvelopeModalProps {
  openModal: boolean;
  isMinting: boolean;
  isCheckWinningVaa: boolean;
  isAvailableOnMint: boolean | undefined;
  eligibleVaa: string;
  cooContractData: CooContractData | undefined;
  onMint: () => void;
  onCloseEmptyEnvelope: () => void;
  onCloseModal: () => void;
  isModalClosable?: boolean;
}

export const EnvelopeModal: React.SFC<EnvelopeModalProps> = ({
  openModal,
  isModalClosable,
  isMinting,
  isCheckWinningVaa,
  isAvailableOnMint,
  eligibleVaa,
  cooContractData,
  onMint,
  onCloseEmptyEnvelope,
  onCloseModal,
}) => {
  const isAbleToOpenEnvelope = (eligibleVaa && cooContractData?.isPublicMintAvailable) || !!isAvailableOnMint;
  const hasEventEnd =
    isEventEnded(cooContractData?.endMintTime) || !cooContractData?.isPublicMintAvailable || !!isAvailableOnMint;

  return (
    <Modal
      maskClosable={isModalClosable ? isModalClosable : true}
      modalClassName={styleModal}
      open={openModal}
      title={
        isCheckWinningVaa
          ? `Hold your breath!`
          : isAbleToOpenEnvelope
          ? `Congratulations! You've found a Coo`
          : `Oh no! The wild Coo fled.`
      }
      onCancel={() => {
        isCheckWinningVaa ? void undefined : isAbleToOpenEnvelope ? onCloseModal() : onCloseEmptyEnvelope();
      }}>
      <div className={modalContainer}>
        <div className={modalTopContent}>
          {isCheckWinningVaa ? (
            <div>What would it be? Tearing up the envelope...</div>
          ) : isAbleToOpenEnvelope ? (
            <>
              <div>Click on the 'Mint Coo' button now! Be fast, for supply is limited!</div>
              <Button
                className={mintButtonStyle}
                type="primary"
                onClick={() => onMint()}
                loading={isMinting}
                disabled={isMinting}>
                Mint Coo <SVGIcon className={isMinting ? viewCooIconDisabled : viewCooIcon} iconName="view-coo" />
              </Button>
            </>
          ) : hasEventEnd ? (
            <>
              <div>
                <p>You've opened up an empty envelope.</p>
                <p>The bad news? {`All NFTs have been claimed.`}</p>
                <p>Stay close with us for future releases!</p>
              </div>
              <Button className={mintButtonStyle} type="primary" onClick={onCloseEmptyEnvelope}>
                Okay
              </Button>
            </>
          ) : (
            <>
              <div>
                <p>You've opened up an empty envelope.</p>
                <p>The good news? Make another transaction to try again.</p>
              </div>
              <Button className={mintButtonStyle} type="primary" href={routes.tokenBridge.getRoute()}>
                Bridge now <SVGIcon className={arrowUpRightIcon} iconName="arrow-right-zigzag" />
              </Button>
            </>
          )}
        </div>
        {isCheckWinningVaa ? (
          <></>
        ) : isAbleToOpenEnvelope ? (
          <img src={cooCongratsMintLogo} className={cx(responsiveImage, mobileModalImage)} alt="congrats logo" />
        ) : (
          <img src={cooFledLogo} className={cx(responsiveImage, mobileModalImage)} alt="fled logo" />
        )}
      </div>
    </Modal>
  );
};

const styleModal = css`
  width: ${pxToPcVw(637)};

  @media (max-width: 1024px) {
    width: 100%;
    height: 100%;
  }
`;

const modalContainer = css`
  padding: ${pxToPcVw(16)};
  gap: ${pxToPcVw(20)};
  font-size: ${pxToPcVw(16)};
  line-height: ${pxToPcVw(20)};
  overflow: hidden;

  @media (max-width: 1024px) {
    width: 100%;
    height: 100%;
    text-align: center;
    padding: ${pxToMobileVw(16)};
    gap: ${pxToMobileVw(20)};
    font-size: ${pxToMobileVw(16)};
    line-height: ${pxToMobileVw(20)};
  }
`;

const modalTopContent = css`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${pxToPcVw(6)};

  @media (max-width: 1024px) {
    flex-direction: column;
    gap: ${pxToMobileVw(20)};
    margin-bottom: ${pxToMobileVw(6)};
  }
`;

const mintButtonStyle = css`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  stroke: #fff;
  color: #fff;
  background-color: var(--ant-primary-1);
  font-weight: 600;
  border: solid ${pxToPcVw(2)} var(--ant-primary-4);
  padding: 0 ${pxToPcVw(12)} !important;
  height: ${pxToPcVw(44)};
  border-radius: ${pxToPcVw(8)};
  line-height: ${pxToPcVw(17)};
  font-size: ${pxToPcVw(14)};
  gap: ${pxToPcVw(8)};

  &.ant-btn::before {
    // remove antd loading status background overlay
    background: var(--ant-primary-1);
  }

  &:disabled {
    color: var(--ant-background) !important;
    background: var(--ant-primary-color);

    cursor: not-allowed;

    &:hover {
      background: var(--ant-primary-color);
    }
  }

  @media (max-width: 1024px) {
    width: 100%;
    padding: 0 ${pxToMobileVw(12)} !important;
    border: solid ${pxToMobileVw(2)} var(--ant-primary-4);
    height: ${pxToMobileVw(44)};
    border-radius: ${pxToMobileVw(8)};
    line-height: ${pxToMobileVw(17)};
    font-size: ${pxToMobileVw(14)};
    gap: ${pxToMobileVw(8)};
  }
`;

const viewCooIcon = css`
  width: ${pxToPcVw(15)};
  height: ${pxToPcVw(13)};
  stroke: #fff;
  fill: none;

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(15)};
    height: ${pxToMobileVw(13)};
  }
`;

const viewCooIconDisabled = css`
  width: ${pxToPcVw(15)};
  height: ${pxToPcVw(13)};
  stroke: currentColor;

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(15)};
    height: ${pxToMobileVw(13)};
  }
`;

const arrowUpRightIcon = css`
  width: ${pxToPcVw(20)};
  height: ${pxToPcVw(20)};
  fill: currentColor;

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(20)};
    height: ${pxToMobileVw(20)};
  }
`;

const responsiveImage = css`
  @media (max-width: 1024px) {
    width: 100%;
    height: auto;
  }
`;

const mobileModalImage = css`
  @media (max-width: 1024px) {
    margin-top: ${pxToMobileVw(20)};
  }
`;
