export type TokenInfo = {
  tokenAddress: string;
  name: string;
  symbol: string;
  decimals: string;
  chainId: number;
};

export interface CarrierTxnObject extends TxnObject {
  wormholeSequence: string; // sequence number is returned after invoking bridge method; required to fetch VAA
  twoFASequence?: string; // two FA sequence number (used for nft bridge only)
  swapInAmt?: string; // used for swap, nativeA -> intermediate
  swapOutAmt?: string; // used for swap, intermediate -> nativeB
  unwrappedSourceTokenAddress?: string; // // for token bridge; when transfer from source, the wormhole event will output tokenAddress and tokenChain, these two values might be generated if the source is wormhole wrapped
  unwrappedSourceChainId?: number;
  isSourceNative?: boolean;
  arbiterFee?: string;
  redeemTxn?: string;
  signedVAABytes?: string;
  signedVAAHash?: string;
  twoFASignedVAABytes?: string;
  cctpHashedSourceAndNonce?: string;
  emitterAddress?: string;
  twoFAEmitterAddress?: string;
  solanaWalletAccount?: string; // solana owner wallet address, when the transaction occurs either from or to Solana chain
}

// generic txn object
export interface TxnObject {
  txnType: string; // token_bridge, nft_bridge swap, redeem, recovery
  txn: string;
  sender: string;
  recipient: string;
  tokenAmt?: string; // normalize amount to transferred; see wormhole bridge contract normalizeAmount and deNormalizeAmount
  tokenId?: number; // tokenId for nft
  sourceTokenAddress: string; // if swap, address is nativeA token address in 0xbase16
  sourceChainId: number;
  destTokenAddress: string; // if swap, address is nativeB token address in 0xbase16
  destChainId: number;
  status: string; // confirmed, pending, failed
  created: string; // unix timestamp
  updated: string; // unix timestamp
}
