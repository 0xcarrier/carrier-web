import React from 'react';

import { css } from '@linaria/core';
import { Progress } from 'antd';

import PNGPidgeon from '../../assets/pngs/progress-pidgeon.png';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';

type Props = {
  percent: number;
};

/**
 * spinner with robot bird
 */
export const CarrierLoader = ({ percent }: Props) => {
  return (
    <div className={styleLoader}>
      <Progress
        className={styleProgress}
        percent={percent}
        showInfo={false}
        strokeColor="var(--ant-primary-4)"
        strokeWidth={5}
        trailColor="var(--ant-primary-color)"
        type="circle"
      />
      <img className={bird} src={PNGPidgeon} alt="" />
    </div>
  );
};

const styleLoader = css`
  position: relative;
  width: ${pxToPcVw(224)};
  height: ${pxToPcVw(224)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(140)};
    height: ${pxToMobileVw(140)};
  }
`;

const styleProgress = css`
  position: relative;
  z-index: 2;

  .ant-progress-inner {
    width: ${pxToPcVw(224)} !important;
    height: ${pxToPcVw(224)} !important;
  }

  @media (max-width: 1024px) {
    .ant-progress-inner {
      width: ${pxToMobileVw(140)} !important;
      height: ${pxToMobileVw(140)} !important;
    }
  }
`;

const bird = css`
  border-radius: 50%;
  overflow: hidden;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: ${pxToPcVw(222)};
  height: ${pxToPcVw(222)};
  object-fit: contain;
  z-index: 1;

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(83)};
    height: ${pxToMobileVw(83)};
  }
`;
