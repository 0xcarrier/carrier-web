import React from 'react';
import { css, cx } from '@linaria/core';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';

interface Props {
  days?: number;
  hours: number;
  minutes: number;
  seconds: number;
  className?: string;
}

export const CountDownTimerDisplay = (props: Props) => {
  const { days, hours, minutes, seconds, className } = props;

  return (
    <div className={cx(className, timerWrapper)}>
      <div className={timeDisplayContainer}>
        <div className={timeValue}>{hours <= 0 ? 0 : hours}</div>
        <div className={timeDesc}>HOURS</div>
      </div>
      <div className={timeDisplayContainer}>
        <div className={timeValue}>{minutes <= 0 ? 0 : minutes}</div>
        <div className={timeDesc}>MINUTES</div>
      </div>
      <div className={timeDisplayContainer}>
        <div className={timeValue}>{seconds <= 0 ? 0 : seconds}</div>
        <div className={timeDesc}>SECONDS</div>
      </div>
    </div>
  );
};

const timerWrapper = css`
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  gap: ${pxToPcVw(30)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(30)};
  }
`;

const timeDisplayContainer = css`
  display: flex;
  flex-direction: column;
  text-align: center;
  text-shadow: 0 0 ${pxToPcVw(20)} #48c8ff;

  @media (max-width: 1024px) {
    text-shadow: 0 0 ${pxToMobileVw(20)} #48c8ff;
  }
`;

const timeValue = css`
  font-weight: 800;
  font-size: ${pxToPcVw(30)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(30)};
  }
`;

const timeDesc = css`
  font-weight: 800;
  font-size: ${pxToPcVw(12)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(12)};
  }
`;
