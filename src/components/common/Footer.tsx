import React from 'react';

import { css, cx } from '@linaria/core';

import footerBgDesktop from '../../assets/footer-bg-desktop.png';
import footerBgMobile from '../../assets/footer-bg-mobile.png';
import discordLogo from '../../assets/icons/Discord.svg';
import twitterLogo from '../../assets/icons/Twitter.svg';
import carrierLogo from '../../assets/svgs/carrier-logo.svg';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { SVGIcon } from './SVGIcon';
import { useNavigate } from 'react-router-dom';
import { routes } from '../../utils/routes';
import { Cluster, getCluster, isClusterStored, setCluster } from '../../utils/env';

let versionClickCounter = 0;
const envs = ['mainnet', 'testnet'];
const cluster = getCluster();
const needToShowEnv = isClusterStored();
let counterTimer: any;

export const Footer = () => {
  const navigate = useNavigate();

  return (
    <div className={footerWrapper}>
      <div className={innerWrapper}>
        <div className={footerItem}>
          <div className={footerTitleImage}>
            <img className={carrierLogoImage} src={carrierLogo} alt="Carrier logo" />
            {process.env.CARRIER_VERSION ? (
              <div
                className={styleVersion}
                onClick={() => {
                  if (process.env.ENABLE_ENV_SELECTOR === 'true') {
                    clearTimeout(counterTimer);

                    versionClickCounter += 1;

                    counterTimer = setTimeout(() => {
                      versionClickCounter = 0;
                    }, 1000);

                    if (versionClickCounter === 6) {
                      const nextIndex = envs.findIndex((env) => env === cluster) + 1;

                      setCluster(envs[nextIndex > envs.length - 1 ? 0 : nextIndex] as Cluster);

                      window.location.reload();
                    }
                  }
                }}>
                {process.env.CARRIER_VERSION}
                {process.env.ENABLE_ENV_SELECTOR === 'true' && needToShowEnv ? `(${cluster})` : null}
              </div>
            ) : null}
          </div>
          <ul className={quickLinksList}>
            <li>
              <div className={listItem}>
                <span className={copyWrapperText}>Built by Automata</span>
                <a href="https://ata.network" target="_blank" rel="noopener noreferrer">
                  <SVGIcon className={externalLinkIcon} iconName="external-link" />
                </a>
              </div>
            </li>
            <li>
              <div className={listItem}>
                <span className={copyWrapperText}>Protected by 1RPC</span>
                <a href="https://1rpc.io" target="_blank" rel="noopener noreferrer">
                  <SVGIcon className={externalLinkIcon} iconName="external-link" />
                </a>
              </div>
            </li>
            <li>
              <div className={listItem}>
                <span className={copyWrapperText}>Powered by Wormhole</span>
                <a href="https://wormhole.com" target="_blank" rel="noopener noreferrer">
                  <SVGIcon className={externalLinkIcon} iconName="external-link" />
                </a>
              </div>
            </li>
          </ul>
        </div>

        <div className={cx(footerItem, styleRightColumn)}>
          <div className={footerTitleImageList}>
            <div className={socialLinkLogoWrapper}>
              <a href="https://twitter.com/0xcarrier" target="_blank" rel="noopener noreferrer">
                <img className={socialLinkLogo} src={twitterLogo} alt="Twitter logo" />
              </a>
            </div>
            <div className={socialLinkLogoWrapper}>
              <a href="https://ata.ws/discord" target="_blank" rel="noopener noreferrer">
                <img className={socialLinkLogo} src={discordLogo} alt="Discord logo" />
              </a>
            </div>
          </div>
          <ul className={cx(quickLinksList, styleRightColumnLinksList)}>
            <li>
              <a
                href="https://medium.com/atanetwork/meet-carrier-a-powerful-token-and-nft-bridge-for-web3-natives-b86e416fdce3"
                target="_blank"
                rel="noopener noreferrer">
                About
              </a>
            </li>
            <li>
              <a href="https://docs.carrier.so/" target="_blank" rel="noopener noreferrer">
                Docs
              </a>
            </li>
            <li>
              <a href="https://ata.ws/discord" target="_blank" rel="noopener noreferrer">
                Submit a ticket
              </a>
            </li>
            <li>
              <a
                onClick={() => {
                  navigate(routes['recovery'].getPath());
                }}>
                Recovery
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

const footerItem = css``;

const footerTitleImage = css`
  margin-bottom: ${pxToPcVw(33)};

  @media (max-width: 1024px) {
    margin-bottom: ${pxToMobileVw(20)};
  }
`;

const footerTitleImageList = css`
  display: inline-flex;
  align-items: center;
  gap: ${pxToPcVw(16)};
  margin-bottom: ${pxToPcVw(22)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(24)};
    margin-bottom: ${pxToMobileVw(0)};
  }
`;

const footerWrapper = css`
  background: url(${footerBgDesktop}) top center / cover no-repeat;
  margin-top: ${pxToPcVw(-106)};
  padding: ${pxToPcVw(106)} ${pxToPcVw(16)} ${pxToPcVw(26)};

  @media (max-width: 1024px) {
    background: url(${footerBgMobile}) top center / cover no-repeat;
    margin-top: ${pxToMobileVw(-106)};
    padding: ${pxToMobileVw(106)} ${pxToMobileVw(16)} ${pxToMobileVw(26)};
  }
`;

const listItem = css`
  display: flex;
  align-items: center;
`;

const innerWrapper = css`
  max-width: ${pxToPcVw(1024)};
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  gap: ${pxToPcVw(64)};
  margin-inline: auto;

  @media (max-width: 1024px) {
    width: 100%;
    max-width: none;
    flex-direction: column;
    gap: ${pxToMobileVw(24)};
  }
`;

const carrierLogoImage = css`
  width: ${pxToPcVw(99)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(99)};
  }
`;

const copyWrapperText = css`
  margin-right: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    margin-right: ${pxToMobileVw(8)};
  }
`;

const externalLinkIcon = css`
  width: ${pxToPcVw(20)};
  height: ${pxToPcVw(20)};
  fill: var(--color-text);

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(16)};
    height: ${pxToMobileVw(16)};
  }
`;

const socialLinkLogo = css`
  width: ${pxToPcVw(24)};
  height: ${pxToPcVw(20)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(24)};
    height: ${pxToMobileVw(20)};
  }
`;

const socialLinkLogoWrapper = css`
  width: ${pxToPcVw(24)};
  height: ${pxToPcVw(20)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(24)};
    height: ${pxToMobileVw(20)};
  }
`;

const quickLinksList = css`
  display: flex;
  flex-direction: column;
  gap: ${pxToPcVw(16)};
  list-style: none;
  margin: 0;
  padding: 0;

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(16)};
    padding-top: ${pxToMobileVw(11)};
  }

  > li {
    font-weight: 500;
    font-size: ${pxToPcVw(16)};
    line-height: 1.25;
    color: var(--color-text-3);

    @media (max-width: 1024px) {
      font-size: ${pxToMobileVw(16)};
    }

    > a {
      color: currentColor;
      line-height: inherit;

      &:hover {
        text-decoration: underline;
      }
    }
  }
`;

const styleVersion = css`
  line-height: 1.1em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
  color: var(--color-text-3);
  opacity: 0.5;
  font-size: ${pxToPcVw(14)};
  margin-top: ${pxToPcVw(10)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(14)};
    margin-top: ${pxToMobileVw(10)};
  }
`;

const styleRightColumn = css`
  @media (max-width: 1024px) {
    display: flex;
    gap: ${pxToMobileVw(32)};
    align-items: flex-start;
  }
`;

const styleRightColumnLinksList = css`
  @media (max-width: 1024px) {
    display: grid;
    grid-template-rows: repeat(2, 1fr);
    grid-gap: ${pxToMobileVw(24)};
    grid-auto-flow: column;
    white-space: nowrap;
    padding-top: 0;
  }
`;
