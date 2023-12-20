/* tslint:disable */
/* eslint-disable */
/**
 * Indexer API
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * The version of the OpenAPI document: 1.0.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */


import * as runtime from '../runtime';
import type {
  ApiV1TransactionsSyncPost200Response,
  ApiV1TransactionsSyncPostRequest,
  ApiV1WormholeXswapPost200Response,
  ApiV1WormholeXswapPostRequest,
} from '../models';
import {
    ApiV1TransactionsSyncPost200ResponseFromJSON,
    ApiV1TransactionsSyncPost200ResponseToJSON,
    ApiV1TransactionsSyncPostRequestFromJSON,
    ApiV1TransactionsSyncPostRequestToJSON,
    ApiV1WormholeXswapPost200ResponseFromJSON,
    ApiV1WormholeXswapPost200ResponseToJSON,
    ApiV1WormholeXswapPostRequestFromJSON,
    ApiV1WormholeXswapPostRequestToJSON,
} from '../models';

export interface ApiV1TransactionsSyncPostOperationRequest {
    apiV1TransactionsSyncPostRequest?: ApiV1TransactionsSyncPostRequest;
}

export interface ApiV1WormholeXswapPostOperationRequest {
    apiV1WormholeXswapPostRequest?: ApiV1WormholeXswapPostRequest;
}

/**
 * 
 */
export class DefaultApi extends runtime.BaseAPI {

    /**
     * 
     * Sync transaction manully
     */
    async apiV1TransactionsSyncPostRaw(requestParameters: ApiV1TransactionsSyncPostOperationRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<ApiV1TransactionsSyncPost200Response>> {
        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        const response = await this.request({
            path: `/api/v1/transactions/sync`,
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: ApiV1TransactionsSyncPostRequestToJSON(requestParameters.apiV1TransactionsSyncPostRequest),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => ApiV1TransactionsSyncPost200ResponseFromJSON(jsonValue));
    }

    /**
     * 
     * Sync transaction manully
     */
    async apiV1TransactionsSyncPost(requestParameters: ApiV1TransactionsSyncPostOperationRequest = {}, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ApiV1TransactionsSyncPost200Response> {
        const response = await this.apiV1TransactionsSyncPostRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * srcAmount and dstAmount must have one and only one not-null
     * Cross-chain swap for Wormhole Carrier
     */
    async apiV1WormholeXswapPostRaw(requestParameters: ApiV1WormholeXswapPostOperationRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<ApiV1WormholeXswapPost200Response>> {
        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        const response = await this.request({
            path: `/api/v1/wormhole-xswap`,
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: ApiV1WormholeXswapPostRequestToJSON(requestParameters.apiV1WormholeXswapPostRequest),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => ApiV1WormholeXswapPost200ResponseFromJSON(jsonValue));
    }

    /**
     * srcAmount and dstAmount must have one and only one not-null
     * Cross-chain swap for Wormhole Carrier
     */
    async apiV1WormholeXswapPost(requestParameters: ApiV1WormholeXswapPostOperationRequest = {}, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<ApiV1WormholeXswapPost200Response> {
        const response = await this.apiV1WormholeXswapPostRaw(requestParameters, initOverrides);
        return await response.value();
    }

}
