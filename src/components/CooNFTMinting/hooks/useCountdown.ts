import { useEffect, useState } from 'react';

export const useCountdown = (endTime: number | undefined) => {
  const currentTime = Date.now();
  const [targetTime, setTargetTime] = useState(endTime);
  const [countDown, setCountDown] = useState((targetTime ? targetTime : 0) - currentTime);

  useEffect(() => {
    if (endTime) {
      setTargetTime(endTime);
      setCountDown(endTime - Date.now());
    }
  }, [endTime]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (countDown > 0) {
        setCountDown(countDown - 1000);
      } else {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [countDown]);

  return getReturnValues(countDown);
};

const getReturnValues = (countDown: number) => {
  // countdown is in milliseconds

  // const hours = Math.floor(countDown / (1000 * 60 * 60));
  // const minutes = Math.floor((countDown % (1000 * 60 * 60)) / (1000 * 60));
  // const seconds = Math.floor((countDown % (1000 * 60)) / 1000);

  let seconds = Math.floor(countDown / 1000);
  let minutes = Math.floor(seconds / 60);
  let hours = Math.floor(minutes / 60);

  seconds = seconds % 60;
  minutes = minutes % 60;

  return {
    hours,
    minutes,
    seconds,
  };
};
