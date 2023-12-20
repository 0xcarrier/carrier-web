import { DependencyList } from 'react';
import { fetchTokenPrices as fetchTokenPricesData } from '../utils/tokenPrices';
import { useData } from './useData';

export function useTokenPriceData(shouldRun: boolean, dependencies: DependencyList) {
  return useData(async () => {
    console.log('useTokenPriceData', shouldRun, dependencies);

    if (shouldRun) {
      const data = await fetchTokenPricesData();

      console.log('useTokenPriceData result', data);

      return data;
    }
  }, dependencies.concat([shouldRun]));
}
