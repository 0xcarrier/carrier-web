import { getSignedVAAHash, parseVaa } from '@certusone/wormhole-sdk';
import useSWR from 'swr';
import { cooNFTMintParams, TXN_INDEXER, TXN_STATUS } from '../../../utils/consts';
import { CarrierTxnObject } from '../../../utils/transaction-indexer';
import { bufferEndTime, NO_NFT_TOKEN_ID } from '../cooHelper';
import { CooContractData } from './useFetchCooContract';
import axios from 'axios';
import { getLastCheckedFromLocal, saveSkippedTxnsToLocal } from '../cooCache';

/**
 * computes the vaa timestamp in milliseconds
 * @param txn
 * @returns
 */
const getVaaTimestamp = (txn: CarrierTxnObject): number => {
  let timestamp = 0;
  if (txn && txn.signedVAABytes) {
    const decodedVaa = parseVaa(Buffer.from(txn.signedVAABytes, 'base64'));
    return decodedVaa.timestamp * 1000; // ms
  }
  return timestamp;
};

/**
 * check if the txn can be considered for envelope
 * a transaction is considered if it is redeemed and the vaa timestamp is within the start and end time
 * a transaction that is still pending or confirmed would be added to a skip list if that it is within the contract start time and end time with some buffered time in case the indexer fails to index some transaction
 * @param txnObj
 * @param startTime contract start time
 * @param endTime contract end time
 * @returns true if transaction is valid, false otherwise
 */
const isValidTxnForEnvelope = (txnObj: CarrierTxnObject | null, startTime: number, endTime: number) => {
  if (txnObj) {
    // in case indexer fails to index some transactions and need to manually index; the created time from the indexer is the date of indexing and not transaction date
    let hardEndTime = endTime + bufferEndTime;

    if (txnObj.status === TXN_STATUS.REDEEMED) {
      const vaaTimestamp = getVaaTimestamp(txnObj);
      if (vaaTimestamp >= startTime && vaaTimestamp < endTime) {
        return true;
      }
    } else if (txnObj.status === TXN_STATUS.PENDING || txnObj.status === TXN_STATUS.CONFIRMED) {
      // this txn would be added to a skip list later
      const txnTimestamp = new Date(txnObj.created).getTime();
      if (txnTimestamp >= startTime && txnTimestamp < hardEndTime) {
        return true;
      }
    }
  }
  return false;
};

export interface EligibleTxnsData {
  eligibleTxns: CarrierTxnObject[];
}

/**
 * check if the wallet address has bridge transactions
 * to have a chance to open the envelopes
 * @param key
 * @param startTime
 * @param endTime
 * @param walletAddress
 * @returns
 */
