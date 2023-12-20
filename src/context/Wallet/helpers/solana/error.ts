export const errorGettingSplTokenPubKey = new Error('An error occurred while getting the spl token public key');
export const errorGettingAccountPubKey = new Error(
  "An error occurred while getting the public key from wallet's account",
);
export const errorGettingTransactionHash = new Error('An error occured while getting the transaction hash');
export const errorGettingConnection = new Error('An error occurred while getting connection to the wallet');
export const errorGettingSignTransaction = new Error(
  "An error occurred while getting Solana's sign transaction method",
);
export const errorGettingTransactionInfo = new Error('An error occurred while getting the transaction info');
export const errorNFTIdInvalid = new Error('NFT token ID is invalid');
export const errorTargetAddressOwnerNotMatch = new Error(
  'An error occured while redeem native to an invalid target address owner',
);
