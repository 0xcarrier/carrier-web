import React, { memo, useEffect, useMemo, useState } from 'react';

import { css } from '@linaria/core';
import { intervalToDuration } from 'date-fns';
import { padStart } from 'lodash';

import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { Spinner } from '../common/Spinner';

type Props = {
  shouldCancelTimer: boolean;
  startTime?: number;
};

export const ElapsedTime = memo(({ shouldCancelTimer, startTime }: Props) => {
  const [currentTime, setCurrentTime] = useState<number>();

  const duration = useMemo(() => {
    if (!startTime) {
      return;
    }

    const durationObj = intervalToDuration({
      start: startTime,
      end: currentTime || startTime,
    });

    if (Object.values(durationObj).every((item) => item === 0)) {
      return;
    }

    const { years, months, days, hours, minutes, seconds } = durationObj;

    if (!years && !months && !days) {
      return (
        `${hours && hours > 0 ? `${hours}:` : ''}` +
        `${padStart(`${minutes || 0}`, 2, '0')}:` +
        `${padStart(`${seconds || 0}`, 2, '0')}`
      );
    }

    if (!years && !months && days) {
      return (
        `${days === 1 ? `${days} day` : `${days} days`} and ` +
        `${hours || 0}:` +
        `${padStart(`${minutes || 0}`, 2, '0')}min`
      );
    }

    if (!years && months) {
      return (
        `${months === 1 ? `${months} month` : `${months} months`}` +
        `${
          days
            ? ` and ${days === 1 ? `${days} day` : `${days} days`}`
            : hours
            ? ` and ${hours === 1 ? `${hours} hour` : `${hours} hours`}`
            : ''
        }`
      );
    }

    if (years) {
      return years === 1 ? `more than a year` : `more than ${years} years`;
    }
  }, [currentTime, startTime]);

  useEffect(() => {
    let cancelled = false;

    const updateElapsedTimeInterval = setInterval(() => {
      if (shouldCancelTimer && duration) {
        clearInterval(updateElapsedTimeInterval);
        return;
      }

      if (!cancelled) {
        setCurrentTime(new Date().getTime());
      }
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(updateElapsedTimeInterval);
    };
  }, [shouldCancelTimer, duration]);

  return (
    <span className={elapsedTime.wrapper}>
      Time elapsed: {duration ? <strong>{duration}</strong> : <Spinner className={elapsedTime.spinner} />}
    </span>
  );
});

const elapsedTime = {
  wrapper: css`
    display: inline-flex;
    align-items: center;
    gap: ${pxToPcVw(6)};

    @media (max-width: 1024px) {
      gap: ${pxToMobileVw(6)};
    }
  `,
  spinner: css`
    width: ${pxToPcVw(14)};
    height: ${pxToPcVw(14)};

    @media (max-width: 1024px) {
      width: ${pxToMobileVw(14)};
      height: ${pxToMobileVw(14)};
    }
  `,
};
