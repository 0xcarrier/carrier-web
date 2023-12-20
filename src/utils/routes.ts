import { CarrierChainId } from './consts';

export interface ProgressParams {
  chainId: CarrierChainId;
  txHash: string;
}

export interface ProgressQuery {
  enableManualRedemption?: boolean;
  isUsingRelayer?: boolean;
}

export const routes = {
  tokenBridge: {
    getRoute() {
      return '/';
    },
    getPath() {
      return '/';
    },
  },
  nftBridge: {
    getRoute() {
      return '/nft-bridge';
    },
    getPath() {
      return '/nft-bridge';
    },
  },
  allTransactions: {
    getRoute() {
      return '/all-transactions';
    },
    getPath() {
      return '/all-transactions';
    },
  },
  syncTransaction: {
    getRoute() {
      return '/sync-transaction';
    },
    getPath() {
      return '/sync-transaction';
    },
  },
  wallets: {
    getRoute() {
      return '/wallets/:chainId/:walletAddress';
    },
    getPath(chainId: CarrierChainId, walletAddress: string) {
      return generatePath(this.getRoute(), { params: { chainId, walletAddress } });
    },
  },
  transactionDetail: {
    getRoute() {
      return '/tx/:txHash';
    },
    getPath(txHash: string) {
      return generatePath(this.getRoute(), { params: { txHash } });
    },
  },
  swap: {
    getRoute() {
      return '/swap';
    },
    getPath() {
      return '/swap';
    },
  },
  recovery: {
    getRoute() {
      return '/recovery';
    },
    getPath() {
      return '/recovery';
    },
  },
  progress: {
    getRoute() {
      return '/progress/:chainId/:txHash';
    },
    getPath(params: ProgressParams, queries?: ProgressQuery) {
      return generatePath(this.getRoute(), { params, queries });
    },
  },
  cooNft: {
    getRoute() {
      return '/coo-nft';
    },
    getPath() {
      return '/coo-nft';
    },
  },
};

function replacePathParameters(path: string, parameters: any) {
  let result = path;

  Object.keys(parameters).forEach((key) => {
    result = result.replace(`:${key}`, `${parameters[key]}`);
  });

  return result;
}

function replaceQueryString(queries: any) {
  const search = new URLSearchParams(queries);
  const searchString = search.toString();

  return searchString ? `?${searchString}` : '';
}

function generatePath(route: string, options?: { params?: any; queries?: any }) {
  const { params = {}, queries = {} } = options || {};

  const path = replacePathParameters(route, params);
  const search = replaceQueryString(queries);

  return `${path}${search}`;
}
