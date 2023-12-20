import { Configuration, DefaultApi } from '../../indexer-client';
import { TXN_INDEXER } from '../consts';
import { generateMiddleware, getApiBasePath, handleApiError, http } from './util';

const config = new Configuration({
  basePath: getApiBasePath(TXN_INDEXER),
  fetchApi: http,
  middleware: [
    {
      post: generateMiddleware({
        autoMessageHandler: handleApiError,
      }),
    },
  ],
});

const configWithoutMiddlewares = new Configuration({
  basePath: getApiBasePath(TXN_INDEXER),
  fetchApi: http,
});

export const api = {
  indexer: new DefaultApi(config),
};

export const apiWithoutMiddlewares = {
  account: new DefaultApi(configWithoutMiddlewares),
};
