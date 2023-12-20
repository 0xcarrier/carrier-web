import useSWR from 'swr';
import { safeIPFS } from '../../../utils/web3Utils';
import { getCooNFTContractInstance } from '../cooHelper';

export interface CooMetadata {
  tokenURI: string;
  image: string;
}

const fetchMetadata = async (key: string, tokenId: number | undefined) => {
  let tokenURI = '';
  let image = '';

  if (!tokenId) {
    return {
      tokenURI,
      image,
    };
  }

  try {
    const nftContract = getCooNFTContractInstance();
    tokenURI = await nftContract.tokenURI(`${tokenId}`);

    console.log('uri: ', tokenURI);

    if (tokenURI) {
      const response = await fetch(safeIPFS(tokenURI));
      const metadata = await response.json();
      if (response && metadata) {
        image = metadata.image || metadata.image_url || metadata.big_image || metadata.small_image;
      }
    }
  } catch (e) {
    console.error(e);
  }

  console.log('image: ', image);

  return {
    tokenURI,
    image: safeIPFS(image),
  } as CooMetadata;
};

export function useCooMetadata(tokenId: number | undefined) {
  const { data, error } = useSWR(['fetch_coo_metadata', tokenId], fetchMetadata, {
    revalidateOnFocus: false,
  });

  return {
    cooMetadata: data,
    isLoading: !data,
    error,
  };
}
