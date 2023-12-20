import questionMarkIcon from '../assets/icons/question-mark.svg';
import { CHAINS, CLUSTER, CarrierChainId, Polkachain, RPC_URLS } from './consts';
import {
  hexToUint8Array,
  tryNativeToUint8Array,
  ChainId as WormholeChainId,
  tryHexToNativeString,
  tryNativeToHexString,
  tryUint8ArrayToNative,
  CHAIN_ID_SOLANA,
} from '@certusone/wormhole-sdk';
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';
import { PublicKey } from '@solana/web3.js';
import { NFTData } from './tokenData/helper';
import { formatAmount } from './format-amount';
import { isEVMChain as isWormholeEVMChain } from '@certusone/wormhole-sdk';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import { hexToU8a, isHex } from '@polkadot/util';
import { getParachainAddressPrefix, getPolkadotProviderWithWormholeChainId } from './polkadot';

// from http://detectmobilebrowsers.com/
export const isPcBrowser =
  /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(
    navigator.userAgent || navigator.vendor || (window as any).opera,
  ) ||
  /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
    navigator.userAgent || navigator.vendor || (window as any).opera.substr(0, 4),
  );
export const isMobileBrowser = !isPcBrowser;

export function toFixed(number: BigNumber, decimals: number, roundingMode?: BigNumber.RoundingMode) {
  return number.toFixed(decimals, roundingMode).replace(/([0-9]+(\.[0-9]+[1-9])?)(\.?0+$)/, '$1');
}

// we use the StaticJsonRpcProvider instead of using JsonRpcProvider
// because the JsonRpcProvider will send too many requests
// also we will cache and reuse the provider for each chain
// otherwise every time the provider created, the chainId/blockNumber requests will be sent
const evmProviders: { [chainId: number]: ethers.providers.StaticJsonRpcProvider } = {};

export const getEvmProviderWithWormholeChainId = (chainId: CarrierChainId) => {
  if (!isCarrierEVMChain(chainId)) {
    throw new Error('not evm chain');
  }

  if (evmProviders[chainId]) {
    return evmProviders[chainId];
  }

  const provider = new ethers.providers.StaticJsonRpcProvider(RPC_URLS[CLUSTER][chainId]);

  evmProviders[chainId] = provider;

  return provider;
};

export const getChainInfo = (chainId: CarrierChainId) => {
  const chain = CHAINS.find((item) => item.id === chainId);

  // Handle edge case where chain info could be undefined if we remove chains from
  // our supported chains list. Then we will try to mock this missing chain using either
  // original wormhole chain info (if exist) or return Unknown chain name.
  return (
    chain || {
      id: chainId,
      name: `Unknown chain: ${chainId}`,
      logo: questionMarkIcon,
    }
  );
};

export const addressShortener = (address: string, start = 5, end = 4) => {
  return address.length > start + end ? `${address.slice(0, start)}...${address.slice(address.length - end)}` : address;
};

export const txShortener = (address: string) => {
  return `${address.slice(0, 10)}...${address.slice(-4)}`;
};

export const nftNameShortener = (name: string, len?: number) => {
  if (name.length > (len || 10)) {
    return `${name.slice(0, len || 10)}...`;
  }
  return name;
};

export const targetAddressFromHex = (targetAddressHex: string) => {
  return `0x${targetAddressHex.slice(24)}`;
};

export const solanaTargetAddressFromHex = (targetAddressHex: string) => {
  return new PublicKey(hexToUint8Array(targetAddressHex)).toBase58();
};

/**
 * used for TransactionHistory source and dest address display
 * convert 0x<lowercase_address> to 0x<checksum>
 * @param address
 * @param chainId wormhole chainid
 */
export const tryConvertChecksumAddress = (address: string, chainId: CarrierChainId) => {
  try {
    if (isCarrierEVMChain(chainId)) {
      return ethers.utils.getAddress(address);
    }
  } catch (e) {
    // do nothing
  }
  return address;
};

