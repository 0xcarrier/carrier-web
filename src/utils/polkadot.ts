import { TypeRegistry, Enum, Struct, GenericExtrinsic } from '@polkadot/types';
import { SignedBlock } from '@polkadot/types/interfaces/types';
import {
  CLUSTER,
  CarrierChainId,
  MOONBEAM_PARACHAIN_ID,
  Polkachain,
  RPC_URLS,
  getDefaultNativeCurrencyAddress,
} from './consts';
import { ethers } from 'ethers';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { isCarrierEVMChain, isCarrierPolkaChain } from './web3Utils';
import { CHAIN_ID_MOONBEAM, CHAIN_ID_SOLANA } from '@certusone/wormhole-sdk';
import type { AnyTuple } from '@polkadot/types-codec/types';

const polkadotProviders: { [chainId: number]: ApiPromise } = {};

export async function getPolkadotProviderWithWormholeChainId(chainId: CarrierChainId): Promise<ApiPromise> {
  if (!isCarrierPolkaChain(chainId)) {
    throw new Error('not para chain');
  }

  if (polkadotProviders[chainId]) {
    return polkadotProviders[chainId];
  }

  const wsProvider = new WsProvider(RPC_URLS[CLUSTER][chainId], 1000);

  const api = await ApiPromise.create({ provider: wsProvider });

  polkadotProviders[chainId] = api;

  return api;
}

export function getParachaiCurrencyHexAddressByAssetId(assetId: string) {
  const hex = ethers.BigNumber.from(assetId).toHexString();

  return '0xffffffff' + hex.replace('0x', '');
}

export function getParachainNativeCurrencyHexAddressByChainId(chainId: CarrierChainId) {
  return getParachaiCurrencyHexAddressByAssetId(getDefaultNativeCurrencyAddress(chainId));
}

// convert to hex
const registry = new TypeRegistry();

/**Moonbeam's MRL precompile expects a VersionedUserAction object as a payload.*/
class VersionedUserAction extends Enum {
  constructor(value?: any) {
    super(registry, { V1: XcmRoutingUserAction }, value);
  }
}

class XcmRoutingUserAction extends Struct {
  constructor(value?: any) {
    super(registry, { destination: 'VersionedMultiLocation' }, value);
  }
}

// reference: https://github.com/jboetticher/mrl-example/blob/main/src/MoonbeamRoutedLiquidityPayloads.ts
export function createMRLPayload(chainId: CarrierChainId, account: string): Uint8Array {
  // Create a multilocation object based on the target parachain's account type
  const multilocation = {
    V1: {
      parents: 1,
      interior: {
        X2: [{ Parachain: chainId }, { AccountId32: { id: account } }],
      },
    },
  };

  // Format multilocation object as a Polkadot.js type
  const destination = registry.createType('VersionedMultiLocation', multilocation);
  // Wrap and format the MultiLocation object into the precompile's input type
  const userAction = new XcmRoutingUserAction({ destination });
  const versionedUserAction = new VersionedUserAction({ V1: userAction });

  console.log('Versioned User Action JSON:', versionedUserAction.toJSON());
  console.log('Versioned User Action SCALE:', versionedUserAction.toHex());
  console.log('Versioned User Action toRawType', versionedUserAction.toRawType(), versionedUserAction.toPrimitive());
  // SCALE encode resultant precompile formatted objects
  return versionedUserAction.toU8a();
}

export function isParachainTxHash(txHash: string): boolean {
  try {
    parseParachainTxHash(txHash);

    return true;
  } catch (e) {}

  return false;
}

export enum ParachainBridgeType {
  MRL,
  XCM,
}

export type ParsedParachainTxHash =
  | {
      bridgeType: ParachainBridgeType;
      moonbeamBlockHash: string;
      moonbeamExtrinsicHash: string;
      moonbeamTransactionHash: string;
      parachainId: Polkachain;
      parachainBlockHash: string;
      parachainExtrinsicHash: string;
      messageHash: string;
    }
  | {
      bridgeType: ParachainBridgeType;
      sourceMessageHash: string;
      sourceAssetId: string;
      sourceParachainId: Polkachain;
      sourceParachainBlockHash: string;
      sourceParachainExtrinsicHash: string;
      targetMessageHash: string;
      targetAssetId: string;
      targetParachainId: Polkachain;
      targetParachainBlockHash: string;
      targetParachainExtrinsicHash: string;
    };

