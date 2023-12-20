import React, { ReactNode } from 'react';

import { css, cx } from '@linaria/core';

import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';
import { Action } from './helper';

interface Props {
  actions: Action[];
}

const CommandLinePanelDropdown: React.FC<Props> = ({ actions }) => {
  function renderActionRow(action: Action): ReactNode {
    const { className, onClick, content, children } = action;

    return (
      <React.Fragment key={action.key}>
        <div
          className={cx(
            styleCommandLineDropDownRow,
            onClick ? styleCommandLineDropDownClickable : undefined,
            className,
          )}
          onClick={() => {
            if (onClick) {
              onClick();
            }
          }}>
          {content}
        </div>
        {children && children.length
          ? children.map((item) => {
              return renderActionRow(item);
            })
          : null}
      </React.Fragment>
    );
  }

  return (
    <div className={styleCommandLineDropDownContainer}>
      {actions.map((item) => {
        return renderActionRow(item);
      })}
    </div>
  );
};

const styleCommandLineDropDownContainer = css`
  display: flex;
  flex-direction: column;
  margin-top: ${pxToPcVw(-8)};
  padding: ${pxToPcVw(16)} 0 ${pxToPcVw(8)};
  border: solid ${pxToPcVw(2)} var(--color-border);
  border-top: none;
  border-bottom-left-radius: ${pxToPcVw(8)};
  border-bottom-right-radius: ${pxToPcVw(8)};

  @media (max-width: 1024px) {
    margin-top: ${pxToMobileVw(-8)};
    padding: ${pxToMobileVw(16)} 0 ${pxToMobileVw(8)};
    border: solid ${pxToMobileVw(2)} var(--color-border);
    border-top: none;
    border-bottom-left-radius: ${pxToMobileVw(8)};
    border-bottom-right-radius: ${pxToMobileVw(8)};
  }
`;

const styleCommandLineDropDownRow = css`
  word-break: break-all;
  line-height: 1.21em;
  padding: ${pxToPcVw(6)} ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    padding: ${pxToMobileVw(6)} ${pxToMobileVw(16)};
  }
`;

const styleCommandLineDropDownClickable = css`
  cursor: pointer;
`;

export default CommandLinePanelDropdown;
