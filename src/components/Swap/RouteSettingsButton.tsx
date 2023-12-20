import { css, cx } from '@linaria/core';
import React, { useState } from 'react';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { Modal } from '../common/Modal';
import { SVGIcon, SVGIconName } from '../common/SVGIcon';
import { Button } from '../common/Button';
import { DataResult } from '../../hooks/useData';
import { FeeData, RouteSettingsData } from './hooks/useRouteSettings';
import { Loading } from '../common/Loading';
import { RadioGroup } from '../common/Radio';
import { formatAmount } from '../../utils/format-amount';
import { ethers } from 'ethers';
import { TokenData } from '../../utils/tokenData/helper';
import BigNumber from 'bignumber.js';
import { Spinner } from '../common/Spinner';
import { CurrencyIcon } from '../common/CurrencyIcon';
import Tooltip from '../common/Tooltip';
import { ApiV1WormholeXswapPost200Response, XSwapHopDexEnum } from '../../indexer-client';
import { DexIcon } from '../common/DexIcon';
import { HintMessage } from '../common/HintMessage';
import { A } from '../common/A';
import { CarrierChainId } from '../../utils/consts';

interface Props {
  className?: string;
  selectedRouterIndex: number;
  routeSettings: DataResult<RouteSettingsData | undefined>;
  sourceToken?: TokenData;
  targetToken?: TokenData;
}

export const RouteSettingsButton: React.SFC<Props> = ({
  className,
  selectedRouterIndex,
  routeSettings,
  sourceToken,
  targetToken,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <>
      <Button className={styleButton} type="tertiary" onClick={() => setIsVisible(!isVisible)}>
        <SVGIcon className={styleIcon} iconName="arrow-uturn-right" /> Route options
      </Button>
      <RouteSettingsModal
        className={className}
        visible={isVisible}
        selectedRouterIndex={selectedRouterIndex}
        routeSettings={routeSettings}
        sourceToken={sourceToken}
        targetToken={targetToken}
        onVisibleChanged={(visible) => {
          setIsVisible(visible);
        }}
      />
    </>
  );
};

export enum RouteOptionType {
  Recommended,
  Manual,
}

interface ModalProps {
  className?: string;
  visible?: boolean;
  selectedRouterIndex: number;
  routeSettings: DataResult<RouteSettingsData | undefined>;
  sourceToken?: TokenData;
  targetToken?: TokenData;
  onVisibleChanged: (visible: boolean) => void;
}

