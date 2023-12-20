import React, { useCallback, useEffect, useState } from 'react';

import { css, cx } from '@linaria/core';

import PendingIcon from '../../assets/icons/blue-pending.png';
import SuccessIcon from '../../assets/icons/green-success.png';
import FailedIcon from '../../assets/icons/red-failed.png';
import { TXN_STATUS } from '../../utils/consts';
import { pxToMobileVw, pxToPcVw } from '../../utils/style-evaluation';

type StyleJSONObj = {
  statusClassName: string;
  statusText: string;
};

type Props = {
  status: string;
};

export const TxStatusPill = ({ status }: Props) => {
  const [styleJSON, setStyleJSON] = useState<StyleJSONObj>({
    statusClassName: '',
    statusText: '',
  });

  const getStatusStyle = useCallback(() => {
    if (status === TXN_STATUS.REDEEMED) {
      setStyleJSON({
        statusClassName: styleStatusSuccess,
        statusText: 'Redeemed',
      });
    } else if (status === TXN_STATUS.FAILED) {
      setStyleJSON({
        statusClassName: styleStatusFailed,
        statusText: 'Failed',
      });
    } else {
      // transfer txn confirmed but not redeemed
      // transfer txn pending vaa
      setStyleJSON({
        statusClassName: styleStatusPending,
        statusText: 'Pending',
      });
    }
  }, [status]);

  const getIcon = useCallback(() => {
    if (status === TXN_STATUS.REDEEMED) {
      return SuccessIcon;
    } else if (status === TXN_STATUS.FAILED) {
      return FailedIcon;
    } else {
      return PendingIcon;
    }
  }, [status]);

  useEffect(() => getStatusStyle(), [getStatusStyle]);

  return (
    <div className={cx(styleStatusContainer, styleJSON.statusClassName)}>
      <img className={styleStatusIcon} src={getIcon()} />
      {styleJSON.statusText}
    </div>
  );
};

const styleStatusContainer = css`
  display: inline-flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  font-weight: 500;
  height: ${pxToPcVw(36)};
  padding: 0 ${pxToPcVw(12)};
  border-radius: ${pxToPcVw(18)};
  gap: ${pxToPcVw(10)};
  font-size: ${pxToPcVw(14)};

  @media (max-width: 1024px) {
    height: ${pxToMobileVw(36)};
    padding: 0 ${pxToMobileVw(12)};
    border-radius: ${pxToMobileVw(18)};
    gap: ${pxToMobileVw(10)};
    font-size: ${pxToMobileVw(14)};
  }
`;

const styleStatusIcon = css`
  width: ${pxToPcVw(16)};
  height: ${pxToPcVw(16)};

  @media (max-width: 1024px) {
    width: ${pxToMobileVw(16)};
    height: ${pxToMobileVw(16)};
  }
`;

const styleStatusSuccess = css`
  color: var(--status-success);
  background: var(--status-bg-success);
`;

const styleStatusFailed = css`
  color: var(--status-failed);
  background: var(--status-bg-failed);
`;

const styleStatusPending = css`
  color: var(--status-pending);
  background: var(--status-bg-pending);
`;
