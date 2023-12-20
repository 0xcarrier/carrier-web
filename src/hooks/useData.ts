import React, { useState, useEffect, DependencyList, useCallback, useMemo } from 'react';

export function getPendingPromise(signal: AbortSignal) {
  // if some data dependencies is loading, then we return a promise
  // if those dependencies are loaded, then the promise will reject
  // and the old data hook will stop, and then new data hook will start

  return new Promise<undefined>((resolve, reject) => {
    function abortListener() {
      resolve(undefined);

      signal.removeEventListener('abort', abortListener);
    }

    signal.addEventListener('abort', abortListener);
  });
}

async function loadData<T>(options: {
  retryTimes: number;
  signal: AbortSignal;
  loader: (signal: AbortSignal, retry: () => void, retryTimes: number) => Promise<T>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<Error | undefined>>;
  setData: React.Dispatch<React.SetStateAction<T | undefined>>;
  retry: () => void;
}): Promise<T> {
  const { signal, loader, setLoading, setError, setData, retry, retryTimes } = options;

  if (!signal.aborted) {
    setLoading(true);
    setError(undefined);
  }

  try {
    const data = await loader(signal, retry, retryTimes);

    if (!signal.aborted) {
      setData(data);
    }

    return data;
  } catch (e) {
    if (!signal.aborted) {
      setError(e as Error);
    }

    throw e;
  } finally {
    if (!signal.aborted) {
      setLoading(false);
    }
  }
}

export interface DataResult<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
  setData: React.Dispatch<React.SetStateAction<T | undefined>>;
  retry: () => void;
  retryTimes: number;
  resetRetryTimes: () => void;
}

export function useData<T>(
  loader: (signal: AbortSignal, retry: () => void, retryTimes: number) => Promise<T>,
  dependencies?: DependencyList,
  options?: {
    cleanup?: () => void;
    refreshInterval: number;
  },
): DataResult<T> {
  const { cleanup, refreshInterval } = options || {};
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [data, setData] = useState<T | undefined>(undefined);
  const [retryTimes, setRetryTimes] = useState(0);

  const retry = useCallback(() => {
    setRetryTimes(retryTimes + 1);
  }, [retryTimes, setRetryTimes]);

  const resetRetryTimes = useCallback(() => {
    setRetryTimes(0);
  }, [setRetryTimes]);

  useEffect(() => {
    const abortController = new AbortController();

    loadData<T>({ signal: abortController.signal, retryTimes, loader, setLoading, setError, setData, retry });

    return () => {
      abortController.abort();

      if (cleanup) {
        cleanup();
      }
    };
  }, (dependencies || []).concat([retryTimes, retry]));

  useEffect(() => {
    if (refreshInterval) {
      setTimeout(() => {
        retry();
      }, refreshInterval);
    }
  }, [refreshInterval, retry]);

  return useMemo(() => {
    return { data, error, loading, setData, retry, retryTimes, resetRetryTimes };
  }, [data, error, loading, setData, retry, retryTimes, resetRetryTimes]);
}