export const RouteSettingsModal: React.SFC<ModalProps> = ({
  className,
  visible,
  selectedRouterIndex,
  routeSettings,
  sourceToken,
  targetToken,
  onVisibleChanged,
}) => {
  const [routeOptionType, setRouteOptionType] = useState(RouteOptionType.Recommended);

  return (
    <Modal
      maskClosable={true}
      open={visible}
      modalClassName={styleModal}
      title="Route Options"
      onCancel={() => onVisibleChanged(false)}>
      <Loading
        options={routeSettings}
        renderError={({ error, retry }) => {
          return (
            <HintMessage
              className={{ wrapper: styleTipsContainer }}
              type="error"
              message={
                <>
                  Load route options failed. <A onClick={retry}>Retry</A>
                </>
              }
            />
          );
        }}
        renderLoading={() => {
          return (
            <div className={styleTipsContainer}>
              <Spinner />
            </div>
          );
        }}
        render={(data) => {
          return !data || !sourceToken || !targetToken ? (
            <div className={styleTipsContainer}>No route options yet, please select token and input amount first</div>
          ) : (
            <div className={styleContent}>
              <div className={styleTotalValueRow}>
                <div className={styleTotalValueLeftColumn}>
                  <div className={styleTotalValue}>
                    {renderEstimatedReceivedAmount({
                      targetTokenDecimals: targetToken.decimals,
                      targetTokenSymbol: targetToken.symbol,
                      selectedRouterIndex,
                      indexerSwapData: data.indexerSwapData,
                    })}
                  </div>
                  <div className={styleNetValueText}>Net Value</div>
                  {routeOptionType === RouteOptionType.Recommended ? (
                    <div className={styleTag}>Best value</div>
                  ) : (
                    <div className={cx(styleTag, styleTagPersonalized)}>Personalized</div>
                  )}
                </div>
                <div className={styleRadio}>
                  <RadioGroup
                    disabled
                    options={[
                      { label: 'Recommended', value: RouteOptionType.Recommended },
                      { label: 'Manual', value: RouteOptionType.Manual },
                    ]}
                    value={routeOptionType}
                    onChange={(e) => {
                      setRouteOptionType(e.target.value);
                    }}
                  />
                </div>
              </div>
              {renderRouterSection({ selectedRouterIndex, routerSettings: data })}
              <div className={styleSummaryRow}>
                <div className={styleSummaryLeftColumn}>
                  <div className={styleSummaryAmount}>
                    <CurrencyIcon src={sourceToken.logo} symbol={sourceToken.symbol} />
                    {renderSendingAmount({
                      sourceTokenDecimals: sourceToken.decimals,
                      sourceTokenSymbol: sourceToken.symbol,
                      selectedRouterIndex,
                      indexerSwapData: data.indexerSwapData,
                    })}
                  </div>
                  <div className={styleEqualMark}>≈</div>
                  <div className={styleSummaryAmount}>
                    <CurrencyIcon src={targetToken.logo} symbol={targetToken.symbol} />
                    {renderEstimatedReceivedAmount({
                      targetTokenDecimals: targetToken.decimals,
                      targetTokenSymbol: targetToken.symbol,
                      selectedRouterIndex,
                      indexerSwapData: data.indexerSwapData,
                    })}
                  </div>
                </div>
                {renderFee({
                  gasFee: {
                    inWei: Object.values(data.gasFees)
                      .map((item) => item.inWei)
                      .reduce((prev, current) => prev.add(current), ethers.BigNumber.from(0)),
                    inUSD: Object.values(data.gasFees)
                      .map((item) => item.inUSD)
                      .reduce((prev, current) => prev.plus(current), BigNumber(0)),
                  },
                  providerFee: data.indexerSwapData.routes[selectedRouterIndex]?.hops
                    ?.map((item) => BigNumber(item.providerFee))
                    .reduce((prev, current) => prev.plus(current), BigNumber(0))
                    .toString(),
                  gasFeeTips: 'Total gas fee',
                  providerFeeTips: 'Total provider fee',
                  gasFeeIcon: 'estimated-gas-total',
                  providerFeeIcon: 'money-total',
                })}
              </div>
            </div>
          );
        }}
      />
    </Modal>
  );
};

