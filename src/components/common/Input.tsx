import React, { ReactNode } from 'react';

import { css, cx } from '@linaria/core';

import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';

interface Props extends React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement> {
  icon?: ReactNode;
}

export const Input = ({ className, icon, ...restProps }: Props) => {
  return (
    <div className={SearchWrapper}>
      {icon}
      <input {...restProps} className={cx(InputStyle, className)} />
    </div>
  );
};

const SearchWrapper = css`
  display: flex;
  align-items: center;
  margin: 0 auto;
  height: ${pxToPcVw(52)};
  border: ${pxToPcVw(2)} solid var(--color-border);
  padding: ${pxToPcVw(16)};
  gap: ${pxToPcVw(16)};
  border-radius: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    height: ${pxToMobileVw(52)};
    border: ${pxToMobileVw(2)} solid var(--color-border);
    padding: ${pxToMobileVw(16)};
    gap: ${pxToMobileVw(16)};
    border-radius: ${pxToMobileVw(8)};
  }
`;

const InputStyle = css`
  background: transparent;
  border: none;
  font-weight: 500;
  height: ${pxToPcVw(24)};
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
    height: ${pxToMobileVw(24)};
    font-size: ${pxToMobileVw(16)};
  }
`;
