import React, { PropsWithChildren } from 'react';

import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { ExodusWalletAdapter, PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';

import { SOLANA_HOST } from '../../utils/consts';

export const SolanaWalletProvider = ({ children }: PropsWithChildren<Record<string, unknown>>) => {
  const SOLANA_WALLET_ADAPTERS = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    new ExodusWalletAdapter(),
    // new SolletWalletAdapter(),
    // new SolletExtensionWalletAdapter(),
    // new CloverWalletAdapter(),
    // new Coin98WalletAdapter(),
    // new SlopeWalletAdapter(),
    // new SolongWalletAdapter(),
    // new TorusWalletAdapter(),
  ];

  return (
    <ConnectionProvider endpoint={SOLANA_HOST}>
      <WalletProvider wallets={SOLANA_WALLET_ADAPTERS}>{children}</WalletProvider>
    </ConnectionProvider>
  );
};