function renderRouterSection(options: { selectedRouterIndex: number; routerSettings: RouteSettingsData }) {
  const { selectedRouterIndex, routerSettings } = options;
  const { indexerSwapData, tokenInfos, gasFees } = routerSettings;
  const selectedRouter = indexerSwapData.routes[selectedRouterIndex];

  if (!selectedRouter || !selectedRouter.hops || !selectedRouter.hops.length) {
    return (
      <div className={cx(styleTipsContainer, styleRouterUnavailableTips)}>
        {indexerSwapData.routes.length === 0
          ? 'No available router, please select another token pair'
          : 'This router is unavailable, please select another router'}
      </div>
    );
  }

  const firstHop = selectedRouter.hops[0];
  const transitHops =
    selectedRouter.hops.length > 2 ? selectedRouter.hops.slice(1, selectedRouter.hops.length - 1) : undefined;
  const lastHop = selectedRouter.hops[selectedRouter.hops.length - 1];

  return (
    <>
      {renderDexRow({
        title: 'Source chain DEX',
        gasFeeTips: 'Source chain gas fee',
        providerFeeTips: 'Source chain provider fee',
        fromToken: getTokenInfo({
          tokenAddress: firstHop.tokenIn.address,
          chainId: firstHop.tokenIn.chain as CarrierChainId,
          tokenInfos: tokenInfos,
        }),
        toToken: getTokenInfo({
          tokenAddress: firstHop.tokenOut.address,
          chainId: firstHop.tokenOut.chain as CarrierChainId,
          tokenInfos: tokenInfos,
        }),
        dexName: firstHop.dex,
        gasFee: gasFees[firstHop.tokenIn.chain],
        providerFee: firstHop.providerFee,
      })}
      {transitHops
        ? transitHops.map((item) => {
            return (
              <React.Fragment
                key={`${item.tokenIn.chain}-${item.tokenIn.address}-${item.tokenOut.chain}-${item.tokenOut.address}`}>
                {renderDexRow({
                  title: 'Transit DEX',
                  gasFeeTips: 'Transit gas fee',
                  providerFeeTips: 'Transit provider fee',
                  fromToken: getTokenInfo({
                    tokenAddress: item.tokenIn.address,
                    chainId: item.tokenIn.chain as CarrierChainId,
                    tokenInfos: tokenInfos,
                  }),
                  toToken: getTokenInfo({
                    tokenAddress: item.tokenOut.address,
                    chainId: item.tokenOut.chain as CarrierChainId,
                    tokenInfos: tokenInfos,
                  }),
                  dexName: item.dex,
                  gasFee: gasFees[item.tokenIn.chain],
                  providerFee: item.providerFee,
                })}
              </React.Fragment>
            );
          })
        : null}
      {renderDexRow({
        title: 'Destination chain DEX',
        gasFeeTips: 'Destination chain gas fee',
        providerFeeTips: 'Destination chain provider fee',
        fromToken: getTokenInfo({
          tokenAddress: lastHop.tokenIn.address,
          chainId: lastHop.tokenIn.chain as CarrierChainId,
          tokenInfos: tokenInfos,
        }),
        toToken: getTokenInfo({
          tokenAddress: lastHop.tokenOut.address,
          chainId: lastHop.tokenOut.chain as CarrierChainId,
          tokenInfos: tokenInfos,
        }),
        dexName: lastHop.dex,
        gasFee: gasFees[lastHop.tokenIn.chain],
        providerFee: lastHop.providerFee,
      })}
    </>
  );
}

function renderFee(options: {
  gasFee?: FeeData;
  providerFee?: string;
  gasFeeTips: string;
  providerFeeTips: string;
  gasFeeIcon?: SVGIconName;
  providerFeeIcon?: SVGIconName;
}) {
  const { gasFee, providerFee, gasFeeTips, providerFeeTips, gasFeeIcon, providerFeeIcon } = options;

  return (
    <div className={styleFeeContainer}>
      {gasFee ? (
        <Tooltip
          disableIcon
          tooltipText={gasFeeTips}
          content={
            <div className={styleFee}>
              <SVGIcon className={styleDexGasIcon} iconName={gasFeeIcon || 'estimated-gas'} />
              {formatAmount(gasFee.inUSD, { decimals: 2, prefixUnit: true, unit: '$', compactUnit: true })}
            </div>
          }
        />
      ) : null}
      {providerFee ? (
        <Tooltip
          disableIcon
          tooltipText={providerFeeTips}
          content={
            <div className={styleFee}>
              <SVGIcon className={styleDexMoneyIcon} iconName={providerFeeIcon || 'money'} />
              {formatAmount(BigNumber(providerFee), { decimals: 2, prefixUnit: true, unit: '$', compactUnit: true })}
            </div>
          }
        />
      ) : null}
    </div>
  );
}

