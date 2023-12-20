import React, { useLayoutEffect, useState } from 'react';
import { css } from '@linaria/core';
import { Button } from 'antd';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { SourceSelect } from './SourceSelect';
import { TransactionIdInput } from './TransactionIdInput';
import { getChainCache } from '../../utils/chainCache';
import { useNavigate } from 'react-router-dom';
import { routes } from '../../utils/routes';
import { CarrierChainId } from '../../utils/consts';

export const RecoverySetup: React.SFC = () => {
  const chainAndWalletCache = getChainCache();
  const [chainId, setChainId] = useState<CarrierChainId>(chainAndWalletCache.sourceChainId);
  const [txHash, setTxHash] = useState<string>();
  const navigate = useNavigate();

  useLayoutEffect(() => {
    function scrollToTop() {
      window.scrollTo(0, 0);
    }

    scrollToTop();

    // Set scroll restoration to manual so the page will also start from top
    // when it was refreshed.
    if (window.history.scrollRestoration) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  return (
    <div className={redeemSetupContainer}>
      <article className={setupArticle}>
        <h1>Manually redeem your transaction</h1>
        <p>
          If you didn't use the relayer for bridge transaction, you can submit the redemption transaction to destination
          chain manually. Select the source chain and input the transaction ID.
        </p>
      </article>

      <div className={setupWrapper}>
        <div className={inputGroup}>
          <SourceSelect
            chainId={chainId}
            onSelectChain={({ chainId }) => {
              setChainId(chainId);
            }}
          />
        </div>

        <div className={inputGroup}>
          <TransactionIdInput
            chainId={chainId}
            onTransactionIdChange={(txHash) => {
              setTxHash(txHash);
            }}
          />
        </div>

        <Button
          className={redeemSubmitButton}
          disabled={!txHash}
          type="primary"
          onClick={() => {
            if (txHash) {
              navigate(routes.progress.getPath({ chainId, txHash }, { enableManualRedemption: true }));
            }
          }}>
          Manually redeem transaction
        </Button>
      </div>
    </div>
  );
};

const redeemSetupContainer = css`
  display: flex;
  flex-direction: column;
  margin-inline: auto;
  width: ${pxToPcVw(588)};
  gap: ${pxToPcVw(24)};

  @media (max-width: 1024px) {
    width: 100%;
    gap: ${pxToMobileVw(16)};
    padding-inline: ${pxToMobileVw(12)};
  }
`;

const setupArticle = css`
  display: flex;
  flex-direction: column;
  gap: ${pxToPcVw(16)};

  > * {
    margin: 0;
  }

  > h1 {
    font-weight: 600;
    font-size: ${pxToPcVw(24)};
    line-height: 1.1666;
    color: #fff;
  }

  > p {
    font-weight: 400;
    font-size: ${pxToPcVw(16)};
    line-height: 1.25;
    color: var(--color-text-3);
  }

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(16)};

    > h1 {
      font-size: ${pxToMobileVw(24)};
    }

    > p {
      font-size: ${pxToMobileVw(16)};
    }
  }
`;

const setupWrapper = css`
  display: flex;
  flex-direction: column;
  gap: ${pxToPcVw(24)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(24)};
  }
`;

const inputGroup = css`
  display: flex;
  flex-direction: column;
  gap: ${pxToPcVw(12)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(12)};
  }
`;

const redeemSubmitButton = css`
  appearance: none;
  border: 0;
  background-color: var(--ant-primary-4);
  font-weight: 600;
  line-height: 1.5;
  color: #fff;
  cursor: pointer;
  font-size: ${pxToPcVw(16)};
  border-radius: ${pxToPcVw(8)};
  padding: ${pxToPcVw(16)};
  height: ${pxToPcVw(56)};

  &:disabled {
    cursor: not-allowed;
    background-color: var(--ant-primary-color) !important;
    color: var(--ant-background) !important;
  }

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(16)};
    border-radius: ${pxToMobileVw(8)};
    padding: ${pxToMobileVw(16)};
    height: ${pxToMobileVw(56)};
  }
`;
