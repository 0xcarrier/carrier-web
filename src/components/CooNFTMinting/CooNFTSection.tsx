import React from 'react';
import { css } from '@linaria/core';
import { Wallet } from '../../hooks/useWallet';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { Button } from '../common/Button';
import { Spinner } from '../common/Spinner';
import { SVGIcon } from '../common/SVGIcon';
import { isCountDownEnded, isEventEnded, NO_NFT_TOKEN_ID } from './cooHelper';
import { CountDownTimerDisplay } from './CountDownTimerDisplay';
import { useCountdown } from './hooks/useCountdown';
import { CooContractData } from './hooks/useFetchCooContract';
import { EligibleTxnsData } from './hooks/useFetchEligibleTxns';
import cooOpenLogo from '../../assets/coo_open.png';
import cooWithMailsLogo from '../../assets/coo_with_mails.png';
import cooYetToArriveLogo from '../../assets/coo_yet_to_arrive.png';
import cooOpenPresentsLogo from '../../assets/coo_open_presents.png';
import cooEnvelope from '../../assets/coo_envelope.png';
import { routes } from '../../utils/routes';
import { coalesceChainName } from '@certusone/wormhole-sdk';
import { cooNFTMintParams } from '../../utils/consts';

interface CooNFTSectionProps {
  cooContractData: CooContractData | undefined;
  txnsData: EligibleTxnsData | undefined;
  sourceWallet: Wallet | undefined;
  tokenId: number | undefined;
  isContractDataLoading: boolean;
  isTxnsDataLoading: boolean;
  onOpenViewNFT: (visible: boolean) => void;
  onOpenEnvelope: () => void;
}

