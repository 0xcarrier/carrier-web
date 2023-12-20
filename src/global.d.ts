type OneKeyProvider = Record<string, any> & {
  isOneKey?: boolean;
};

declare global {
  interface Window {
    $onekey?: {
      ethereum?: OneKeyProvider;
    };
  }
}

export {};
