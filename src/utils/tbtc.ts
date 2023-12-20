import {
  CHAIN_ID_ARBITRUM,
  CHAIN_ID_BASE,
  CHAIN_ID_ETH,
  CHAIN_ID_OPTIMISM,
  CHAIN_ID_POLYGON,
  CHAIN_ID_SOLANA,
} from '@certusone/wormhole-sdk';
import { Contract, Signer } from 'ethers';
import WormholeTbtcABI from '../abis/WormholeTbtc.json';
import { CLUSTER, CarrierChainId } from './consts';

const tbtcConfigs: {
  [chainId: number]: { wtbtcAddress: string; tbtcAddress: string; gatewayAddress: string };
} =
  CLUSTER === 'mainnet'
    ? {
        [CHAIN_ID_ETH]: {
          wtbtcAddress: '',
          tbtcAddress: '0x18084fbA666a33d37592fA2633fD49a74DD93a88',
          gatewayAddress: '',
        },
        [CHAIN_ID_POLYGON]: {
          wtbtcAddress: '0x3362b2b92b331925f09f9e5bca3e8c43921a435c',
          tbtcAddress: '0x236aa50979D5f3De3Bd1Eeb40E81137F22ab794b',
          gatewayAddress: '0x09959798B95d00a3183d20FaC298E4594E599eab',
        },
        [CHAIN_ID_SOLANA]: {
          wtbtcAddress: '25rXTx9zDZcHyTav5sRqM6YBvTGu9pPH9yv83uAEqbgG',
          tbtcAddress: '6DNSN2BJsaPFdFFc1zP37kkeNe4Usc1Sqkzr9C9vPWcU',
          gatewayAddress: '87MEvHZCXE3ML5rrmh5uX1FbShHmRXXS32xJDGbQ7h5t',
        },
        [CHAIN_ID_ARBITRUM]: {
          wtbtcAddress: '0x57723abc582dbfe11ea01f1a1f48aee20bd65d73',
          tbtcAddress: '0x6c84a8f1c29108F47a79964b5Fe888D4f4D0dE40',
          gatewayAddress: '0x1293a54e160D1cd7075487898d65266081A15458',
        },
        [CHAIN_ID_OPTIMISM]: {
          wtbtcAddress: '0xec0a755664271b87002dda33ca2484b24af68912',
          tbtcAddress: '0x6c84a8f1c29108F47a79964b5Fe888D4f4D0dE40',
          gatewayAddress: '0x1293a54e160D1cd7075487898d65266081A15458',
        },
        [CHAIN_ID_BASE]: {
          wtbtcAddress: '0x9ee95e6bd1b3c5740f105d6fb06b8bdef64eec70',
          tbtcAddress: '0x236aa50979d5f3de3bd1eeb40e81137f22ab794b',
          gatewayAddress: '0x09959798b95d00a3183d20fac298e4594e599eab',
        },
      }
    : {
        [CHAIN_ID_ETH]: {
          wtbtcAddress: '',
          tbtcAddress: '0x679874fbe6d4e7cc54a59e315ff1eb266686a937',
          gatewayAddress: '',
        },
        [CHAIN_ID_POLYGON]: {
          wtbtcAddress: '0xf6CC0Cc8D54a4b1A63a0E9745663e0c844Ee4D48',
          tbtcAddress: '0xBcD7917282E529BAA6f232DdDc75F3901245A492',
          gatewayAddress: '0x91Fe7128f74dBd4F031ea3D90FC5Ea4DCfD81818',
        },
        [CHAIN_ID_SOLANA]: {
          wtbtcAddress: 'FMYvcyMJJ22whB9m3T5g1oPKwM6jpLnFBXnrY6eXmCrp',
          tbtcAddress: '6DNSN2BJsaPFdFFc1zP37kkeNe4Usc1Sqkzr9C9vPWcU',
          gatewayAddress: '87MEvHZCXE3ML5rrmh5uX1FbShHmRXXS32xJDGbQ7h5t',
        },
        [CHAIN_ID_ARBITRUM]: {
          wtbtcAddress: '0x97B5fE27a82b2B187D9a19C5782d9eB93B82DaC3',
          tbtcAddress: '0x85727F4725A4B2834e00Db1AA8e1b843a188162F',
          gatewayAddress: '0x31A15e213B59E230b45e8c5c99dAFAc3d1236Ee2',
        },
        [CHAIN_ID_OPTIMISM]: {
          wtbtcAddress: '0x5d89a5bcb86f15a2ccab05e7e3bee23fdf246a64',
          tbtcAddress: '0x1a53759de2eadf73bd0b05c07a4f1f5b7912da3d',
          gatewayAddress: '0x6449f4381f3d63bdfb36b3bdc375724ad3cd4621',
        },
        [CHAIN_ID_BASE]: {
          wtbtcAddress: '0x0219441240d89fac3fd708d06d8fd3a072c02fb6',
          tbtcAddress: '0x783349cd20f26ce12e747b1a17bc38d252c9e119',
          gatewayAddress: '0xe3e0511eebd87f08fbae4486419cb5dfb06e1343',
        },
      };