export const CooNFTSection: React.SFC<CooNFTSectionProps> = ({
  cooContractData,
  txnsData,
  sourceWallet,
  tokenId,
  isContractDataLoading,
  isTxnsDataLoading,
  onOpenViewNFT,
  onOpenEnvelope,
}) => {
  const {
    hours: remainStartHours,
    minutes: remainStartMinutes,
    seconds: remainStartSeconds,
  } = useCountdown(cooContractData?.startMintTime);

  const isShowNFTFlow = tokenId && tokenId > NO_NFT_TOKEN_ID ? true : false;
  const isWalletConnected = sourceWallet && sourceWallet.wallet?.walletAddress;
  const hasNoTxns = !!(txnsData && txnsData?.eligibleTxns.length === 0);
  const hasTxns = !!(txnsData && txnsData?.eligibleTxns.length > 0);
  const showEventEnd =
    !!(txnsData && txnsData?.eligibleTxns.length === 0 && isEventEnded(cooContractData?.endMintTime)) ||
    cooContractData?.isPublicMintAvailable === false;

  const renderLoader = (loaderText?: string) => {
    return (
      <div className={loaderContainerStyle}>
        <div>
          {`${loaderText ? loaderText : 'Loading...'}`} <Spinner />
        </div>
      </div>
    );
  };

  /**
   * user already has an NFT and not eligible to open an envelope
   * user can only view NFT
   */
  const renderViewNFT = () => {
    return (
      <>
        <div className={titleHeader}>Your Carrier Coo is in flight</div>
        <div className={content}>
          We have great plans for our humble pigeon.
          <br />
          Our hangout spot is below.
        </div>
        <div className={buttonsGroup}>
          <Button
            className={learnMoreButtonStyle}
            type="secondary"
            href="https://ata.ws/discord"
            target="_blank"
            rel="noopener noreferrer">
            Join Discord <SVGIcon className={arrowUpRightIcon} iconName="arrow-up-right" />
          </Button>
          <Button className={actionButtonStyle2} type="primary" onClick={() => onOpenViewNFT(true)}>
            View Coo <SVGIcon className={viewCooIcon} iconName="view-coo" />
          </Button>
        </div>
        <div className={assetImageWrapper}>
          <img src={cooOpenLogo} alt="open coo logo" />
        </div>
      </>
    );
  };

  /**
   * render generic error
   * @param title optional main title, defaults to Carrier Coos are experiencing turbulence
   * @param content optional main error message, defaults to There is an error loading the page. Please try again later.
   */
  const renderError = (title?: string, content?: string) => {
    return (
      <>
        <div className={titleHeader}>{title ? title : `Carrier Coos are experiencing turbulence`}</div>
        <div className={content}>
          {content ? content : `There is an error loading the page. Please try again later.`}
        </div>
        <div className={assetImageWrapper}>
          <img src={cooWithMailsLogo} className={responsiveImage} alt="error logo" />
        </div>
      </>
    );
  };

  const renderCountdown = () => {
    return (
      <>
        <div className={titleHeader}>Carrier Coos have not yet arrived</div>
        <div className={content}>Landing on a chain near you.</div>
        <CountDownTimerDisplay
          className={CountDownTimerWrapper}
          hours={remainStartHours}
          minutes={remainStartMinutes}
          seconds={remainStartSeconds}
        />
        <div className={buttonsGroup}>
          <Button
            className={learnMoreButtonStyle}
            type="secondary"
            href="https://coo.carrier.so/"
            target="_blank"
            rel="noopener noreferrer">
            Learn More <SVGIcon className={arrowUpRightIcon} iconName="arrow-up-right" />
          </Button>
        </div>
        <div className={assetImageWrapper}>
          <img src={cooYetToArriveLogo} className={responsiveImage} alt="not started logo" />
        </div>
      </>
    );
  };

  const renderEventEnded = () => {
    return (
      <>
        <div className={titleHeader}>Carrier Coos have found their way home</div>
        <div className={content}>
          {`All NFTs have been claimed.`}
          <br />
          Stay close with us for future releases!
        </div>
        <div className={buttonsGroup}>
          <Button
            className={learnMoreButtonStyle}
            type="secondary"
            href="https://coo.carrier.so/"
            target="_blank"
            rel="noopener noreferrer">
            Learn More <SVGIcon className={arrowUpRightIcon} iconName="arrow-up-right" />
          </Button>
          <Button className={actionButtonStyle2} type="primary" href={routes.tokenBridge.getRoute()}>
            Bridge now <SVGIcon className={arrowUpRightIcon} iconName="arrow-right-zigzag" />
          </Button>
        </div>
        <div className={assetImageWrapper}>
          <img src={cooOpenPresentsLogo} className={responsiveImage} alt="open envelope logo" />
        </div>
      </>
    );
  };

  const renderPerformMoreTxns = () => {
    const chainName = coalesceChainName(cooNFTMintParams.chainId);
    const cooContractChainName = chainName.charAt(0).toUpperCase() + chainName.slice(1);

    /**
     * user's transactions is not sufficient, need to perform more transactions
     */
    return (
      <>
        <div className={titleHeader}>Find your flock in Web3</div>
        <div className={content}>
          <p>Carrier Coos are on a mission to deliver.</p>
          <span>
            Make any transaction to <span className={chainNameEmphasis}>{`${cooContractChainName}`}</span> as your{' '}
            <span className={chainNameEmphasis}>destination chain</span> to open another envelope.
          </span>
        </div>
        <div className={buttonsGroup}>
          <Button
            className={learnMoreButtonStyle}
            type="secondary"
            href="https://coo.carrier.so/"
            target="_blank"
            rel="noopener noreferrer">
            Learn More <SVGIcon className={arrowUpRightIcon} iconName="arrow-up-right" />
          </Button>
          <Button className={actionButtonStyle2} type="primary" href={routes.tokenBridge.getRoute()}>
            Bridge now <SVGIcon className={arrowUpRightIcon} iconName="arrow-right-zigzag" />
          </Button>
        </div>
        <div className={assetImageWrapper}>
          <img src={cooWithMailsLogo} alt="perform more transactions logo" className={responsiveImage} />
        </div>
      </>
    );
  };

  /**
   * user is eligible to open an envelope
   */
  const renderSealedEnvelope = () => {
    return (
      <>
        <div className={titleHeader}>Hey, Coo is waiting for you to bring it home</div>
        <div className={content}>
          Carrier Coos are rarely sighted in the wild. Open the envelope to see if you will become the lucky owner of a
          pigeon NFT.
        </div>
        <div className={buttonsGroup}>
          <Button
            className={learnMoreButtonStyle}
            type="secondary"
            href="https://coo.carrier.so/"
            target="_blank"
            rel="noopener noreferrer">
            Learn More <SVGIcon className={arrowUpRightIcon} iconName="arrow-up-right" />
          </Button>
          <Button
            className={actionButtonStyle}
            type="primary"
            loading={false}
            disabled={false}
            onClick={() => onOpenEnvelope()}>
            Open envelope
          </Button>
        </div>
        <div className={assetImageWrapper}>
          <img src={cooEnvelope} className={responsiveImage} alt="open envelope logo" />
        </div>
      </>
    );
  };

  if (isContractDataLoading) {
    return <>{renderLoader()}</>;
  }

  return isShowNFTFlow ? (
    <>{renderViewNFT()}</>
  ) : cooContractData?.endMintTime === 0 ? (
    <>{renderError()}</>
  ) : !isCountDownEnded(remainStartHours, remainStartMinutes, remainStartSeconds) ? (
    <>{renderCountdown()}</>
  ) : !isWalletConnected ? (
    <>{renderError('', 'Please connect a wallet')}</>
  ) : isTxnsDataLoading ? (
    <>{renderLoader('Fetching envelopes...')}</>
  ) : showEventEnd ? (
    /* users don't have any eligible txns (including skipped ones) */
    <>{renderEventEnded()}</>
  ) : hasNoTxns ? (
    <>{renderPerformMoreTxns()}</>
  ) : hasTxns ? (
    /* inlucde cases where previously skipped txns or got a lucky vaa hash but user close the mint modal */
    <>{renderSealedEnvelope()}</>
  ) : (
    <>{renderError()}</>
  );
};