function renderDexRow(options: {
  title: string;
  gasFeeTips: string;
  providerFeeTips: string;
  fromToken?: TokenData;
  toToken?: TokenData;
  dexName?: XSwapHopDexEnum;
  gasFee: FeeData;
  providerFee: string;
}) {
  const { title, gasFeeTips, providerFeeTips, fromToken, toToken, dexName, gasFee, providerFee } = options;

  return (
    <div className={styleDexRow}>
      <div className={styleDexTitle}>{title}</div>
      <div className={styleDexContent}>
        <div className={styleDexContentLeftColumn}>
          <div className={styleDexSelector}>
            <DexIcon className={styleDexSelectorIcon} dexName={dexName} />
            <div className={styleDexSelectorName}>
              {dexName === XSwapHopDexEnum.Quickswap
                ? 'Quickswap'
                : dexName === XSwapHopDexEnum.UniswapV2
                ? 'Uniswap V2'
                : 'Unknown Dex'}
            </div>
            <SVGIcon className={styleDexSelectorChevronDownIcon} iconName="chevron-down" />
          </div>
          {fromToken ? (
            <CurrencyIcon className={styleDexCurrencyIcon} src={fromToken.logo} symbol={fromToken.symbol} />
          ) : null}
          {fromToken || toToken ? <SVGIcon className={styleDexArrowIcon} iconName="arrow-right" /> : null}
          {toToken ? (
            <CurrencyIcon className={styleDexCurrencyIcon} src={toToken.logo} symbol={toToken.symbol} />
          ) : null}
        </div>
        {renderFee({ gasFee, providerFee, gasFeeTips, providerFeeTips })}
      </div>
    </div>
  );
}

function renderSendingAmount(options: {
  sourceTokenDecimals: number;
  sourceTokenSymbol?: string;
  selectedRouterIndex: number;
  indexerSwapData: ApiV1WormholeXswapPost200Response;
}) {
  const { sourceTokenDecimals, sourceTokenSymbol, selectedRouterIndex, indexerSwapData } = options;
  const selectedRoute = indexerSwapData.routes[selectedRouterIndex];

  if (selectedRoute && selectedRoute.hops && selectedRoute.hops.length) {
    const amount = selectedRoute.hops[0].tokenIn.amount;
    const amountBigNumber = BigNumber(ethers.utils.formatUnits(amount, sourceTokenDecimals).toString());

    return formatAmount(amountBigNumber, { unit: sourceTokenSymbol || 'Unknown' });
  }

  return 'N/A';
}

function renderEstimatedReceivedAmount(options: {
  targetTokenDecimals: number;
  targetTokenSymbol?: string;
  selectedRouterIndex: number;
  indexerSwapData: ApiV1WormholeXswapPost200Response;
}) {
  const { targetTokenDecimals, targetTokenSymbol, selectedRouterIndex, indexerSwapData } = options;
  const selectedRoute = indexerSwapData.routes[selectedRouterIndex];

  if (selectedRoute && selectedRoute.hops && selectedRoute.hops.length) {
    const amount = selectedRoute.hops[selectedRoute.hops.length - 1].tokenOut.amount;
    const amountBigNumber = BigNumber(ethers.utils.formatUnits(amount, targetTokenDecimals).toString());

    return formatAmount(amountBigNumber, { unit: targetTokenSymbol || 'Unknown' });
  }

  return 'N/A';
}

function getTokenInfo(options: {
  chainId: CarrierChainId;
  tokenAddress: string;
  tokenInfos: {
    chainId: CarrierChainId;
    parsedTokenAccounts: TokenData[];
    errors: {
      tokenAddress: string;
      error: Error;
    }[];
  }[];
}) {
  const { chainId, tokenAddress, tokenInfos } = options;

  const tokenChain = tokenInfos.find((item) => item.chainId === chainId);
  const token = tokenChain?.parsedTokenAccounts.find(
    (item) => item.tokenAddress.toLowerCase() === tokenAddress.toLowerCase(),
  );

  return token;
}

