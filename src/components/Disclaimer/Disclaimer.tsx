import React, { useEffect } from 'react';
import { SVGIcon } from '../common/SVGIcon';
import { css } from '@linaria/core';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { notification } from 'antd';

export const Disclaimer: React.FC = () => {
  useEffect(() => {
    const hideDisclaimer = localStorage.getItem('hideDisclaimer');

    if (!hideDisclaimer) {
      notification.info({
        placement: 'bottomRight',
        bottom: 8,
        icon: <SVGIcon className={styleDisclaimerIcon} iconName="bird" />,
        duration: 0,
        message: (
          <div className={styleDisclaimerContainer}>
            <div>By using this website, you are agreeing to the following declaration.</div>
            <div>
              For more info, read our{' '}
              <a
                className={styleDisclaimerLink}
                href={process.env.DISCLAIMER_LINK}
                target="_blank"
                referrerPolicy="no-referrer">
                Disclaimer
              </a>
            </div>
          </div>
        ),
        onClose: () => {
          localStorage.setItem('hideDisclaimer', '1');
        },
      });
    }
  }, []);

  return null;
};

const styleDisclaimerContainer = css`
  display: flex;
  flex-direction: column;
  line-height: 1.21em;
  color: #fff;
  gap: ${pxToPcVw(8)};
  font-size: ${pxToPcVw(12)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(8)};
    font-size: ${pxToMobileVw(12)};
  }
`;

const styleDisclaimerIcon = css`
  margin-top: ${pxToPcVw(2)};
  width: ${pxToPcVw(17)};
  height: ${pxToPcVw(24)};

  & > * {
    fill: var(--color-text-3);
  }

  @media (max-width: 1024px) {
    margin-top: ${pxToMobileVw(2)};
    width: ${pxToMobileVw(17)};
    height: ${pxToMobileVw(24)};
  }
`;

const styleDisclaimerLink = css`
  font-weight: 500;
`;
