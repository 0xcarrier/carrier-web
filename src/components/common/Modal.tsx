import React, { ReactNode } from 'react';

import { css, cx } from '@linaria/core';
import { Modal as AntdModal, ModalProps } from 'antd';

import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { SVGIcon } from './SVGIcon';

interface IProps extends ModalProps {
  title?: ReactNode;
  autoWidth?: boolean;
  modalClassName?: string;
}

export const Modal: React.SFC<IProps> = (props) => {
  const { title, modalClassName, wrapClassName, maskClosable = false, children, onCancel, ...restProps } = props;

  return (
    <AntdModal
      {...restProps}
      className={styleModalContainer}
      wrapClassName={cx(styleWrapper, wrapClassName)}
      maskClosable={maskClosable}
      modalRender={() => {
        return (
          <div className={cx(styleModal, modalClassName)}>
            {title ? (
              <div className={Header}>
                {title}
                <div
                  className={CloseIconStyle}
                  onClick={(e) => {
                    if (onCancel) {
                      onCancel(e);
                    }
                  }}>
                  <SVGIcon className={styleCloseIcon} iconName="close" />
                </div>
              </div>
            ) : null}
            {children}
          </div>
        );
      }}
      onCancel={(e) => {
        if (onCancel) {
          onCancel(e);
        }
      }}
    />
  );
};

const styleModalContainer = css`
  top: auto;
  width: auto !important;
  margin-top: ${pxToPcVw(137)};

  @media (max-width: 1024px) {
    top: 0;
    padding-bottom: 0;
    width: 100% !important;
    height: 100% !important;
    max-width: none;
    margin: 0;
  }
`;

const styleWrapper = css`
  display: flex;
  justify-content: center;
  overflow: auto;
`;

const styleModal = css`
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  max-height: 80vh;
  border: ${pxToPcVw(2)} solid var(--color-border);
  border-radius: ${pxToPcVw(8)};
  background: var(--ant-background);

  @media (max-width: 1024px) {
    max-height: none;
    border: none;
    border-radius: 0;
    height: 100%;
    width: 100%;
  }
`;

const Header = css`
  display: flex;
  align-items: flex-start;
  font-weight: 600;
  font-size: ${pxToPcVw(24)};
  line-height: ${pxToPcVw(29)};
  border-bottom: ${pxToPcVw(2)} solid var(--color-border);
  padding: ${pxToPcVw(21)} ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    font-size: ${pxToMobileVw(24)};
    line-height: ${pxToMobileVw(29)};
    border-bottom: ${pxToMobileVw(2)} solid var(--color-border);
    padding: ${pxToMobileVw(21)} ${pxToMobileVw(16)};
  }
`;

const CloseIconStyle = css`
  padding: ${pxToPcVw(5)} ${pxToPcVw(5)} ${pxToPcVw(5)} ${pxToPcVw(10)};
  margin-left: auto;

  &:hover {
    cursor: pointer;
    opacity: 0.5;
  }

  @media (max-width: 1024px) {
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
