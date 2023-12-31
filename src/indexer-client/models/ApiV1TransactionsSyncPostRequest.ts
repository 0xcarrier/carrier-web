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

import { exists, mapValues } from '../runtime';
/**
 * 
 * @export
 * @interface ApiV1TransactionsSyncPostRequest
 */
export interface ApiV1TransactionsSyncPostRequest {
    /**
     * 
     * @type {number}
     * @memberof ApiV1TransactionsSyncPostRequest
     */
    type: number;
    /**
     * 
     * @type {number}
     * @memberof ApiV1TransactionsSyncPostRequest
     */
    chainId: number;
    /**
     * 
     * @type {string}
     * @memberof ApiV1TransactionsSyncPostRequest
     */
    hash: string;
}

/**
 * Check if a given object implements the ApiV1TransactionsSyncPostRequest interface.
 */
export function instanceOfApiV1TransactionsSyncPostRequest(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "type" in value;
    isInstance = isInstance && "chainId" in value;
    isInstance = isInstance && "hash" in value;

    return isInstance;
}

export function ApiV1TransactionsSyncPostRequestFromJSON(json: any): ApiV1TransactionsSyncPostRequest {
    return ApiV1TransactionsSyncPostRequestFromJSONTyped(json, false);
}

export function ApiV1TransactionsSyncPostRequestFromJSONTyped(json: any, ignoreDiscriminator: boolean): ApiV1TransactionsSyncPostRequest {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'type': json['type'],
        'chainId': json['chainId'],
        'hash': json['hash'],
    };
}

export function ApiV1TransactionsSyncPostRequestToJSON(value?: ApiV1TransactionsSyncPostRequest | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'type': value.type,
        'chainId': value.chainId,
        'hash': value.hash,
    };
}

