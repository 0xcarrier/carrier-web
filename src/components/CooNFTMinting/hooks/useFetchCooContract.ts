import useSWR from 'swr';
import { getCooNFTContractInstanceMultiProvider, NO_NFT_TOKEN_ID } from '../cooHelper';

export interface CooContractData {
  startMintTime: number;
  endMintTime: number;
  mintedTokenId: number;
  isPublicMintAvailable: boolean;
}

const fetchCooContract = async (key: string, walletAddress: string | undefined): Promise<CooContractData> => {
  let startMintTime = 0;
  let endMintTime = 0;
  let mintedTokenId = NO_NFT_TOKEN_ID; // 0 means wallet address does not own nft yet
  let isPublicMintAvailable: boolean | undefined = undefined;

  let startTimePromise;
  let endTimePromise;
  let nftTokenIdPromise;
  let isPublicMintAvailablePromise;

  try {
    const cooNFTContract = getCooNFTContractInstanceMultiProvider();

    [startTimePromise, endTimePromise, nftTokenIdPromise, isPublicMintAvailablePromise] = await Promise.allSettled([
      cooNFTContract.startTime(),
      cooNFTContract.endTime(),
      cooNFTContract.getTokenIdFromAddress(walletAddress), // wallet address might not be connected; we don't want it to hang
      cooNFTContract.publicMintAvailable(),
    ]);

    if (nftTokenIdPromise.status === 'fulfilled' && Number(nftTokenIdPromise.value.toString()) > 0) {
      mintedTokenId = Number(nftTokenIdPromise.value.toString());
    }

    if (startTimePromise.status === 'fulfilled') {
      startMintTime = Number(startTimePromise.value.toString());
    }

    if (endTimePromise.status === 'fulfilled') {
      endMintTime = Number(endTimePromise.value.toString());
    }

    if (isPublicMintAvailablePromise.status === 'fulfilled') {
      isPublicMintAvailable = !!isPublicMintAvailablePromise.value;
    }

    console.log('start mint time: ', startMintTime);
    console.log('end time: ', endMintTime);
    console.log('minted id: ', mintedTokenId);
    console.log('can mint?: ', isPublicMintAvailable);
  } catch (e) {
    console.error(e);
  }

  return {
    startMintTime: Number(startMintTime) * 1000,
    endMintTime: Number(endMintTime) * 1000,
    mintedTokenId,
    isPublicMintAvailable,
  } as CooContractData;
};

export function useFetchCooContract(walletAddress: string | undefined) {
  const { data, error, mutate } = useSWR(['fetch_coo_contract', walletAddress], fetchCooContract, {
    revalidateOnFocus: false,
  });

  return {
    cooContractData: data,
    isLoading: !data,
    error,
    mutate,
  };
}
