import { useMemo, useState } from 'react';

export const defaultSlippageTolerances = [0.005, 0.01, 0.015, 0.02];
const defaultSlippageTolerance = 0.02;
const slippageToleranceKey = 'slippageTolerance';

function getSlippageToleranceCache() {
  const cache = localStorage.getItem(slippageToleranceKey);
  const cacheParsed = cache ? parseFloat(cache) : undefined;

  return cacheParsed && !isNaN(cacheParsed) ? cacheParsed : defaultSlippageTolerance;
}

function setSlippageToleranceCache(value: number) {
  localStorage.setItem(slippageToleranceKey, `${value}`);
}

export interface SlippageToleranceData {
  slippageTolerance: number;
  setSlippageTolerance: (value: number) => void;
}

export function useSlippageTolerance() {
  const [slippageTolerance, setSlippageTolerance] = useState(getSlippageToleranceCache());

  return useMemo(() => {
    return {
      slippageTolerance,
      setSlippageTolerance: (value: number) => {
        setSlippageTolerance(value);
        setSlippageToleranceCache(value);
      },
    };
  }, [slippageTolerance, setSlippageTolerance]);
}
