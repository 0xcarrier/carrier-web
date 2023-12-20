import React, { useState } from 'react';

import { css, cx } from '@linaria/core';

import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { HintMessage } from '../common/HintMessage';
import { CHAIN_ID_SOLANA } from '@certusone/wormhole-sdk';
import { useData } from '../../hooks/useData';
import { getEvmProviderWithWormholeChainId, isCarrierEVMChain } from '../../utils/web3Utils';
import { getSolanaConnection } from '../../utils/solana';
import debounce from 'lodash/debounce';
import { CarrierChainId } from '../../utils/consts';

interface Props {
  chainId: CarrierChainId;
  onTransactionIdChange: (txHash: string) => void;
}

export const TransactionIdInput = ({ chainId, onTransactionIdChange }: Props) => {
  const [inputValue, setInputValue] = useState<string>('');
  const [error, setError] = useState<string>();
  const [isTouched, setTouched] = useState<boolean>(false);

  useData(
    async (signal) => {
      await debouncedVerifyTxHash(signal, { chainId, inputValue, isTouched, setError, onTransactionIdChange });
    },
    [chainId, inputValue, isTouched, setError, onTransactionIdChange],
  );

  return (
    <>
      <div className={inputLabel}>Transaction ID</div>

      <div className={cx(inputTextWithLoading, error ? inputTextError : undefined)}>
        <input
          value={inputValue}
          onChange={(e) => {
            const value = e.currentTarget.value;

            setInputValue(!!value ? value.trim() : '');

            if (!isTouched) {
              setTouched(true);
            }
          }}
          onBlur={() => {
            if (!isTouched) {
              setTouched(true);
            }
          }}
        />
      </div>

      {error ? <HintMessage type="error" message={error} /> : null}
    </>
  );
};

const debouncedVerifyTxHash = debounce(
  async (
    signal: AbortSignal,
    data: {
      chainId: CarrierChainId;
      inputValue: string;
      isTouched: boolean;
      setError: React.Dispatch<string | undefined>;
      onTransactionIdChange: (txHash: string) => void;
    },
  ) => {
    const { chainId, inputValue, isTouched, setError, onTransactionIdChange } = data;

    if (isTouched) {
      if (!inputValue) {
        if (!signal.aborted) {
          setError('Transaction ID cannot be empty.');
          onTransactionIdChange('');
        }
      } else {
        let addressIsInvalid = false;

        if (isCarrierEVMChain(chainId)) {
          try {
            const provider = getEvmProviderWithWormholeChainId(chainId);
            const receipt = await provider.getTransactionReceipt(inputValue);

            addressIsInvalid = !receipt.blockNumber;
          } catch (e) {
            console.error(e);
            addressIsInvalid = true;
          }
        } else if (chainId === CHAIN_ID_SOLANA) {
          try {
            const connection = getSolanaConnection();
            const result = await connection.getSignatureStatus(inputValue, {
              searchTransactionHistory: true,
            });
            addressIsInvalid = !result.value?.confirmationStatus;
          } catch (e) {
            console.log(e);
            addressIsInvalid = true;
          }
        }

        if (!signal.aborted) {
          if (addressIsInvalid) {
            setError('Transaction ID is invalid.');
            onTransactionIdChange('');
          } else {
            setError(undefined);
            onTransactionIdChange(inputValue);
          }
        }
      }
    }
  },
  1000,
  { leading: false },
);

const inputLabel = css`
  font-weight: 500;
  line-height: 1.25;
  font-size: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(16)};
  }
`;

const inputTextWithLoading = css`
  display: flex;
  flex-direction: row;
  align-items: center;
  overflow: hidden;
  gap: ${pxToPcVw(10)};
  border: ${pxToPcVw(2)} solid #2d41a7;
  border-radius: ${pxToPcVw(8)};
  padding-right: ${pxToPcVw(16)};

  > input {
    flex: 1;
    appearance: none;
    background-color: transparent;
    padding-block: ${pxToPcVw(16)};
    padding-inline: ${pxToPcVw(16)} 0;
    height: ${pxToPcVw(52)};
    border: 0;
    font-weight: 500;
    font-size: ${pxToPcVw(16)};
    line-height: ${pxToPcVw(20)};
    color: #fff;
    outline: none;
  }

  > div {
  }

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(10)};
    border: ${pxToMobileVw(2)} solid #2d41a7;
    border-radius: ${pxToMobileVw(8)};
    padding-right: ${pxToMobileVw(16)};

    > input {
      padding-block: ${pxToMobileVw(16)};
      padding-inline: ${pxToMobileVw(16)} 0;
      height: ${pxToMobileVw(52)};
      font-size: ${pxToMobileVw(16)};
      line-height: ${pxToMobileVw(20)};
    }
  }
`;

const inputTextError = css`
  border-color: #ff6868;
  background-color: #4f0a0a;
`;