export const safeIPFS = (uri: string) =>
  uri.startsWith('ipfs://ipfs/')
    ? uri.replace('ipfs://', 'https://ipfs.io/')
    : uri.startsWith('ipfs://')
    ? uri.replace('ipfs://', 'https://ipfs.io/ipfs/')
    : uri.startsWith('https://cloudflare-ipfs.com/ipfs/') // no CORS support?
    ? uri.replace('https://cloudflare-ipfs.com/ipfs/', 'https://ipfs.io/ipfs/')
    : uri;

export function isImageIsVideo(uri: string) {
  const uriLowerCase = uri.toLowerCase();

  return (
    uriLowerCase.includes('.mp4') ||
    uriLowerCase.includes('.mov') ||
    uriLowerCase.includes('.mkv') ||
    uriLowerCase.includes('.avi') ||
    uriLowerCase.includes('.wmv')
  );
}

export function covalentCompressedImage(uri: string, width = 256) {
  const compressedImage =
    !uri.startsWith('https://image-proxy.svc.prod.covalenthq.com') && !isImageIsVideo(uri) && !uri.includes('.gif')
      ? `https://image-proxy.svc.prod.covalenthq.com/cdn-cgi/image/width=${width},fit/${uri}`
      : uri;

  return compressedImage;
}

export type TokenInfo = {
  tokenAddress: string;
  name: string;
  symbol: string;
  decimals: string;
  chainId: number;
};

/**
 * convert the denorm amount to human readable format
 * the denorm amount max is 10^8
 * to get the "human format", we need to calculate denorm * 10^-8
 * if the currency has lesser than 8 decimals, then denorm * 10^-decimals
 * @param tokenInfo       token address, decimals, name JSON object from token indexer
 * @param denormAmt       denormalized token amount
 * @param isSolanaBridge  (optional) should be true if one of the transaction chain is Solana
 */
export const computeHumanReadableCurrency = (
  tokenInfo: TokenInfo | undefined,
  denormAmt: string,
  isSolanaBridge = false,
) => {
  const denormBN = ethers.FixedNumber.from(denormAmt);
  let decShift;
  const tens = ethers.BigNumber.from(10);

  if (isSolanaBridge) {
    // wrapped sol is 9 decimals
    decShift = ethers.FixedNumber.from(tens.pow(9).toString());
  } else if (tokenInfo) {
    // other erc20 tokens
    const decimals = parseInt(tokenInfo.decimals || '8');
    if (decimals > 8) {
      decShift = ethers.FixedNumber.from(tens.pow(8).toString());
    } else {
      decShift = ethers.FixedNumber.from(tens.pow(decimals).toString());
    }
  } else {
    // no token info; assume it is the standard 18 decimals
    // denormalize wormhole value
    decShift = ethers.FixedNumber.from(tens.pow(8).toString());
  }

  const amount = denormBN.divUnsafe(decShift).toString();

  return formatAmount(BigNumber(amount));
};

/**
 * used by TransactionHistory and WalletDropdown
 * to craft the JSON key to fetch the token info from a tokenInfoMap fetched from the indexer
 * key is a concatenation of tokenChain and tokenAddress for simplicity
 * @param tokenAddress
 * @param chainId
 */
export const getTokenInfoKey = (tokenAddress: string, chainId: CarrierChainId): string => {
  return `${chainId}${tokenAddress.toLowerCase()}`;
};

/**
 * for transaciton history display
 * when the wrapped token info has no name, no symbol etc
 */
export const DEFAULT_TX_TOKEN_SYMBOL = '(Wormhole)';

export function parseAmount(amount: string, decimals: number | undefined) {
  try {
    return ethers.utils.parseUnits(amount, decimals);
  } catch (e) {
    // console.error(e);
  }
  return ethers.BigNumber.from('0');
}

export function formatBigNumber(bignumber: string, decimals: number | undefined) {
  try {
    return ethers.utils.formatUnits(bignumber, decimals);
  } catch (e) {}
}

