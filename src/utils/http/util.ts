import { errorMessages, ApiErrorCode } from './errors';
import { notification, Modal } from 'antd';

export async function http(input: RequestInfo, init?: RequestInit): Promise<Response> {
  try {
    const resp = await fetch(input, init);
    const status = resp.status;

    if (status < 200 && status >= 400) {
      throw resp;
    }

    return resp;
  } finally {
  }
}

export type FetchAPI = WindowOrWorkerGlobalScope['fetch'];

export interface ResponseContext {
  fetch: FetchAPI;
  url: RequestInfo | URL;
  init: RequestInit;
  response: Response;
}

export function generateMiddleware(options: {
  autoMessageHandler?: (message: string, code: ApiErrorCode, context: ResponseContext) => void;
  commonHandler?: (code: ApiErrorCode, context: ResponseContext) => void;
}) {
  const { autoMessageHandler, commonHandler } = options;

  return async function (context: ResponseContext): Promise<Response> {
    const { code, message } = await parseApiError(context.response);

    if (code < 200 || code >= 400) {
      if (autoMessageHandler != null) {
        autoMessageHandler(message != null && message !== '' ? message : errorMessages[code], code, context);
      }

      if (commonHandler != null) {
        commonHandler(code, context);
      }
    }

    return context.response;
  };
}

// can remove this when https://github.com/OpenAPITools/openapi-generator/issues/5282 done
export function getApiBasePath(apiBasePath?: string) {
  return apiBasePath == null || apiBasePath === '' ? `${location.protocol}//${location.host}` : apiBasePath;
}

export async function parseApiError(resp: Response) {
  let body;

  try {
    body = await resp.clone().json();
  } catch (e) {
    // do not throw error when body parsing failed
  }

  const code = (body && body.code) || (resp && resp.status) || 0;
  const message = body && (body.message || body.msg);

  return { code, message };
}

export function handleApiError(message: string, code: ApiErrorCode, context: ResponseContext) {
  if (code === ApiErrorCode.Unauthorized) {
    return;
  }

  notification.error({ message });
}
