import { css, cx } from '@linaria/core';
import React, { ReactNode, useEffect, useState } from 'react';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { Modal } from './Modal';
import { Spinner } from './Spinner';
import { SVGIcon } from './SVGIcon';
import { useDebouncedCallback } from 'use-debounce';

interface Props {
  title: string;
  tips?: ReactNode;
  visible: boolean;
  disableSearch?: boolean;
  searchPlaceHolder?: string;
  searching?: boolean;
  onSearch?: (value: string) => void;
  onVisibleChanged: (visible: boolean) => void;
}

export const SelectionModal: React.SFC<Props> = ({
  title,
  tips,
  visible,
  disableSearch,
  searchPlaceHolder,
  searching,
  children,
  onSearch,
  onVisibleChanged,
}) => {
  const [searchInputValue, setSearchInputValue] = useState('');
  const onSearchDebounce = useDebouncedCallback((value: string) => {
    if (onSearch) {
      onSearch(value);
    }
  }, 1000);

  useEffect(() => {
    onSearchDebounce(searchInputValue);
  }, [searchInputValue]);

  useEffect(() => {
    if (!visible) {
      setSearchInputValue('');
    }
  }, [visible]);

  return (
    <Modal
      maskClosable={true}
      open={visible}
      title={title}
      modalClassName={styleModal}
      onCancel={() => {
        onVisibleChanged(false);
      }}>
      {tips ? (
        <div className={cx(styleTipsWrapper, disableSearch ? styleTipsWrapperMargin : undefined)}>{tips}</div>
      ) : null}
      {!disableSearch ? (
        <div className={SearchWrapper}>
          <SVGIcon iconName="search" />
          <div className={styleInputWrapper}>
            <input
              className={InputStyle}
              value={searchInputValue}
              placeholder={searchPlaceHolder || 'Search...'}
              spellCheck="false"
              onChange={(e) => setSearchInputValue(e.target.value)}
            />
          </div>
          {searching && <Spinner />}
        </div>
      ) : null}

      <div className={ContentWrapper}>{children}</div>
    </Modal>
  );
};

interface SelectionModalTagProps {
  className?: string;
}

export const SelectionModalTag: React.SFC<SelectionModalTagProps> = ({ className, children }) => {
  return <div className={cx(styleSelectionModalTag, className)}>{children}</div>;
};

const styleSelectionModalTag = css`
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--ant-primary-4);
  width: ${pxToPcVw(74)};
  height: ${pxToPcVw(33)};
  border-radius: ${pxToPcVw(20)};
  border: ${pxToPcVw(2)} solid var(--ant-primary-4);
  font-size: ${pxToPcVw(14)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(74)};
    height: ${pxToMobileVw(33)};
    border-radius: ${pxToMobileVw(20)};
    border: ${pxToMobileVw(2)} solid var(--ant-primary-4);
    font-size: ${pxToMobileVw(14)};
  }
`;

const styleModal = css`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: ${pxToPcVw(588)};
  height: ${pxToPcVw(480)};

  @media (max-width: 1024px) {
    width: 100%;
    height: 100%;
  }
`;

export const SearchWrapper = css`
  display: flex;
  align-items: center;
  height: ${pxToPcVw(56)};
  border: ${pxToPcVw(2)} solid var(--color-border);
  padding: ${pxToPcVw(18)};
  gap: ${pxToPcVw(18)};
  border-radius: ${pxToPcVw(8)};
  margin: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    width: auto;
    height: ${pxToMobileVw(56)};
    border: ${pxToMobileVw(2)} solid var(--color-border);
    padding: ${pxToMobileVw(18)};
    gap: ${pxToMobileVw(18)};
    border-radius: ${pxToMobileVw(8)};
    margin: ${pxToMobileVw(16)};
  }
`;

export const styleInputWrapper = css`
  flex-grow: 1;
`;

export const InputStyle = css`
  background: var(--ant-background);
  border: none;
  font-weight: 500;
  width: 100%;
  height: ${pxToPcVw(20)};
  font-size: ${pxToPcVw(16)};

  /* Chrome, Firefox, Opera, Safari 10.1+ */
  ::placeholder {
    color: var(--color-text-3);
    opacity: 1; /* Firefox */
  }

  &:focus {
    outline: none;
  }

  @media (max-width: 1024px) {
    height: ${pxToMobileVw(20)};
    font-size: ${pxToMobileVw(16)};
  }
`;

const ContentWrapper = css`
  overflow-y: auto;
  margin-bottom: ${pxToPcVw(14)};
  flex-grow: 1;

  @media (max-width: 1024px) {
    margin-bottom: ${pxToMobileVw(14)};
  }
`;

const styleTipsWrapper = css`
  margin: ${pxToPcVw(16)} ${pxToPcVw(16)} 0;

  @media (max-width: 1024px) {
    margin: ${pxToMobileVw(16)} ${pxToMobileVw(16)} 0;
  }
`;

const styleTipsWrapperMargin = css`
  margin: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    margin: ${pxToMobileVw(16)};
  }
`;
