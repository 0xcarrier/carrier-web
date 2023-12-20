export const errorNeedRetry = new Error('need retry');

export async function runWithErrorRetry<T>(
  callback: (options: { abort: (err?: Error) => void; retryCount: number }) => Promise<T>,
  options?: {
    signal: AbortSignal;
    maxRetry?: number;
    throttleInterval?: number;
    backoffStrategyFactor?: number;
    timeoutError?: Error;
  },
) {
  const { signal, maxRetry = 5, throttleInterval = 3 * 1000, backoffStrategyFactor, timeoutError } = options || {};
  let retryCount = 0;
  let needToRun = true;
  let abort = false;
  let abortError: Error | undefined = undefined;

  function abortListener() {
    abort = true;

    signal?.removeEventListener('abort', abortListener);
  }

  signal?.addEventListener('abort', abortListener);

  while (needToRun && !abort) {
    needToRun = false;

    try {
      const result = await callback({
        retryCount,
        abort: (err) => {
          abort = true;
          abortError = err;
        },
      });

      return result;
    } catch (e) {
      if (e === errorNeedRetry && retryCount < maxRetry && !abort) {
        retryCount += 1;
        needToRun = true;

        await new Promise<void>((resolve) => {
          setTimeout(() => {
            resolve();
          }, throttleInterval * (backoffStrategyFactor ? retryCount * backoffStrategyFactor : 1));
        });

        continue;
      } else {
        throw e;
      }
    }
  }

  throw timeoutError || new Error('runWithErrorRetry no result');
}

export function setTimer(
  callback: () => void | Promise<void>,
  throttleInterval: number,
  backoffStrategyFactor?: number,
) {
  let retryCount = 0;
  let timer: any;

  function setTimer() {
    timer = setTimeout(() => {
      callback();

      retryCount += 1;

      setTimer();
    }, throttleInterval * (backoffStrategyFactor ? retryCount * backoffStrategyFactor : 1));
  }

  setTimer();

  return () => {
    clearTimeout(timer);
  };
}