const CountDownTimerWrapper = css`
  margin-bottom: ${pxToPcVw(20)};

  @media (max-width: 1024px) {
    margin-bottom: ${pxToMobileVw(20)};
  }
`;

const loaderContainerStyle = css`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const titleHeader = css`
  color: #fff;
  font-weight: 700;
  font-size: ${pxToPcVw(24)};
  line-height: ${pxToPcVw(28)};
  text-align: center;

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(24)};
    line-height: ${pxToMobileVw(28)};
  }
`;

const content = css`
  color: var(--color-text-3);
  font-weight: 500;
  font-size: ${pxToPcVw(16)};
  line-height: ${pxToPcVw(19.5)};
  text-align: center;
  margin-bottom: ${pxToPcVw(14)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(16)};
    line-height: ${pxToMobileVw(19.5)};
    margin-bottom: ${pxToMobileVw(14)};
  }
`;

const buttonsGroup = css`
  display: flex;
  flex-direction: row;
  gap: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    width: 100%;
    flex-direction: column;
    gap: ${pxToMobileVw(16)};
  }
`;

const learnMoreButtonStyle = css`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  color: var(--color-text);
  font-weight: 600;
  border: solid ${pxToPcVw(2)} var(--color-border);
  padding: 0 ${pxToPcVw(16)} !important;
  height: ${pxToPcVw(56)};
  border-radius: ${pxToPcVw(8)};
  line-height: ${pxToPcVw(24)};
  font-size: ${pxToPcVw(14)};
  gap: ${pxToPcVw(13)};

  @media (max-width: 1024px) {
    padding: 0 ${pxToMobileVw(16)} !important;
    border: solid ${pxToMobileVw(2)} var(--color-border);
    height: ${pxToMobileVw(56)};
    border-radius: ${pxToMobileVw(8)};
    line-height: ${pxToMobileVw(24)};
    font-size: ${pxToMobileVw(14)};
    gap: ${pxToMobileVw(13)};
  }
`;

const actionButtonStyle = css`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  color: #fff;
  background-color: var(--ant-primary-4);
  font-weight: 600;
  border: solid ${pxToPcVw(2)} var(--ant-primary-4);
  padding: 0 ${pxToPcVw(16)} !important;
  height: ${pxToPcVw(56)};
  border-radius: ${pxToPcVw(8)};
  line-height: ${pxToPcVw(24)};
  font-size: ${pxToPcVw(14)};
  gap: ${pxToPcVw(8)};

  &.ant-btn::before {
    // remove antd loading status background overlay
    background: var(--ant-primary-4);
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
    padding: 0 ${pxToMobileVw(16)} !important;
    border: solid ${pxToMobileVw(2)} var(--ant-primary-4);
    height: ${pxToMobileVw(56)};
    border-radius: ${pxToMobileVw(8)};
    line-height: ${pxToMobileVw(24)};
    font-size: ${pxToMobileVw(14)};
    gap: ${pxToMobileVw(8)};
  }
`;

const actionButtonStyle2 = css`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  color: #fff;
  background-color: var(--ant-primary-1);
  font-weight: 600;
  border: solid ${pxToPcVw(2)} var(--ant-primary-4);
  padding: 0 ${pxToPcVw(16)} !important;
  height: ${pxToPcVw(56)};
  border-radius: ${pxToPcVw(8)};
  line-height: ${pxToPcVw(24)};
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
    padding: 0 ${pxToMobileVw(16)} !important;
    border: solid ${pxToMobileVw(2)} var(--ant-primary-4);
    height: ${pxToMobileVw(56)};
    border-radius: ${pxToMobileVw(8)};
    line-height: ${pxToMobileVw(24)};
    font-size: ${pxToMobileVw(14)};
    gap: ${pxToMobileVw(8)};
  }
`;

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

const assetImageWrapper = css`
  margin-top: ${pxToPcVw(64)};

  @media (max-width: 1024px) {
    margin-top: ${pxToMobileVw(64)};
  }
`;

const responsiveImage = css`
  @media (max-width: 1024px) {
    width: 100%;
    height: auto;
  }
`;

const chainNameEmphasis = css`
  font-weight: 800;
`;
