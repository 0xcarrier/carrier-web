import { JsonMetadata, Metadata, Metaplex } from '@metaplex-foundation/js';
import { PublicKey } from '@solana/web3.js';
import axios from 'axios';
import { getSolanaConnection } from '../solana';

import { safeIPFS } from '../web3Utils';
import { TransformMetaplexData } from './transformers';

export type StringPublicKey = string;

export const METADATA_PROGRAM_ID = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s' as StringPublicKey;

export function publicKeysToMap(keys: PublicKey[]) {
  return keys.reduce((acc, cur) => {
    acc[cur.toString()] = true;
    return acc;
  }, {} as { [key: string]: boolean });
}

export const getMetadataAddress = (mintKey: string): [PublicKey, number] => {
  const seeds = [
    Buffer.from('metadata'),
    new PublicKey(METADATA_PROGRAM_ID).toBuffer(),
    new PublicKey(mintKey).toBuffer(),
  ];
  return PublicKey.findProgramAddressSync(seeds, new PublicKey(METADATA_PROGRAM_ID));
};

/**
 * similar to metaplex.ts::getNftMetadata() but instead of findAllByMintKey, this one uses findAllByOwner
 * findAllByMintKey would get the nfts even those that the wallet is currently not an owner of
 * @param ownerKey
 * @returns
 */
export const getSolNFTMetadataByOwner = async (ownerKey: string): Promise<TransformMetaplexData[]> => {
  const solanaConnection = getSolanaConnection();
  const mx = Metaplex.make(solanaConnection);
  const nfts = await mx.nfts().findAllByOwner({ owner: new PublicKey(ownerKey) });
  const nftMetadatas = nfts.filter((item) => item != null && item.model === 'metadata') as Metadata<
    JsonMetadata<string>
  >[];

  let metaplexDataList: TransformMetaplexData[] = [];

  for (const nftMetadata of nftMetadatas) {
    try {
      // @TODO maybe refactor to fetch only on selection scroll
      const nft = await mx.nfts().load({ metadata: nftMetadata });
      let json: JsonMetadata<string> | undefined = nft.json as JsonMetadata<string>;

      if (nft.jsonLoaded && !nft.json) {
        const safeIPFSLink = safeIPFS(nft.uri);
        const jsonRes = await axios.get<JsonMetadata<string>>(safeIPFSLink);
        json = jsonRes.data;
      }
      metaplexDataList.push({
        name: nftMetadata.name,
        symbol: nftMetadata.symbol,
        image: json.image || '',
        mintAddress: nftMetadata.mintAddress.toString(),
        decimals: 0,
        uri: nftMetadata.uri,
        json: json,
      } as TransformMetaplexData);
    } catch (e) {
      console.log(e);
    }
  }

  return metaplexDataList;
};