export function isValidEthereumAddress(address: string) {
  return ethers.utils.isAddress(address);
}

export function isValidSolanaAddress(address: string) {
  try {
    const pubkey = new PublicKey(address);

    return pubkey ? true : false;
  } catch (e) {
    return false;
  }
}

export async function isValidPolkachainAddress(address: string, chainId: CarrierChainId) {
  try {
    const api = await getPolkadotProviderWithWormholeChainId(chainId);
    const addressPrefix = await getParachainAddressPrefix(api);

    encodeAddress(decodeAddress(address, false, addressPrefix), addressPrefix);

    return true;
  } catch (error) {
    return false;
  }
}

export function convertValidEVMToChecksumAddress(address: string) {
  if (isValidEthereumAddress(address)) {
    return ethers.utils.getAddress(address);
  }
  // return back default if not evm address
  return address;
}

export function renderNFTName(selectedNFT: NFTData) {
  const nameLen = isMobileBrowser ? 10 : 30;
  const tokenIdLen = isMobileBrowser ? 4 : 10;
  const NFTName = selectedNFT.name || selectedNFT.nftName;

  if (NFTName && selectedNFT.tokenId) {
    return `${nftNameShortener(NFTName, nameLen)} #${nftNameShortener(selectedNFT.tokenId, tokenIdLen)}`;
  } else if (NFTName && !selectedNFT.tokenId) {
    return `${nftNameShortener(NFTName, nameLen)}`;
  }

  return '???';
}

export function isCarrierEVMChain(chainId: CarrierChainId) {
  if (
    chainId === Polkachain.Polkadot ||
    chainId === Polkachain.HydraDX ||
    chainId === Polkachain.Moonbeam ||
    chainId === Polkachain.Phala ||
    chainId === Polkachain.MoonbaseAlpha ||
    chainId === Polkachain.Manta ||
    chainId === Polkachain.MoonbaseBeta ||
    chainId === Polkachain.Interlay ||
    chainId === Polkachain.PeaqAgung
  ) {
    return false;
  } else {
    return isWormholeEVMChain(chainId);
  }
}

export function isCarrierPolkaChain(chainId?: CarrierChainId) {
  if (
    chainId === Polkachain.Polkadot ||
    chainId === Polkachain.HydraDX ||
    chainId === Polkachain.Moonbeam ||
    chainId === Polkachain.Phala ||
    chainId === Polkachain.MoonbaseAlpha ||
    chainId === Polkachain.Manta ||
    chainId === Polkachain.MoonbaseBeta ||
    chainId === Polkachain.Interlay ||
    chainId === Polkachain.PeaqAgung
  ) {
    return true;
  } else {
    return false;
  }
}

export function tryCarrierNativeToUint8Array(address: string, chainId: CarrierChainId) {
  return tryNativeToUint8Array(address, chainId as WormholeChainId);
}

export function tryCarrierHexToNativeString(hex: string, chainId: CarrierChainId) {
  return tryHexToNativeString(hex, chainId as WormholeChainId);
}

export function tryCarrierNativeToHexString(native: string, chainId: CarrierChainId) {
  return tryNativeToHexString(native, chainId as WormholeChainId);
}

export function tryCarrierUint8ArrayToNative(unit8Arr: Uint8Array, chainId: CarrierChainId) {
  return tryUint8ArrayToNative(unit8Arr, chainId as WormholeChainId);
}

export async function checkIfWalletAddressIsCompatibleWithChain(walletAddress: string, chainId: CarrierChainId) {
  const isWalletAddressCompatableWithChain = isCarrierEVMChain(chainId)
    ? isValidEthereumAddress(walletAddress)
    : isCarrierPolkaChain(chainId)
    ? await isValidPolkachainAddress(walletAddress, chainId)
    : chainId === CHAIN_ID_SOLANA
    ? isValidSolanaAddress(walletAddress)
    : false;
  return isWalletAddressCompatableWithChain;
}
