import { coalesceChainName, getSignedVAAHash, parseVaa } from '@certusone/wormhole-sdk';
import { css } from '@linaria/core';
import React, { useEffect, useState } from 'react';
import { useWalletAdapter } from '../../context/Wallet/WalletProvider';
import { useAutoConnection } from '../../hooks/useAutoConnection';
import { useTargetWallet } from '../../hooks/useTargetWallet';
import { useWallet } from '../../hooks/useWallet';
import { getChainCache } from '../../utils/chainCache';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { addressShortener } from '../../utils/web3Utils';
import { useFetchCooContract } from './hooks/useFetchCooContract';
import { CooViewNFTModal } from './CooViewNFTModal';
import { useFetchEligibleTxns } from './hooks/useFetchEligibleTxns';
import { CooNFTSection } from './CooNFTSection';
import { ENVELOPE_LIMIT, getCooNFTContractInstance, getCooNFTContractInstanceMultiProvider } from './cooHelper';
import { removeSkippedTxns, saveLastCheckedToLocal, saveLuckyVaaHashToLocal } from './cooCache';
import { EnvelopeModal } from './EnvelopeModal';
import { notification } from 'antd';
import parseError from '../../utils/parseError';
import { cooNFTMintParams } from '../../utils/consts';
import { useWalletChangedListener } from '../../hooks/useWalletChangedListener';
import { ConnectWallet } from './ConnectWallet';

interface IProps {}

/**
 * minting page for Carrier Coo NFT distribution
 *
 * each wallet that bridged a token or nft to a designated chain, the recipient address in the bridge operation, can open an envelope
 * each envelope uses the vaa hash to determine if the recipient address in the decoded vaa has won a nft
 * each wallet address can only mint once
 */
