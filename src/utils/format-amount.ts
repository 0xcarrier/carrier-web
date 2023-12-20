import BigNumber from 'bignumber.js';

export interface FormatMoneyOptions {
  withPositiveAndNegativeMark?: boolean;
  withNegativeMark?: boolean;
  withSeperator?: boolean;
  decimals?: number;
  unit?: string;
  trimRight?: boolean;
  prefixUnit?: boolean;
  compactUnit?: boolean;
}

export function formatAmount(amount?: number | BigNumber, options?: FormatMoneyOptions) {
  const {
    withPositiveAndNegativeMark = false,
    withNegativeMark = false,
    withSeperator = true,
    decimals = 8,
    unit,
    trimRight = true,
    prefixUnit,
    compactUnit,
  } = options || {};

  if (amount == null) {
    return 'N/A';
  }

  let amountString = amount.toFixed(decimals);

  if (withSeperator) {
    const amountArr = amountString.split('.');
    const int = amountArr[0];
    amountArr[0] = int.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    amountString = amountArr.join('.');
  }

  if (withPositiveAndNegativeMark || withNegativeMark) {
    const mark = withPositiveAndNegativeMark
      ? (typeof amount === 'number' ? amount > 0 : amount.gt(0))
        ? '+'
        : '-'
      : withNegativeMark
      ? (typeof amount === 'number' ? amount < 0 : amount.lt(0))
        ? '-'
        : ''
      : '';

    amountString = `${mark}${amountString.replace('-', '')}`;
  }

  if (trimRight) {
    const amountArr = amountString.split('.');
    const decimalString = amountArr[1];

    if (decimalString != null) {
      let trimIndex = -1;

      for (let i = decimalString.length - 1; i >= 0; i--) {
        const char = decimalString[i];

        if (char === '0') {
          continue;
        } else {
          trimIndex = i;
          break;
        }
      }

      if (trimIndex !== -1) {
        const decimalStringTrimed = decimalString.slice(0, trimIndex + 1);

        amountString = [amountArr[0], decimalStringTrimed].join('.');
      } else {
        amountString = amountArr[0];
      }
    }
  }

  if (unit) {
    amountString = `${prefixUnit ? `${unit}${compactUnit ? '' : ' '}` : ''}${amountString}${
      !prefixUnit ? `${compactUnit ? '' : ' '}${unit}` : ''
    }`;
  }

  return amountString;
}
