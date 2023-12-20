import React from 'react';

import { css, cx } from '@linaria/core';
import { Dropdown as AntDropdown, DropDownProps, MenuProps } from 'antd';
import { ItemType } from 'antd/lib/menu/hooks/useItems';

import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';

interface DropDownMenuProps extends Omit<MenuProps, 'items'> {
  items?: (ItemType | undefined)[];
}

interface Props extends Omit<DropDownProps, 'menu'> {
  className?: string;
  menu: DropDownMenuProps;
}

export const Dropdown: React.SFC<Props> = ({ className, menu, trigger, ...restProps }) => {
  const { items: menuItems, className: menuClassName, ...restMenuProps } = menu || {};

  return (
    <AntDropdown
      {...restProps}
      trigger={trigger || ['click']}
      className={cx(styleDropdown, className)}
      menu={
        menu
          ? {
              ...restMenuProps,
              items: menuItems ? (menuItems.filter((item) => item != null) as ItemType[]) : undefined,
              className: cx(styleMenu, menuClassName),
            }
          : undefined
      }
    />
  );
};

const styleDropdown = css``;

const styleMenu = css`
  background-color: var(--ant-background-3) !important;
  padding: 0;
  border: solid ${pxToPcVw(2)} var(--color-border);
  border-radius: ${pxToPcVw(8)};

  > li {
    color: #fff;
    height: ${pxToPcVw(52)};
    min-width: ${pxToPcVw(183)};
    padding: 0 ${pxToPcVw(16)};
    font-size: ${pxToPcVw(14)};

    &:not(:last-child) {
      border-bottom: solid ${pxToPcVw(2)} var(--color-border);
    }

    &:hover {
      background-color: #2d41a7;
    }
  }

  @media (max-width: 1024px) {
    border: solid ${pxToMobileVw(2)} var(--color-border);
    border-radius: ${pxToMobileVw(8)};

    > li {
      height: ${pxToMobileVw(52)};
      min-width: ${pxToMobileVw(183)};
      padding: 0 ${pxToMobileVw(16)};
      font-size: ${pxToMobileVw(14)};

      &:not(:last-child) {
        border-bottom: solid ${pxToMobileVw(2)} var(--color-border);
      }
    }
  }
`;
