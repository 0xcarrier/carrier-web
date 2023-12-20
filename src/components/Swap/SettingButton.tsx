import { css, cx } from '@linaria/core';
import { Switch } from 'antd';
import React, { useState } from 'react';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { Modal } from '../common/Modal';
import { SVGIcon } from '../common/SVGIcon';
import Tooltip from '../common/Tooltip';
import { Button } from '../common/Button';

interface Props {
  className?: string;
  isUsingRelayer: boolean;
  onSetIsUsingRelayer: (isUsingRelayer: boolean) => void;
}

export const SettingButton: React.SFC<Props> = ({ className, isUsingRelayer, onSetIsUsingRelayer }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <SettingButtonModal
      className={className}
      visible={isVisible}
      isUsingRelayer={isUsingRelayer}
      onVisibleChanged={(visible) => {
        setIsVisible(visible);
      }}
      onSetIsUsingRelayer={onSetIsUsingRelayer}
    />
  );
};

interface ModalProps {
  className?: string;
  visible?: boolean;
  isUsingRelayer: boolean;
  onVisibleChanged: (visible: boolean) => void;
  onSetIsUsingRelayer: (isUsingRelayer: boolean) => void;
}

export const SettingButtonModal: React.SFC<ModalProps> = ({
  className,
  visible,
  isUsingRelayer,
  onVisibleChanged,
  onSetIsUsingRelayer,
}) => {
  return (
    <div className={cx(className, SettingsButtonWrapper)}>
      <Button className={SettingsButtonStyle} type="tertiary" onClick={() => onVisibleChanged(!visible)}>
        <SVGIcon className={SettingsIconStyle} iconName="settings" /> Settings
      </Button>
      {visible && (
        <Modal
          maskClosable={true}
          open={visible}
          modalClassName={StyleModal}
          title="Settings"
          onCancel={() => onVisibleChanged(false)}>
          <div className={OptionsWrapper}>
            <div className={OptionsItemStyle}>
              <div className={OptionsItemTextWrapper}>
                <div>Auto Relay</div>
                <Tooltip
                  tooltipText={`Use the relayer to automatically redeem on the destination chains. Otherwise, you would have to pay the gas yourself on the origin and destination chains.`}
                />
              </div>
              <Switch
                defaultChecked={false}
                checked={isUsingRelayer}
                onChange={(checked) => {
                  onSetIsUsingRelayer(checked);
                }}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

const OptionsWrapper = css`
  display: flex;
  flex-direction: column;

  .ant-radio-button-wrapper {
    font-weight: 400;
    font-size: ${pxToPcVw(16)};
  }

  @media (max-width: 1024px) {
    .ant-radio-button-wrapper {
      font-weight: 400;
      font-size: ${pxToMobileVw(16)};
    }
  }
`;

const OptionsItemStyle = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: ${pxToPcVw(2)} solid var(--color-border);
  height: ${pxToPcVw(64)};
  padding: ${pxToPcVw(22)} ${pxToPcVw(16)};
  gap: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    border-bottom: ${pxToMobileVw(2)} solid var(--color-border);
    height: ${pxToMobileVw(64)};
    padding: ${pxToMobileVw(22)} ${pxToMobileVw(16)};
    gap: ${pxToMobileVw(8)};
  }
`;

const OptionsItemTextWrapper = css`
  display: flex;
  gap: ${pxToPcVw(8)};
  font-weight: 500;
  font-size: ${pxToPcVw(16)};
  line-height: ${pxToPcVw(20)};

  @media (max-width: 1024px) {
    gap: ${pxToMobileVw(8)};
    font-weight: 500;
    font-size: ${pxToMobileVw(16)};
    line-height: ${pxToMobileVw(20)};
  }
`;

const SettingsButtonWrapper = css``;

const SettingsButtonStyle = css`
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

const SettingsIconStyle = css`
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

const StyleModal = css`
  width: ${pxToPcVw(588)};

  @media (max-width: 1024px) {
    width: 100%;
    height: 100%;
  }
`;