export const CooNFTMinting: React.SFC<IProps> = () => {
  const { connectedWallet } = useWalletAdapter();
  const sourceWallet = useWallet();
  const targetWallet = useTargetWallet();

  const chainAndWalletCache = getChainCache();
  useAutoConnection({ sourceWallet, targetWallet, chainAndWalletCache });
  useWalletChangedListener({ sourceWallet, targetWallet });

  // console.log('connected wallet: ', connectedWallet);
  // console.log('source wallet: ', sourceWallet);

  const [openEnvelopeModal, setOpenEnvelopeModal] = useState(false);
  const [openViewNFTModal, setOpenViewNFTModal] = useState(false);

  const [eligibleVaa, setEligibleVaa] = useState(''); // vaa from the indexer in base64 string
  const [isCheckWinningVaa, setIsCheckWinningVaa] = useState(false);
  const [isMinting, setIsMinting] = useState(false);

  const {
    cooContractData,
    isLoading: isContractDataLoading,
    error: cooContractDataError,
    mutate: resyncCooContract,
  } = useFetchCooContract(sourceWallet.wallet?.walletAddress);

  const {
    txnsData,
    isLoading: isFetchingTxns,
    error: txnsDataError,
    isValidating: isValidatingTxns,
    mutate: resyncTxns,
  } = useFetchEligibleTxns(cooContractData, sourceWallet.wallet?.walletAddress);

  // re-evaluate the publicMintAvailable contract param on mint
  // in case the limit is reached when users open the modal
  const [isAvailableOnMint, setIsAvailableOnMint] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    // on init page; init the sourcewallet
    if (connectedWallet && !sourceWallet.wallet) {
      sourceWallet.connect({ chainId: connectedWallet.chainId, walletName: connectedWallet.walletName });
    }
  }, [connectedWallet]);

  /**
   * check the list of vaaBytes if they are all eligible
   * @pre all the vaas here are within valid contract timestamp
   *
   * if one is eligible, save the vaa, show the mint coo flow
   * if none of the vaa bytes is eligible, show the wild coo fled modal
   *
   * vaa check may take on the first winning vaa and skip the rest
   * note: this means that if we allow more than one NFT per address; need to handle such cases
   */
  const onOpenEnvelope = async () => {
    // reset
    setEligibleVaa('');

    const walletAddress = sourceWallet && sourceWallet.wallet?.walletAddress;

    if (!walletAddress) {
      throw new Error('user wallet is not connected');
    }

    if (!txnsData?.eligibleTxns || txnsData.eligibleTxns.length === 0) {
      throw new Error('user does not have any eligible txns');
    }

    let _vaa = '';

    try {
      setIsCheckWinningVaa(true);

      const cooNFTContract = getCooNFTContractInstanceMultiProvider();

      for (let k = 0; k < txnsData.eligibleTxns.length; k += ENVELOPE_LIMIT) {
        if (_vaa.length > 0) {
          break;
        }

        // split array just in case users has a lot of vaas to check
        let _eligibleTxns = txnsData.eligibleTxns.slice(k, k + ENVELOPE_LIMIT);
        let _vaaBytesList: string[] = [];

        const isSignedVaaBytes = (item: string | undefined): item is string => {
          return !!item;
        };

        _vaaBytesList = _eligibleTxns
          .map((txn) => {
            return txn.signedVAABytes;
          })
          .filter(isSignedVaaBytes);

        const isMintEligibleContractCalls = _vaaBytesList.map((vaa) => {
          return cooNFTContract.isMintingEligible(Buffer.from(vaa, 'base64'));
        });

        const eligiblityResults = await Promise.allSettled(isMintEligibleContractCalls);
        console.log('eligible list: ', eligiblityResults);

        for (let i = 0; i < eligiblityResults.length; i++) {
          // use the array index to get the vaa bytes index
          if (eligiblityResults[i].status === 'fulfilled') {
            const intendedRecipient = (eligiblityResults[i] as PromiseFulfilledResult<string> | undefined)?.value;

            if (intendedRecipient && intendedRecipient.toLowerCase() === walletAddress.toLowerCase()) {
              // only connected wallet that matches the intended recipient can mint nft
              _vaa = _vaaBytesList[i];

              const vaaBuffer = Buffer.from(_vaa, 'base64');
              const vaaHash = getSignedVAAHash(vaaBuffer);
              saveLuckyVaaHashToLocal(walletAddress, vaaHash);
            }
          } else if (eligiblityResults[i].status === 'rejected') {
            const rejectedResults = eligiblityResults[i] as PromiseRejectedResult;
            if (
              rejectedResults.reason.errorArgs.length > 0 &&
              rejectedResults.reason.errorArgs[0] !== 'provided hash does not satisfy criterion'
            ) {
              // throw other contract errors; e.g. invalid bidNum
              throw new Error(rejectedResults.reason.errorArgs);
            }
          }
        }

        // set most recent vaa as the last opened vaa time and save to local storage
        const vaaBuffer = Buffer.from(_vaaBytesList[_vaaBytesList.length - 1], 'base64');
        const decodedVaa = parseVaa(vaaBuffer);
        const vaaHash = getSignedVAAHash(vaaBuffer);
        saveLastCheckedToLocal(walletAddress, vaaHash, decodedVaa.timestamp * 1000);

        // clear the skipped txns
        const removedTxns = _eligibleTxns.map((txn) => {
          return txn.txn;
        });
        removeSkippedTxns(walletAddress, removedTxns);
      }
    } catch (e) {
      console.error('open envelope error: ', e);
    } finally {
      setIsCheckWinningVaa(false);
      setEligibleVaa(_vaa);
      setOpenEnvelopeModal(!openEnvelopeModal);
    }
  };

  const onMint = async () => {
    setIsAvailableOnMint(undefined);
    setIsMinting(false);

    const walletAddress = sourceWallet && sourceWallet.wallet?.walletAddress;

    if (!walletAddress) {
      throw new Error('user wallet is not connected');
    }

    if (!eligibleVaa) {
      throw new Error('mint: no eligible vaa found in users wallet');
    }

    try {
      setIsMinting(true);

      const nftContract = getCooNFTContractInstance();
      const isPublicMintAvailable = await nftContract.publicMintAvailable();

      if (isPublicMintAvailable === false) {
        setIsAvailableOnMint(false);
        throw new Error('mint limit reached');
      } else if (isPublicMintAvailable) {
        setIsAvailableOnMint(true);
      }

      if (sourceWallet.wallet && connectedWallet?.chainId && connectedWallet.walletName) {
        if (connectedWallet?.chainId !== cooNFTMintParams.chainId) {
          // switch network
          const chainName = coalesceChainName(cooNFTMintParams.chainId);
          const cooContractChainName = chainName.charAt(0).toUpperCase() + chainName.slice(1);

          notification.error({
            message: `Please change the network on your wallet to ${cooContractChainName} when prompted and click on Mint again`,
          });

          sourceWallet.connect({ chainId: cooNFTMintParams.chainId, walletName: connectedWallet.walletName });
          throw new Error('invalid network');
        }

        // on mint call
        const signer = sourceWallet.wallet.customProperties.signer;
        const nftContract = getCooNFTContractInstance(signer);
        const tx = await nftContract.mint(Buffer.from(eligibleVaa, 'base64'));

        if (tx) {
          const receipt = await tx.wait();
          console.log('mint: ', receipt);

          // close the mint modal and display the view nft screen
          // resync the contract to get the minted token id
          setOpenEnvelopeModal(false);
          resyncCooContract();
        }
      }
    } catch (e: any) {
      console.error('error minting: ', e);
      if (e.message.includes('user rejected transaction')) {
        notification.error({
          message: parseError(e),
        });
      }
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className={styleContainer}>
      <div className={walletAddressDisplayWrapper}>
        <div className={connectedWalletContainer}>
          {sourceWallet && sourceWallet.wallet
            ? `${addressShortener(sourceWallet.wallet?.walletAddress)}`
            : 'Wallet not connected'}
        </div>
        <ConnectWallet
          sourceWallet={sourceWallet}
          defaultChainId={cooNFTMintParams.chainId}
          onConnectWallet={({ chainId, walletName }) => {
            sourceWallet.connect({ chainId, walletName });
          }}
          onDisconnectWallet={({ chainId, walletName }) => {
            sourceWallet.disconnect({ chainId, walletName });
          }}
        />
      </div>
      <CooNFTSection
        cooContractData={cooContractData}
        txnsData={txnsData}
        sourceWallet={sourceWallet}
        tokenId={cooContractData?.mintedTokenId}
        isContractDataLoading={isContractDataLoading}
        isTxnsDataLoading={isFetchingTxns || isValidatingTxns}
        onOpenViewNFT={setOpenViewNFTModal}
        onOpenEnvelope={onOpenEnvelope}
      />
      <EnvelopeModal
        openModal={openEnvelopeModal}
        isMinting={isMinting}
        isAvailableOnMint={isAvailableOnMint}
        isModalClosable={isMinting ? false : true}
        isCheckWinningVaa={isCheckWinningVaa}
        eligibleVaa={eligibleVaa}
        cooContractData={cooContractData}
        onCloseEmptyEnvelope={() => {
          // after closing the envelope result
          // refetch the transactions to determine the new screen
          setOpenEnvelopeModal(false);
          resyncTxns();
        }}
        onCloseModal={() => setOpenEnvelopeModal(false)}
        onMint={onMint}
      />
      {openViewNFTModal && (
        /* prevent the useHook from calling unnecessary if the modal is not visible */
        <CooViewNFTModal
          openModal={openViewNFTModal}
          tokenId={cooContractData?.mintedTokenId}
          onCloseModal={() => setOpenViewNFTModal(false)}
        />
      )}
    </div>
  );
};

const styleContainer = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${pxToPcVw(16)};
  margin-left: auto;
  margin-right: auto;

  width: ${pxToPcVw(545)};

  @media (max-width: 1024px) {
    width: 100%;
    padding: 0 ${pxToMobileVw(12)};
    gap: ${pxToMobileVw(16)};
  }
`;

const walletAddressDisplayWrapper = css`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: ${pxToPcVw(10)};
  margin-bottom: ${pxToPcVw(20)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(10)};
    margin-bottom: ${pxToMobileVw(20)};
  }
`;

const connectedWalletContainer = css`
  border: solid ${pxToPcVw(2)} var(--color-border);
  border-radius: ${pxToPcVw(8)};
  padding: ${pxToPcVw(8)} ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    border: solid ${pxToMobileVw(2)} var(--color-border);
    border-radius: ${pxToMobileVw(8)};
    padding: ${pxToMobileVw(8)} ${pxToMobileVw(16)};
  }
`;
