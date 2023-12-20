import React, { useLayoutEffect, useState } from 'react';
import { css, cx } from '@linaria/core';
import { Button, notification } from 'antd';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { getChainCache } from '../../utils/chainCache';
import { CarrierChainId } from '../../utils/consts';
import { SourceSelect } from '../RecoverySetup/SourceSelect';
import { TransactionIdInput } from '../RecoverySetup/TransactionIdInput';
import { useAction } from '../../hooks/useAction';
import { api } from '../../utils/http/api';

export enum TransactionType {
  Transfer,
  Redemption,
}

async function syncTransaction(data: { type: TransactionType; chainId: CarrierChainId; hash: string }) {
  const { type, chainId, hash } = data;

  await api.indexer.apiV1TransactionsSyncPost({ apiV1TransactionsSyncPostRequest: { type, chainId, hash } });

  notification.success({ message: 'Transaction index request is in queue' });

  history.back();
}

export const SyncTransaction: React.SFC = () => {
  const chainAndWalletCache = getChainCache();
  const [type, setType] = useState<TransactionType>(TransactionType.Transfer);
  const [chainId, setChainId] = useState<CarrierChainId>(chainAndWalletCache.sourceChainId);
  const [txHash, setTxHash] = useState<string>();

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

  const { triggerer, loading } = useAction(syncTransaction);

  return (
    <div className={redeemSetupContainer}>
      <article className={setupArticle}>
        <h1>Manually index your transaction</h1>
        <p>
          If you can't find transaction in the transaction histroy, you can submit the transaction hash to index your
          transaction manually. Select the source chain and input the transaction ID.
        </p>
      </article>

      <div className={setupWrapper}>
        <div className={styleRadioGroup}>
          <div
            className={cx(styleRadio, type === TransactionType.Transfer ? styleRadioActived : undefined)}
            onClick={() => {
              setType(TransactionType.Transfer);
            }}>
            Transfer
          </div>
          <div
            className={cx(styleRadio, type === TransactionType.Redemption ? styleRadioActived : undefined)}
            onClick={() => {
              setType(TransactionType.Redemption);
            }}>
            Redemption
          </div>
        </div>

        <div className={inputGroup}>
          <SourceSelect
            label="Chain"
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
          loading={loading}
          type="primary"
          onClick={() => {
            if (txHash) {
              triggerer({ type, chainId, hash: txHash });
            }
          }}>
          Manually index transaction
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

const styleRadioGroup = css`
  display: flex;
  align-items: center;
  gap: ${pxToPcVw(10)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(10)};
  }
`;

const styleRadio = css`
  display: flex;
  align-items: center;
  color: var(--color-text-3);
  cursor: pointer;
  font-weight: 400;
  font-size: ${pxToPcVw(16)};
  height: ${pxToPcVw(36)};
  padding-inline: ${pxToPcVw(12)};
  border-radius: ${pxToPcVw(18)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(16)};
    height: ${pxToMobileVw(36)};
    padding-inline: ${pxToMobileVw(12)};
    border-radius: ${pxToMobileVw(18)};
  }
`;

const styleRadioActived = css`
  font-weight: 500;
  color: #fff;
  background-color: var(--ant-primary-color);
`;