export function parseParachainTxHash(txHash: string): ParsedParachainTxHash | undefined {
  const txHashString = ethers.utils.toUtf8String(txHash);
  const [bridgeType, params] = txHashString.split(':');

  // legacy issue, first version of the parachain tx hash doesn't contain the bridge type, so we see it as mrl by default
  if (bridgeType.startsWith('0x')) {
    const [
      moonbeamBlockHash,
      moonbeamExtrinsicHash,
      moonbeamTransactionHash,
      parachainBlockHash,
      parachainExtrinsicHash,
      messageHash,
    ] = bridgeType.split(',');

    return {
      bridgeType: ParachainBridgeType.MRL,
      moonbeamBlockHash,
      moonbeamExtrinsicHash,
      moonbeamTransactionHash,
      parachainId: parseInt('0'),
      parachainBlockHash,
      parachainExtrinsicHash,
      messageHash,
    };
  } else if (bridgeType === 'mrl') {
    const [
      moonbeamBlockHash,
      moonbeamExtrinsicHash,
      moonbeamTransactionHash,
      parachainId,
      parachainBlockHash,
      parachainExtrinsicHash,
      messageHash,
    ] = params.split(',');

    return {
      bridgeType: ParachainBridgeType.MRL,
      moonbeamBlockHash,
      moonbeamExtrinsicHash,
      moonbeamTransactionHash,
      parachainId: parseInt(parachainId),
      parachainBlockHash,
      parachainExtrinsicHash,
      messageHash,
    };
  } else if (bridgeType === 'xcm') {
    const [
      sourceMessageHash,
      sourceAssetId,
      sourceParachainId,
      sourceParachainBlockHash,
      sourceParachainExtrinsicHash,
      targetMessageHash,
      targetAssetId,
      targetParachainId,
      targetParachainBlockHash,
      targetParachainExtrinsicHash,
    ] = params.split(',');

    return {
      bridgeType: ParachainBridgeType.XCM,
      sourceMessageHash,
      sourceAssetId,
      sourceParachainId: parseInt(sourceParachainId),
      sourceParachainBlockHash,
      sourceParachainExtrinsicHash,
      targetMessageHash,
      targetAssetId,
      targetParachainId: parseInt(targetParachainId),
      targetParachainBlockHash,
      targetParachainExtrinsicHash,
    };
  }
}

export async function parseParachainTxPayload(payload: Buffer) {
  try {
    const registry = new TypeRegistry();

    registry.register({
      VersionedUserAction: {
        _enum: { V1: 'XcmRoutingUserAction' },
      },
      XcmRoutingUserAction: {
        destination: 'VersionedMultiLocation',
      },
    });
    const versionedUserAction = registry.createType('VersionedUserAction', payload) as VersionedUserAction;
    const versionedUserActionJSON = versionedUserAction.toJSON() as any;

    console.log('versionedUserActionJSON', versionedUserActionJSON);

    return {
      parachainId: versionedUserActionJSON.v1.destination.v1.interior.x2[0].parachain as Polkachain,
      accountId: versionedUserActionJSON.v1.destination.v1.interior.x2[1].accountId32.id as string,
    };
  } catch (e) {
    console.error(e);
  }
}

export async function getParachainAddressPrefix(api: ApiPromise) {
  const chainInfo = api.registry.getChainProperties();
  const addressPrefix = chainInfo ? chainInfo.ss58Format.value.toNumber() : undefined;

  return addressPrefix;
}

// parachain extrinsic hash is not unique, we need to combine it with block hash, and we can only get messageHash from event
// if we miss the event on moonbeam, then we can't retrieve it anymore.
// so we have to get block hash, extrinsic hash, and messageHash from event
// and put it into a string to generate a unique hash
export function generateMRLTransactionHash(options: {
  moonbeamBlockHash: string;
  moonbeamExtrinsicHash: string;
  moonbeamTransactionHash: string;
  messageHash: string;
  parachainId: CarrierChainId;
  parachainBlockHash: string;
  parachainExtrinsicHash: string;
}) {
  const {
    moonbeamBlockHash,
    moonbeamExtrinsicHash,
    moonbeamTransactionHash,
    messageHash,
    parachainId,
    parachainBlockHash,
    parachainExtrinsicHash,
  } = options;

  const hash = ethers.utils.hexlify(
    new TextEncoder().encode(
      `mrl:${moonbeamBlockHash},${moonbeamExtrinsicHash},${moonbeamTransactionHash},${parachainId},${parachainBlockHash},${parachainExtrinsicHash},${messageHash}`,
    ),
  );

  console.log('mrl parachain tx hash generated. options: ', options, 'hash: ', hash);

  return hash;
}