const fetchValidVaas = async (
  key: string,
  startTime: number,
  endTime: number,
  mintedTokenId: number,
  walletAddress: string,
) => {
  let eligibleTxns: CarrierTxnObject[] = [];
  let pageIndex = 0;
  let limit = 20;

  try {
    if (!walletAddress) {
      throw new Error('fetch transactions: no wallet address connected');
    }

    // if (!hasEventStarted(startTime)) {
    //   throw new Error('event has not started');
    // }

    const lastCheckedData = getLastCheckedFromLocal(walletAddress);
    let shouldFetchMore = true;
    let luckyVaaHash = lastCheckedData ? lastCheckedData.luckyVaaHash : '';
    let lastOpenedEnvelopeTimestamp = lastCheckedData ? Number(lastCheckedData.lastOpened) : startTime;
    let skippedTxnsList: string[] = lastCheckedData ? lastCheckedData.skippedTxns : [];
    let newSkippedTxns: string[] = [];

    while (shouldFetchMore) {
      let indexerAPI = `${TXN_INDEXER}/api/v1/transactions?limit=${limit}&recipient=${walletAddress}&type=nft,token&page=${pageIndex}`;
      const res = await axios.get(indexerAPI);
      console.log('transactions user: ', res);

      if (!res.data.results.transactions || res.data.results.transactions.length === 0) {
        shouldFetchMore = false;
        break;
      }

      let txns: CarrierTxnObject[] = res.data.results.transactions;
      let topTxnInStack = txns.length > 0 ? txns[0] : null;
      let lastTxnInStack = txns.length > 0 ? txns[txns.length - 1] : null;
      let isValidTxnStack =
        isValidTxnForEnvelope(topTxnInStack, startTime, endTime) ||
        isValidTxnForEnvelope(lastTxnInStack, startTime, endTime);

      // because transactions returned from the indexer is latest to oldest
      // only interested in transactions that are before the minting end time
      // if the last transaction in the stack is less than endtime implies all txns in this batch (except for the first batch) is within contract time
      // otherwise wait for the next iteration to fetch the older transactions
      if (isValidTxnStack) {
        for (const txnObj of txns) {
          if (txnObj.destChainId !== cooNFTMintParams.chainId) {
            // we only want to give the chance to open envelope to those who bridge to a designated destination chain
            continue;
          }

          if (txnObj.status === TXN_STATUS.REDEEMED) {
            if (txnObj.signedVAABytes && txnObj.signedVAAHash) {
              const vaaBuffer = Buffer.from(txnObj.signedVAABytes, 'base64');
              const decodedVaa = parseVaa(vaaBuffer);
              const vaaTimestamp = decodedVaa.timestamp * 1000; // ms
              const vaaHash = getSignedVAAHash(vaaBuffer);

              if (
                vaaTimestamp >= startTime &&
                vaaTimestamp < endTime &&
                vaaHash === luckyVaaHash &&
                mintedTokenId === NO_NFT_TOKEN_ID
              ) {
                // if the user is eligible to mint after opening the envelope but closed the modal
                // we want to be able fetch the transaction again to let the user mint
                // if the user has minted already, then it won't come to this stage but instead show the View NFT screen
                eligibleTxns.push(txnObj);
                shouldFetchMore = false;
                break;
              } else if (vaaTimestamp >= startTime && vaaTimestamp < endTime) {
                let isExistedInSkipList = skippedTxnsList.includes(txnObj.txn);

                if (vaaTimestamp > lastOpenedEnvelopeTimestamp || isExistedInSkipList) {
                  // txn is consider eligible to open if is is more than the previous last opened time stamp or
                  // the transaction was previously not redeemed
                  eligibleTxns.push(txnObj);
                }
              } else if (vaaTimestamp < startTime) {
                // this check must be put last because we want to let users get the channce to open envelope to mint if they previously close the modal
                // cannot put vaaTimestamp <= endTime check here but we use a cut off end time to prevent us from querying through too much transactions
                // else it would not traverse the bottom transactions as transactions is sorted from latest date
                shouldFetchMore = false;
                break;
              }
            }
          } else if (
            (txnObj.status === TXN_STATUS.CONFIRMED || txnObj.status === TXN_STATUS.PENDING) &&
            new Date(txnObj.created).getTime() >= startTime
          ) {
            // record the pending and confirmed transactions so that we can check again when it turns redeemed later
            newSkippedTxns.push(txnObj.txn);
          }
        }
      }

      if (pageIndex + 1 < parseInt(res.data.results.page)) {
        // real page number vs page number from indexer
        // fetch more transactions from other pages
        pageIndex += 1;
      } else {
        // reached end of page
        shouldFetchMore = false;
      }
    }

    // update skipped txns
    const finalSkippedTxns = Array.from(new Set(skippedTxnsList.concat(newSkippedTxns)));
    if (skippedTxnsList.length !== finalSkippedTxns.length) {
      // only update if there are new items
      saveSkippedTxnsToLocal(walletAddress, finalSkippedTxns);
    }
  } catch (e) {
    console.error(e);
  }

  // reverse the vaa bytes list so that the first vaa is always the earliest one
  // so that the vaa check when user opens the envelope is always from the earliest transaction to the latest one
  // as the vaa check may skip the remaining
  // in case we allow more than one nft per address
  return {
    eligibleTxns: eligibleTxns.reverse(),
  } as EligibleTxnsData;
};

export function useFetchEligibleTxns(cooContractData: CooContractData | undefined, walletAddress: string | undefined) {
  const { data, error, isValidating, mutate } = useSWR(
    cooContractData && walletAddress
      ? [
          'fetch_valid_vaas',
          cooContractData?.startMintTime,
          cooContractData?.endMintTime,
          cooContractData?.mintedTokenId,
          walletAddress,
        ]
      : null,
    fetchValidVaas,
    {
      revalidateOnFocus: false,
    },
  );

  return {
    txnsData: data,
    isLoading: !data,
    error,
    isValidating,
    mutate,
  };
}