const styleButton = css`
  display: flex;
  align-items: center;
  height: ${pxToPcVw(44)};
  border: ${pxToPcVw(2)} solid var(--color-border);
  border-radius: ${pxToPcVw(8)};
  padding-inline: ${pxToPcVw(12)};
  gap: ${pxToPcVw(10)};

  color: #fff;
  font-weight: 600;
  font-size: ${pxToPcVw(14)};
  line-height: ${pxToPcVw(20)};

  &:hover {
    color: #fff;
  }

  @media (max-width: 1024px) {
    height: ${pxToMobileVw(44)};
    border: ${pxToMobileVw(2)} solid var(--color-border);
    border-radius: ${pxToMobileVw(8)};
    padding-inline: ${pxToMobileVw(12)};
    gap: ${pxToMobileVw(10)};
    margin-left: auto;

    font-size: ${pxToMobileVw(14)};
    line-height: ${pxToMobileVw(20)};
  }
`;

const styleIcon = css`
  width: ${pxToPcVw(15)};
  height: ${pxToPcVw(15)};

  * {
    fill: var(--ant-primary-4);
  }

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(15)};
    height: ${pxToMobileVw(15)};
  }
`;

const styleModal = css`
  width: ${pxToPcVw(674)};

  @media (max-width: 1024px) {
    width: 100%;
    height: 100%;
  }
`;

const styleContent = css`
  flex-grow: 1;
  flex-shrink: 1;
  display: flex;
  flex-direction: column;
  overflow: auto;
`;

const styleTipsContainer = css`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    padding: ${pxToMobileVw(16)};
  }
`;

const styleRouterUnavailableTips = css`
  padding-bottom: 0;
`;

const styleTotalValueRow = css`
  display: flex;
  align-items: center;
  padding: ${pxToPcVw(16)};
  border-bottom: solid ${pxToPcVw(2)} var(--color-border);

  @media (max-width: 1024px) {
    flex-direction: column;
    align-items: flex-start;
    gap: ${pxToPcVw(16)};
    padding: ${pxToMobileVw(16)};
    border-bottom: solid ${pxToMobileVw(2)} var(--color-border);
  }
`;

const styleTotalValueLeftColumn = css`
  display: flex;
  align-items: center;
  gap: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(8)};
  }
`;

const styleTotalValue = css`
  color: #fff;
  font-weight: 500;
  line-height: 1.1em;
  font-size: ${pxToPcVw(20)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(20)};
  }
`;

const styleNetValueText = css`
  color: var(--color-text-3);
  font-weight: 500;
  line-height: 1.2em;
  font-size: ${pxToPcVw(14)};
  white-space: nowrap;

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(14)};
  }
`;

const styleTag = css`
  display: flex;
  align-items: center;
  color: #fff;
  font-weight: 500;
  background: linear-gradient(180deg, #534bb1 0%, #551bf9 100%);
  padding-inline: ${pxToPcVw(8)};
  font-size: ${pxToPcVw(12)};
  height: ${pxToPcVw(23)};
  border-radius: ${pxToPcVw(12)};
  white-space: nowrap;

  @media (max-width: 1024px) {
    padding-inline: ${pxToMobileVw(8)};
    font-size: ${pxToMobileVw(12)};
    height: ${pxToMobileVw(23)};
    border-radius: ${pxToMobileVw(12)};
  }
`;

const styleTagPersonalized = css`
  background: linear-gradient(180deg, #af4bb1 0%, #f91bae 100%);
`;

const styleRadio = css`
  margin-left: auto;

  @media (max-width: 1024px) {
    margin-left: 0;
  }
`;

const styleSummaryRow = css`
  display: flex;
  align-items: center;
  border-top: solid ${pxToPcVw(2)} var(--color-border);
  margin-top: ${pxToPcVw(16)};
  padding: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    flex-direction: column;
    align-items: flex-start;
    gap: ${pxToMobileVw(16)};
    border-top: solid ${pxToMobileVw(2)} var(--color-border);
    margin-top: ${pxToMobileVw(16)};
    padding: ${pxToMobileVw(16)};
  }
`;

const styleSummaryLeftColumn = css`
  display: flex;
  align-items: center;
`;