// parachain extrinsic hash is not unique, we need to combine it with block hash, and we can only get messageHash from event
// if we miss the event on moonbeam, then we can't retrieve it anymore.
// so we have to get block hash, extrinsic hash, and messageHash from event
// and put it into a string to generate a unique hash
export function generateXCMTransactionHash(options: {
  sourceMessageHash: string;
  sourceAssetId: string;
  sourceParachainId: CarrierChainId;
  sourceParachainBlockHash: string;
  sourceParachainExtrinsicHash: string;
  targetMessageHash: string;
  targetAssetId: string;
  targetParachainId: CarrierChainId;
  targetParachainBlockHash: string;
  targetParachainExtrinsicHash: string;
}) {
  const {
    sourceMessageHash,
    sourceAssetId,
    sourceParachainId,
    sourceParachainBlockHash,
    sourceParachainExtrinsicHash,
    targetMessageHash,
    targetAssetId,
    targetParachainId,
    targetParachainBlockHash,
    targetParachainExtrinsicHash,
  } = options;

  const hash = ethers.utils.hexlify(
    new TextEncoder().encode(
      `xcm:${sourceMessageHash},${sourceAssetId},${sourceParachainId},${sourceParachainBlockHash},${sourceParachainExtrinsicHash},${targetMessageHash},${targetAssetId},${targetParachainId},${targetParachainBlockHash},${targetParachainExtrinsicHash}`,
    ),
  );

  console.log('xcm parachain tx hash generated. options: ', options, 'hash: ', hash);

  return hash;
}

export function needToPayMRLFee(sourceChainId: CarrierChainId, targetChainId: CarrierChainId) {
  return isCarrierEVMChain(sourceChainId) && sourceChainId !== CHAIN_ID_MOONBEAM && isCarrierPolkaChain(targetChainId);
}

export function needTransferByMRL(sourceChainId: CarrierChainId, targetChainId: CarrierChainId) {
  return (
    (((isCarrierEVMChain(sourceChainId) && sourceChainId !== CHAIN_ID_MOONBEAM) || sourceChainId === CHAIN_ID_SOLANA) &&
      isCarrierPolkaChain(targetChainId)) ||
    (isCarrierPolkaChain(sourceChainId) &&
      ((isCarrierEVMChain(targetChainId) && targetChainId !== CHAIN_ID_MOONBEAM) || targetChainId === CHAIN_ID_SOLANA))
  );
}

export function needTransferByXCM(sourceChainId: CarrierChainId, targetChainId: CarrierChainId) {
  return (
    (sourceChainId === CHAIN_ID_MOONBEAM && isCarrierPolkaChain(targetChainId)) ||
    (isCarrierPolkaChain(sourceChainId) && targetChainId === CHAIN_ID_MOONBEAM) ||
    (isCarrierPolkaChain(sourceChainId) && isCarrierPolkaChain(targetChainId))
  );
}

export function needXCMTransfer(chainId: CarrierChainId) {
  return chainId === CHAIN_ID_MOONBEAM || isCarrierPolkaChain(chainId);
}

export function isPolkadotXCMV3(chainId: CarrierChainId) {
  return (
    chainId === CHAIN_ID_MOONBEAM ||
    chainId === Polkachain.HydraDX ||
    chainId === Polkachain.Interlay ||
    chainId === Polkachain.PeaqAgung
  );
}

export function isAccountKey20(chainId: CarrierChainId) {
  return chainId === CHAIN_ID_MOONBEAM;
}

export interface PolkadotExtrinsic {
  block: SignedBlock;
  extrinsic: GenericExtrinsic<AnyTuple> | undefined;
}

export async function getPolkadotExtrinsic(options: {
  chainId: CarrierChainId;
  blockHash: string;
  extrinsicHash: string;
}): Promise<PolkadotExtrinsic> {
  const { chainId, blockHash, extrinsicHash } = options;
  const api = await getPolkadotProviderWithWormholeChainId(chainId);
  const block = await api.rpc.chain.getBlock(blockHash);
  const extrinsic = block.block.extrinsics.find(
    (item) => item.hash.toHex().toLowerCase() === extrinsicHash.toLowerCase(),
  );

  return { block, extrinsic };
}

export async function getMoonbeamTransactionHashByExtrinsic(options: {
  blockHash: string;
  extrinsicHash: string;
}): Promise<string | undefined> {
  const { blockHash, extrinsicHash } = options;
  const api = await getPolkadotProviderWithWormholeChainId(MOONBEAM_PARACHAIN_ID);
  const block = await api.rpc.chain.getBlock(blockHash);
  const extrinsicIndex = block.block.extrinsics.findIndex((item, index) => {
    return item.hash.toHex().toLowerCase() === extrinsicHash;
  });
  const apiAt = await api.at(blockHash);
  const events = await apiAt.query.system.events();
  const extrinsicEvents = events.filter(
    ({ phase }) => phase.isApplyExtrinsic && phase.asApplyExtrinsic.eq(extrinsicIndex),
  );
  const ethereumExecutedEvent = extrinsicEvents.find(
    (item) => item.event.section === 'ethereum' && item.event.method === 'Executed',
  );

  return (ethereumExecutedEvent?.event.data as any)?.transactionHash?.toHex();
}
