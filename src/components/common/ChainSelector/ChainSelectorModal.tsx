import { css } from '@linaria/core';
import React, { useState } from 'react';
import { CarrierChainId, ChainInfo } from '../../../utils/consts';
import { pxToMobileVw, pxToPcVw } from '../../../utils/style-evaluation';
import { ChainLogo } from '../ChainLogo';
import { SelectionModal } from '../SelectionModal';

interface Props {
  className?: string;
  isVisible: boolean;
  chains: ChainInfo[];
  onSelectChain: (options: { chainId: CarrierChainId }) => void;
  onVisibleChanged: (visible: boolean) => void;
}

export const ChainSelectorModal: React.SFC<Props> = ({
  className,
  chains,
  isVisible,
  onSelectChain,
  onVisibleChanged,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  return (
    <SelectionModal
      visible={isVisible}
      title="Select network"
      searchPlaceHolder="Search network name"
      onVisibleChanged={onVisibleChanged}
      onSearch={setSearchFilter}>
      <div className={styleList}>
        {chains
          .filter((item) => (searchFilter ? item.name.toLowerCase().includes(searchFilter.toLowerCase()) : true))
          .map((item) => {
            return (
              <div
                key={item.id}
                className={ListItemWrapper}
                onClick={() => {
                  onSelectChain({ chainId: item.id });
                  onVisibleChanged(false);
                }}>
                <ChainLogo className={ListItemLogo} chainId={item.id} />
                <div>{item.name}</div>
              </div>
            );
          })}
      </div>
    </SelectionModal>
  );
};

const styleList = css`
  display: flex;
  flex-direction: column;
`;

const ListItemWrapper = css`
  display: flex;
  align-items: center;
  font-weight: 500;
  color: #fff;
  padding: ${pxToPcVw(13)} ${pxToPcVw(16)};
  gap: ${pxToPcVw(21)};
  font-size: ${pxToPcVw(20)};

  &:hover {
    cursor: pointer;
    background: var(--ant-primary-color);
    color: #fff;
  }

  @media (max-width: 1024px) {
    padding: ${pxToMobileVw(13)} ${pxToMobileVw(16)};
    gap: ${pxToMobileVw(21)};
    font-size: ${pxToMobileVw(20)};
  }
`;

const ListItemLogo = css`
  height: ${pxToPcVw(48)};
  width: ${pxToPcVw(48)};

  @media (max-width: 1024px) {
    height: ${pxToMobileVw(48)};
    width: ${pxToMobileVw(48)};
  }
`;