const styleDexRow = css`
  display: flex;
  flex-direction: column;
  gap: ${pxToPcVw(12)};
  margin: ${pxToPcVw(16)} ${pxToPcVw(16)} 0;

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(12)};
    margin: ${pxToMobileVw(16)} ${pxToMobileVw(16)} 0;
  }
`;

const styleDexTitle = css`
  font-weight: 500;
  color: #fff;
  font-size: ${pxToPcVw(14)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(14)};
  }
`;

const styleDexContent = css`
  display: flex;
  align-items: center;

  @media (max-width: 1024px) {
    flex-direction: column;
    align-items: flex-start;
    gap: ${pxToMobileVw(16)};
  }
`;

const styleDexContentLeftColumn = css`
  display: flex;
  align-items: center;
`;

const styleDexSelector = css`
  display: flex;
  align-items: center;
  opacity: 0.5;
  gap: ${pxToPcVw(8)};
  border: solid ${pxToPcVw(2)} var(--color-border);
  border-radius: ${pxToPcVw(8)};
  padding: ${pxToPcVw(8)};
  margin-right: ${pxToPcVw(16)};
  width: ${pxToPcVw(180)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(8)};
    border: solid ${pxToMobileVw(2)} var(--color-border);
    border-radius: ${pxToMobileVw(8)};
    padding: ${pxToMobileVw(8)};
    margin-right: ${pxToMobileVw(16)};
    width: ${pxToMobileVw(180)};
  }
`;

const styleDexSelectorIcon = css`
  width: ${pxToPcVw(24)};
  height: ${pxToPcVw(24)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(24)};
    height: ${pxToMobileVw(24)};
  }
`;

const styleDexSelectorName = css`
  font-weight: 500;
  color: #fff;
  font-size: ${pxToPcVw(14)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(14)};
  }
`;

const styleDexSelectorChevronDownIcon = css`
  margin-left: auto;
  width: ${pxToPcVw(10)};
  height: ${pxToPcVw(6)};

  & > * {
    fill: #fff;
  }

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(10)};
    height: ${pxToMobileVw(6)};
  }
`;

const styleDexCurrencyIcon = css`
  width: ${pxToPcVw(32)};
  height: ${pxToPcVw(32)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(32)};
    height: ${pxToMobileVw(32)};
  }
`;

const styleDexArrowIcon = css`
  width: ${pxToPcVw(20)};
  height: ${pxToPcVw(18)};
  margin-inline: ${pxToPcVw(18)};

  & > * {
    fill: var(--ant-primary-4);
  }

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(20)};
    height: ${pxToMobileVw(18)};
    margin-inline: ${pxToMobileVw(18)};
  }
`;

const styleFeeContainer = css`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: ${pxToPcVw(18)};

  @media (max-width: 1024px) {
    margin-left: 0;
    gap: ${pxToMobileVw(18)};
  }
`;

const styleFee = css`
  display: flex;
  align-items: center;
  gap: ${pxToPcVw(12)};
  font-size: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(12)};
    font-size: ${pxToMobileVw(16)};
  }
`;

const styleDexGasIcon = css`
  width: ${pxToPcVw(15)};
  height: ${pxToPcVw(18)};

  & > * {
    fill: var(--ant-primary-4);
  }

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(15)};
    height: ${pxToMobileVw(18)};
  }
`;

const styleDexMoneyIcon = css`
  width: ${pxToPcVw(18)};
  height: ${pxToPcVw(18)};

  & > * {
    fill: var(--ant-primary-4);
  }

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(18)};
    height: ${pxToMobileVw(18)};
  }
`;

const styleSummaryAmount = css`
  display: flex;
  align-items: center;
  font-weight: 500;
  color: #fff;
  font-size: ${pxToPcVw(16)};
  gap: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(16)};
    gap: ${pxToMobileVw(8)};
  }
`;

const styleEqualMark = css`
  font-weight: 500;
  color: #fff;
  font-size: ${pxToPcVw(20)};
  margin-inline: ${pxToPcVw(12)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(20)};
    margin-inline: ${pxToMobileVw(12)};
  }
`;
