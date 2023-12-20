import React, { useEffect, useRef, useState } from 'react';
import { SlippageToleranceData, defaultSlippageTolerances } from './hooks/useSlippageTolerance';
import Tooltip from '../common/Tooltip';
import { css, cx } from '@linaria/core';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { SVGIcon } from '../common/SVGIcon';
import { Modal } from 'antd';
import { formatAmount } from '../../utils/format-amount';
import { Button } from '../common/Button';

interface Props {
  slippageTolerance: SlippageToleranceData;
}

export const SlippageTolerance: React.SFC<Props> = ({ slippageTolerance }) => {
  const [open, setOpen] = useState(false);
  const [settingModalVisible, setSettingModalVisible] = useState(false);
  const [buttonPosition, setButtonPosition] = useState<DOMRect>();
  const buttonRef = useRef<HTMLDivElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);
  const [selectedSlippageTolerance, setSelectedSlippageTolerance] = useState<number>();
  const [customInputVisible, setCustomInputVisible] = useState(false);
  const [customInputValue, setCustomInputValue] = useState('');

  useEffect(() => {
    if (settingModalVisible) {
      if (!defaultSlippageTolerances.includes(slippageTolerance.slippageTolerance)) {
        setCustomInputValue(formatSlippageTolerance(slippageTolerance.slippageTolerance, true));
        setCustomInputVisible(true);
        setSelectedSlippageTolerance(undefined);
      } else {
        setCustomInputValue('');
        setCustomInputVisible(false);
        setSelectedSlippageTolerance(slippageTolerance.slippageTolerance);
      }
    }
  }, [settingModalVisible]);

  useEffect(() => {
    if (customInputVisible && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [customInputVisible]);

  function closeModal() {
    setSettingModalVisible(false);
  }

  function save() {
    if (customInputVisible && !selectedSlippageTolerance) {
      const customInputValueParsed = parseFloat(customInputValue);

      if (!isNaN(customInputValueParsed)) {
        slippageTolerance.setSlippageTolerance(customInputValueParsed / 100);
      }
    } else if (selectedSlippageTolerance) {
      slippageTolerance.setSlippageTolerance(selectedSlippageTolerance);
    }

    setSettingModalVisible(false);
  }

  return (
    <>
      <Tooltip
        trigger={['hover']}
        open={open}
        disableIcon={true}
        tooltipText="Slippage tolerance"
        content={
          <div
            ref={buttonRef}
            className={cx(FlexRow, settingModalVisible ? styleFlexRowActived : undefined)}
            onClick={(e) => {
              const rect = buttonRef.current?.getBoundingClientRect();
              const visible = !settingModalVisible;

              setButtonPosition(rect);
              setSettingModalVisible(visible);

              if (visible) {
                setOpen(false);
              }
            }}>
            <SVGIcon className={styleIcon} iconName="slippage" />
            <div className={LightFont}>{formatSlippageTolerance(slippageTolerance.slippageTolerance)}</div>
            <SVGIcon className={styleChevronDownIcon} iconName="chevron-down" />
          </div>
        }
        onOpenChange={(open) => {
          if (!settingModalVisible) {
            setOpen(open);
          }
        }}
      />
      <Modal
        open={settingModalVisible}
        className={styleModalContainer}
        maskClosable={true}
        destroyOnClose
        modalRender={() => {
          return (
            <div
              className={styleModal}
              style={
                buttonPosition
                  ? { left: buttonPosition.left + buttonPosition.width / 2, top: buttonPosition.top }
                  : undefined
              }>
              <div className={styleTitle}>
                <SVGIcon className={styleTitleIcon} iconName="slippage" />
                Slippage tolerance
                <div
                  className={CloseIconStyle}
                  onClick={(e) => {
                    closeModal();
                  }}>
                  <SVGIcon className={styleCloseIcon} iconName="close" />
                </div>
              </div>
              <div className={styleSlippageTolerances}>
                {defaultSlippageTolerances.map((item) => {
                  return (
                    <div
                      key={item}
                      className={cx(
                        styleSlippageTolerance,
                        item === selectedSlippageTolerance ? styleSlippageToleranceActived : undefined,
                      )}
                      onClick={() => {
                        setSelectedSlippageTolerance(item);
                      }}>
                      {formatSlippageTolerance(item)}
                    </div>
                  );
                })}
                {!customInputVisible ? (
                  <div
                    className={styleSlippageTolerance}
                    onClick={() => {
                      setCustomInputVisible(true);
                    }}>
                    Custom
                  </div>
                ) : (
                  <div className={styleSlippageToleranceInputContainer}>
                    <input
                      ref={customInputRef}
                      className={styleSlippageToleranceInput}
                      value={customInputValue}
                      onChange={(e) => {
                        if (/^[0-9.]*$/i.test(e.target.value)) {
                          setSelectedSlippageTolerance(undefined);
                          setCustomInputValue(e.target.value);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          save();
                        }
                      }}
                    />
                    <div className={styleSlippageToleranceInputUnit}>%</div>
                  </div>
                )}
              </div>
              <div className={styleButtons}>
                <Button
                  className={styleButton}
                  type="primary"
                  onClick={() => {
                    save();
                  }}>
                  Save
                </Button>
                <Button
                  className={styleButton}
                  type="tertiary"
                  onClick={() => {
                    closeModal();
                  }}>
                  Cancel
                </Button>
              </div>
            </div>
          );
        }}
        onCancel={(e) => {
          closeModal();
        }}
      />
    </>
  );
};

function formatSlippageTolerance(value: number, withoutUnit?: boolean) {
  return formatAmount(value * 100, {
    decimals: 2,
    trimRight: true,
    withSeperator: false,
    unit: !withoutUnit ? '%' : undefined,
    compactUnit: true,
  });
}

const FlexRow = css`
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
  margin: ${pxToPcVw(-8)} 0;
  padding: ${pxToPcVw(8)};
  border-radius: ${pxToPcVw(4)};
  gap: ${pxToPcVw(12)};
  transition: background-color 0.5s;

  &:hover {
    background-color: var(--ant-primary-1);
  }

  @media (max-width: 1024px) {
    margin: ${pxToMobileVw(-8)} 0;
    padding-inline: ${pxToMobileVw(8)};
    border-radius: ${pxToMobileVw(4)};
    gap: ${pxToMobileVw(12)};
  }
`;

const styleFlexRowActived = css`
  position: relative;
  z-index: 1001;
  background-color: var(--ant-primary-1);

  @media (max-width: 1024px) {
    z-index: auto;
  }
`;

const styleIcon = css`
  width: ${pxToPcVw(17)};
  height: ${pxToPcVw(20)};

  & > * {
    fill: var(--ant-primary-4);
  }

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(17)};
    height: ${pxToMobileVw(20)};
  }
`;

const LightFont = css`
  font-weight: 400;
`;

const styleChevronDownIcon = css`
  width: ${pxToPcVw(10)};

  & > * {
    fill: #fff;
  }

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(10)};
  }
`;

const styleModal = css`
  position: absolute;
  display: flex;
  flex-direction: column;
  background: var(--ant-background-3);
  transform: translateX(-50%) translateY(calc(-100% - ${pxToPcVw(8)}));
  border: ${pxToPcVw(2)} solid var(--ant-primary-color);
  border-radius: ${pxToPcVw(8)};
  width: ${pxToPcVw(302)};

  @media (max-width: 1024px) {
    left: 0 !important;
    top: 0 !important;
    max-height: none;
    border: none;
    border-radius: 0;
    height: 100%;
    width: 100%;
    transform: none;
  }
`;

const styleModalContainer = css`
  margin: 0;
  width: 0;
  height: 0;
  max-width: none;
  top: 0;
  padding-bottom: 0;
  pointer-events: auto;

  @media (max-width: 1024px) {
    width: 100% !important;
    height: 100%;
  }
`;

const styleTitleIcon = css`
  width: ${pxToPcVw(15)};
  height: ${pxToPcVw(21)};
  margin-right: ${pxToPcVw(12)};

  & > * {
    fill: var(--ant-primary-4);
  }

  @media (max-width: 1024px) {
    display: none;
  }
`;

const styleTitle = css`
  display: flex;
  align-items: center;
  font-weight: 400;
  font-size: ${pxToPcVw(14)};
  padding: ${pxToPcVw(12)};

  @media (max-width: 1024px) {
    font-weight: 600;
    font-size: ${pxToMobileVw(24)};
    padding: ${pxToMobileVw(16)};
    border-bottom: solid ${pxToMobileVw(2)} var(--color-border);
  }
`;

const styleSlippageTolerances = css`
  display: flex;
  justify-content: space-between;
  gap: ${pxToPcVw(8)};
  padding-inline: ${pxToPcVw(12)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(8)};
    padding-inline: ${pxToMobileVw(16)};
    margin-top: auto;
  }
`;

const styleSlippageTolerance = css`
  font-weight: 400;
  transition: background-color 0.5s;
  cursor: pointer;
  font-size: ${pxToPcVw(14)};
  padding-inline: ${pxToPcVw(8)};
  border-radius: ${pxToPcVw(8)};
  height: ${pxToPcVw(33)};
  line-height: ${pxToPcVw(33)};

  &:hover {
    background-color: var(--ant-primary-1);
  }

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(16)};
    padding-inline: ${pxToMobileVw(8)};
    border-radius: ${pxToMobileVw(8)};
    height: ${pxToMobileVw(38)};
    line-height: ${pxToMobileVw(38)};
  }
`;

const styleSlippageToleranceActived = css`
  font-weight: 600;
  background-color: var(--ant-primary-color);
`;

const styleButtons = css`
  display: flex;
  padding: ${pxToPcVw(12)};
  gap: ${pxToPcVw(12)};

  @media (max-width: 1024px) {
    flex-direction: column;
    padding: ${pxToPcVw(16)};
    gap: ${pxToPcVw(16)};
  }
`;

const styleButton = css`
  font-weight: 600;
  padding: 0 ${pxToPcVw(12)};
  height: ${pxToPcVw(41)};
  font-size: ${pxToPcVw(14)};

  @media (max-width: 1024px) {
    padding: 0 ${pxToMobileVw(12)};
    width: 100%;
    height: ${pxToMobileVw(56)};
    font-size: ${pxToMobileVw(14)};
  }
`;

const CloseIconStyle = css`
  display: none;
  padding: ${pxToPcVw(5)} ${pxToPcVw(5)} ${pxToPcVw(5)} ${pxToPcVw(10)};
  margin-left: auto;

  &:hover {
    cursor: pointer;
    opacity: 0.5;
  }

  @media (max-width: 1024px) {
    display: block;
    padding: ${pxToMobileVw(5)} ${pxToMobileVw(5)} ${pxToMobileVw(5)} ${pxToMobileVw(10)};
  }
`;

const styleCloseIcon = css`
  width: ${pxToPcVw(18)};
  height: ${pxToPcVw(18)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(18)};
    height: ${pxToMobileVw(18)};
  }
`;

const styleSlippageToleranceInputContainer = css`
  position: relative;
`;

const styleSlippageToleranceInput = css`
  display: block;
  background-color: transparent;
  outline: none;
  font-weight: 500;
  width: ${pxToPcVw(64)};
  height: ${pxToPcVw(33)};
  padding-left: ${pxToPcVw(8)};
  padding-right: ${pxToPcVw(29)};
  border: solid ${pxToPcVw(2)} var(--color-border);
  border-radius: ${pxToPcVw(8)};
  font-size: ${pxToPcVw(14)};
  transition: border-color 0.5s;

  &:focus {
    border-color: var(--ant-primary-5);
  }

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(64)};
    height: ${pxToMobileVw(38)};
    padding-left: ${pxToMobileVw(8)};
    padding-right: ${pxToMobileVw(29)};
    border: solid ${pxToMobileVw(2)} var(--color-border);
    border-radius: ${pxToMobileVw(8)};
    font-size: ${pxToMobileVw(16)};
  }
`;

const styleSlippageToleranceInputUnit = css`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-3);
  font-weight: 600;
  right: ${pxToPcVw(8)};
  font-size: ${pxToPcVw(14)};

  @media (max-width: 1024px) {
    right: ${pxToMobileVw(8)};
    font-size: ${pxToMobileVw(14)};
  }
`;