export const getTBTCGatewayForChain = (id: CarrierChainId) => {
  return tbtcConfigs[id]?.gatewayAddress || '';
};

export function getTBTCGatewayForChainOrError(id: CarrierChainId, error: Error) {
  const gateway = getTBTCGatewayForChain(id);
  if (gateway) return gateway;
  throw error;
}

export const getTBTCGatewayContractOrError = (signer: Signer, id: CarrierChainId, error: Error) =>
  new Contract(getTBTCGatewayForChainOrError(id, error), WormholeTbtcABI, signer);

export const getTBTCAddressForChain = (id: CarrierChainId) => {
  return tbtcConfigs[id]?.tbtcAddress || '';
};

export const getWtBTCAddressForChain = (id: CarrierChainId) => {
  return tbtcConfigs[id]?.wtbtcAddress || '';
};

export const isTbtcEnabled = (id: CarrierChainId) => {
  return tbtcConfigs[id]?.tbtcAddress != null;
};

export function isTBTCCanBeBridgeToTarget({
  sourceChainId,
  tokenAddress,
  targetChainId,
  originAddress,
  originChainId,
}: {
  sourceChainId: CarrierChainId;
  tokenAddress: string;
  targetChainId: CarrierChainId;
  originAddress: string;
  originChainId: CarrierChainId;
}) {
  const isSendFromETHAndTargetIsOtherEvms = sourceChainId === CHAIN_ID_ETH && !isTbtcEnabled(targetChainId);

  const isSendToETHAndSourceIsOtherEvms = targetChainId === CHAIN_ID_ETH && !isTbtcEnabled(sourceChainId);

  const isWtBtc =
    originChainId === CHAIN_ID_ETH &&
    originAddress.toLowerCase() === getTBTCAddressForChain(CHAIN_ID_ETH).toLowerCase() &&
    tokenAddress.toLowerCase() !== getTBTCAddressForChain(sourceChainId).toLowerCase();

  const isWtbtcSendToOtherEvms = !isTbtcEnabled(targetChainId) && isWtBtc;

  const canBeBridge =
    originChainId === CHAIN_ID_ETH &&
    originAddress.toLowerCase() === getTBTCAddressForChain(CHAIN_ID_ETH).toLowerCase() &&
    !isSendFromETHAndTargetIsOtherEvms &&
    !isSendToETHAndSourceIsOtherEvms &&
    !isWtbtcSendToOtherEvms;

  console.log('isTBTCCanBeBridgeToTarget', {
    originChainId,
    originAddress,
    isSendFromETHAndTargetIsOtherEvms,
    isSendToETHAndSourceIsOtherEvms,
    isWtBtc,
    isWtbtcSendToOtherEvms,
    canBeBridge,
  });

  return canBeBridge;
}

export function isTBTCCanBeRedeemOnTarget({
  targetChainId,
  originAddress,
  originChainId,
}: {
  targetChainId: CarrierChainId;
  originAddress: string;
  originChainId: CarrierChainId;
}) {
  const hasGateway = !!getTBTCGatewayForChain(targetChainId);

  return (
    originChainId === CHAIN_ID_ETH &&
    originAddress.toLowerCase() === getTBTCAddressForChain(CHAIN_ID_ETH).toLowerCase() &&
    hasGateway
  );
}
