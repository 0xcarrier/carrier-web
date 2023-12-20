import { Algodv2 } from 'algosdk';
import { ALGO_DECIMALS } from '../consts';

export type AlgoMetadata = {
  symbol?: string;
  tokenName?: string;
  decimals: number;
};

export const fetchSingleMetadata = async (address: string, algodClient: Algodv2): Promise<AlgoMetadata> => {
  const assetId = parseInt(address);
  if (assetId === 0) {
    return {
      tokenName: 'Algo',
      symbol: 'ALGO',
      decimals: ALGO_DECIMALS,
    };
  }
  const assetInfo = await algodClient.getAssetByID(assetId).do();
  return {
    tokenName: assetInfo.params.name,
    symbol: assetInfo.params['unit-name'],
    decimals: assetInfo.params.decimals,
  };
};
