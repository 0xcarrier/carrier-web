const key = 'cooNFT';

interface CooNFTCacheObject {
  vaaHash: string; // last opened vaa hash
  luckyVaaHash: string; // winning vaa hash
  lastOpened: string; // in ms
  skippedTxns: string[]; // list of txns that were previously not redeemed
}

interface CooNFTCacheData {
  [key: string]: CooNFTCacheObject;
}

/**
 * save the vaa hash and current time stamp
 * local storage is in the form
 *
 * cooNFT: {
 *   address_1: {
 *     vaaHash: '<vaaHash>',
 *     luckyVaaHash: '',
 *     lastOpened: '<timestamp>', // last opened vaa timestamp
 *     skippedTxns: []
 *   },
 *   address_2: {
 *      vaaHash: ...,
 *      luckyVaaHash: ...m
 *      lastOpened: ...,
 *      skippedTxns: []
 *   },
 * }
 */
export const saveLastCheckedToLocal = (wallet: string, vaaHash: string, lastOpened: number) => {
  try {
    if (!wallet) {
      throw new Error('wallet address is empty');
    }

    if (!vaaHash) {
      throw new Error('vaa hash is empty');
    }
    const storageJSON = {
      vaaHash: `${vaaHash}`,
      luckyVaaHash: '',
      lastOpened: `${lastOpened}`,
      skippedTxns: [],
    };

    const existingMapJSON = localStorage.getItem(key);
    const existingMap: CooNFTCacheData = existingMapJSON ? JSON.parse(existingMapJSON) : {};
    let resultJSON = {} as CooNFTCacheData;

    Object.assign(resultJSON, existingMap);

    if (!resultJSON.hasOwnProperty(wallet)) {
      resultJSON[wallet] = storageJSON;
    } else {
      // only update the vaa hash and last opened
      // don't touch the winning vaa hash
      resultJSON[wallet].vaaHash = `${vaaHash}`;
      resultJSON[wallet].lastOpened = `${lastOpened}`;
    }

    localStorage.setItem(key, JSON.stringify(resultJSON));
  } catch (e) {
    console.error('coo - error caching last checked vaa: ', e);
  }
};

/**
 * update the lucky vaa hash in the local storage
 * in the event the user close the browser before the user can mint the nft
 * the user is still able to retrieve the specific transaction with the winning hash
 * @param wallet
 * @param luckyVaaHash
 */
export const saveLuckyVaaHashToLocal = (wallet: string, luckyVaaHash: string) => {
  try {
    if (!wallet) {
      throw new Error('wallet address is empty');
    }

    if (!luckyVaaHash) {
      throw new Error('vaa hash is empty');
    }

    const existingMapJSON = localStorage.getItem(key);
    const existingMap: CooNFTCacheData = existingMapJSON ? JSON.parse(existingMapJSON) : {};
    let resultJSON = {} as CooNFTCacheData;

    Object.assign(resultJSON, existingMap);

    if (!resultJSON.hasOwnProperty(wallet)) {
      const storageJSON = {
        vaaHash: '',
        luckyVaaHash: `${luckyVaaHash}`,
        lastOpened: '',
        skippedTxns: [],
      };

      resultJSON[wallet] = storageJSON;
    } else {
      resultJSON[wallet].luckyVaaHash = `${luckyVaaHash}`;
    }

    localStorage.setItem(key, JSON.stringify(resultJSON));
  } catch (e) {
    console.error('coo - error caching last checked vaa: ', e);
  }
};

export const saveSkippedTxnsToLocal = (wallet: string, newSkippedTxns: string[]) => {
  try {
    if (!wallet) {
      throw new Error('wallet address is empty');
    }

    const existingMapJSON = localStorage.getItem(key);
    const existingMap: CooNFTCacheData = existingMapJSON ? JSON.parse(existingMapJSON) : {};
    let resultJSON = {} as CooNFTCacheData;

    Object.assign(resultJSON, existingMap);

    if (!resultJSON.hasOwnProperty(wallet)) {
      const storageJSON = {
        vaaHash: '',
        luckyVaaHash: ``,
        lastOpened: '',
        skippedTxns: [...newSkippedTxns],
      };

      resultJSON[wallet] = storageJSON;
    } else {
      resultJSON[wallet].skippedTxns = [...newSkippedTxns];
    }

    localStorage.setItem(key, JSON.stringify(resultJSON));
  } catch (e) {
    console.error('coo - error caching new skipped txns: ', e);
  }
};

export const removeSkippedTxns = (wallet: string, txnsToRemove: string[]) => {
  try {
    if (!wallet) {
      throw new Error('wallet address is empty');
    }

    const existingMapJSON = localStorage.getItem(key);
    const existingMap: CooNFTCacheData = existingMapJSON ? JSON.parse(existingMapJSON) : {};
    let resultJSON = {} as CooNFTCacheData;

    Object.assign(resultJSON, existingMap);

    if (resultJSON.hasOwnProperty(wallet)) {
      const currSkippedTxns = [...resultJSON[wallet].skippedTxns];
      if (currSkippedTxns.length > 0) {
        const updatedSkippedTxns = currSkippedTxns.filter((x) => !txnsToRemove.includes(x));
        resultJSON[wallet].skippedTxns = [...updatedSkippedTxns];
        localStorage.setItem(key, JSON.stringify(resultJSON));
      }
    }
  } catch (e) {
    console.error('coo - error caching remove skipped txns: ', e);
  }
};

/**
 * returns the JSON structure if present, null otherwise
 */
export const getLastCheckedFromLocal = (wallet: string) => {
  try {
    const existingMapJSON = localStorage.getItem(key);
    const existingMap: CooNFTCacheData = existingMapJSON ? JSON.parse(existingMapJSON) : {};

    if (!existingMap || Object.keys(existingMap).length === 0) {
      return null;
    } else if (!existingMap.hasOwnProperty(wallet)) {
      return null;
    }

    return existingMap[wallet];
  } catch (e) {
    console.error('coo - error getting last checked local: ', e);
  }
  return null;
};
