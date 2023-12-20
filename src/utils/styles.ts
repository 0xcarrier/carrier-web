import { css, cx } from '@linaria/core';
import 'antd/dist/antd.less';

import './css-vars-polyfill.js';
import { pxToMobileVw, pxToPcVw } from './style-evaluation.js';

//for linaria global theme
export const globals = css`
  :global() {
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap');

    /* ---------- body ---------- */

    body {
      width: 100% !important;
      font-family: Montserrat, sans-serif;
      font-size: ${pxToPcVw(14)};

      --ant-primary-color-outline: var(--ant-primary-color);
      --ant-primary-color-hover: var(--ant-primary-color);
      --ant-primary-color-active: var(--ant-primary-color);
      --ant-background: #1a1a4e;
      --ant-background-2: #151637;
      --ant-background-3: #0e133e;
      --ant-primary-color: #2d41a7;
      --ant-primary-1: #142477;
      --ant-primary-2: #3878ec;
      --ant-primary-4: #0085ff;
      --ant-primary-5: #00c2ff;
      --color-btn-ghost: var(--ant-primary-color);
      --color-btn-ghost-border: var(--ant-primary-color);
      --color-background: #f3f5f7;
      --color-text: #ffffff;
      --color-text-secondary: #b0b0c4;
      --color-text-3: #c3c3e3;
      --color-border: #2d41a7;
      --color-warning: #e7ba34;
      --color-error: #ff6868;
      --color-success: #28df31;
      --color-header-link-icon: #e4a66b;

      --status-bg-success: #014206;
      --status-bg-failed: #4e0909;
      --status-bg-pending: var(--ant-primary-1);

      --status-success: #28df31;
      --status-failed: #f35050;
      --status-pending: var(--ant-primary-5);

      --background-image-pc: none;
      --background-position-x-pc: initial;
      --background-position-y-pc: initial;
      --background-repeat-x-pc: initial;
      --background-repeat-y-pc: initial;
      --background-size-pc: initial;

      --background-image-mobile: none;
      --background-position-x-mobile: initial;
      --background-position-y-mobile: initial;
      --background-repeat-x-mobile: initial;
      --background-repeat-y-mobile: initial;
      --background-size-mobile: initial;

      --background-image: none;
      --background-position-x: var(--background-position-x-pc);
      --background-position-y: var(--background-position-y-pc);
      --background-repeat-x: var(--background-repeat-x-pc);
      --background-repeat-y: var(--background-repeat-y-pc);
      --background-size: var(--background-size-pc);

      @media (max-width: 1024px) {
        font-size: ${pxToMobileVw(14)};

        --background-image: var(--background-image-mobile);
        --background-position-x: var(--background-position-x-mobile);
        --background-position-y: var(--background-position-y-mobile);
        --background-repeat-x: var(--background-repeat-x-mobile);
        --background-repeat-y: var(--background-repeat-y-mobile);
        --background-size: var(--background-size-mobile);
      }

      -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      -webkit-overflow-scrolling: touch;
    }

    /* ---------- scrollbar ---------- */
    * {
      box-sizing: border-box;
    }

    /* Works on Firefox */
    * {
      scrollbar-width: thin;
      scrollbar-color: var(--ant-primary-4) var(--ant-primary-color);
    }

    /* Works on Chrome, Safari */
    *::-webkit-scrollbar-track {
      border-radius: ${pxToPcVw(8)};
      -webkit-box-shadow: inset 0 0 ${pxToPcVw(6)} rgba(0, 0, 0, 0.3);
      background-color: var(--ant-primary-color);

      @media (max-width: 1024px) {
        border-radius: ${pxToMobileVw(8)};
        -webkit-box-shadow: inset 0 0 ${pxToMobileVw(6)} rgba(0, 0, 0, 0.3);
      }
    }

    *::-webkit-scrollbar {
      width: ${pxToPcVw(8)};
      background-color: var(--ant-primary-color);

      @media (max-width: 1024px) {
        width: ${pxToMobileVw(8)};
      }
    }

    *::-webkit-scrollbar-thumb {
      border-radius: ${pxToPcVw(8)};
      -webkit-box-shadow: inset 0 0 ${pxToPcVw(6)} rgba(0, 0, 0, 0.3);
      background-color: var(--ant-primary-4);

      @media (max-width: 1024px) {
        border-radius: ${pxToMobileVw(8)};
        -webkit-box-shadow: inset 0 0 ${pxToMobileVw(6)} rgba(0, 0, 0, 0.3);
      }
    }

    #container {
      overflow: hidden;
      min-height: 100vh;
      /* background-image: var(--background-image); */
      background-color: #131445;
      color: var(--color-text);
      font-weight: 600;
    }

    a {
      color: var(--ant-primary-5);
      transition: color 0.5s;

      &:hover {
        color: var(--ant-primary-4);
      }

      &.disable,
      &.disabled {
        color: var(--ant-primary-color);
      }
    }

    ul {
      padding-left: ${pxToPcVw(17)};

      li {
        margin-bottom: ${pxToPcVw(5)};
      }

      @media (max-width: 1024px) {
        padding-left: ${pxToMobileVw(17)};

        li {
          margin-bottom: ${pxToMobileVw(5)};
        }
      }
    }

    img {
      object-fit: cover;
    }

    .ant-modal-close-x {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .ant-select-dropdown {
      padding: 0.27vw 0;

      .ant-select-item {
        min-height: auto;
        line-height: 1.63vw;
        font-size: 1.04vw;
        padding: 0.34vw 0.83vw;
      }

      @media (max-width: 1024px) {
        padding: 0.55vw 0;

        .ant-select-item {
          line-height: 6vw;
          font-size: 2.77vw;
          padding: 0.69vw 1.66vw;
        }
      }
    }

    .ant-btn {
      font-size: ${pxToPcVw(14)};

      @media (max-width: 1024px) {
        font-size: ${pxToMobileVw(14)};
      }
    }

    .ant-tabs {
      .ant-tabs-ink-bar {
        background: var(--ant-primary-4);
      }

      .ant-tabs-tab {
        font-weight: 500;
        font-size: ${pxToPcVw(16)};

        & + .ant-tabs-tab {
          margin: 0 0 0 ${pxToPcVw(20)};
        }

        .ant-tabs-tab-btn {
          color: var(--color-text-3);
        }

        &.ant-tabs-tab-active .ant-tabs-tab-btn {
          color: #fff;
        }

        @media (max-width: 1024px) {
          font-size: ${pxToMobileVw(16)};

          & + .ant-tabs-tab {
            margin: 0 0 0 ${pxToMobileVw(20)};
          }
        }
      }
    }

    .ant-tooltip {
      max-width: ${pxToPcVw(250)};
      font-size: ${pxToPcVw(14)};

      @media (max-width: 1024px) {
        max-width: ${pxToMobileVw(250)};
        font-size: ${pxToMobileVw(14)};
      }
    }

    .ant-table-thead > tr > th,
    .ant-table-tbody > tr > td,
    .ant-table tfoot > tr > th,
    .ant-table tfoot > tr > td {
      padding: ${pxToPcVw(16)} ${pxToPcVw(8)};

      &:first-child {
        padding-left: ${pxToPcVw(16)};
        padding-right: ${pxToPcVw(18)};
      }

      &:last-child {
        padding-right: ${pxToPcVw(16)};
      }

      @media (max-width: 1024px) {
        padding: ${pxToMobileVw(16)} ${pxToMobileVw(8)};

        &:first-child {
          padding-left: ${pxToMobileVw(16)};
        }

        &:last-child {
          padding-right: ${pxToMobileVw(16)};
        }
      }
    }

    .ant-table-container table > thead > tr:first-child th:first-child {
      border-top-left-radius: ${pxToPcVw(6)};

      @media (max-width: 1024px) {
        border-top-left-radius: ${pxToMobileVw(6)};
      }
    }

    .ant-table-container table > thead > tr:first-child th:last-child {
      border-top-right-radius: ${pxToPcVw(6)};

      @media (max-width: 1024px) {
        border-top-right-radius: ${pxToMobileVw(6)};
      }
    }

    .ant-switch {
      font-size: ${pxToPcVw(14)};
      min-width: unset;
      width: ${pxToPcVw(56)};
      height: ${pxToPcVw(32)};
      line-height: ${pxToPcVw(22)};

      .ant-switch-handle {
        top: ${pxToPcVw(4)};
        left: ${pxToPcVw(4)};
        width: ${pxToPcVw(24)};
        height: ${pxToPcVw(24)};

        &::before {
          border-radius: ${pxToPcVw(12)};
          box-shadow: 0 ${pxToPcVw(4)} ${pxToPcVw(4)} rgba(0, 0, 0, 0.25);
        }
      }

      &.ant-switch-checked .ant-switch-handle {
        left: calc(100% - ${pxToPcVw(24)} - ${pxToPcVw(4)});
      }

      @media (max-width: 1024px) {
        font-size: ${pxToMobileVw(14)};
        min-width: unset;
        width: ${pxToMobileVw(56)};
        height: ${pxToMobileVw(32)};
        line-height: ${pxToMobileVw(22)};

        .ant-switch-handle {
          top: ${pxToMobileVw(4)};
          left: ${pxToMobileVw(4)};
          width: ${pxToMobileVw(24)};
          height: ${pxToMobileVw(24)};

          &::before {
            border-radius: ${pxToMobileVw(12)};
            box-shadow: 0 ${pxToMobileVw(4)} ${pxToMobileVw(4)} rgba(0, 0, 0, 0.25);
          }
        }

        &.ant-switch-checked .ant-switch-handle {
          left: calc(100% - ${pxToMobileVw(24)} - ${pxToMobileVw(4)});
        }
      }
    }

    .ant-notification-notice {
      background-color: var(--ant-background);
      border: ${pxToPcVw(2)} solid var(--color-border);
      border-radius: ${pxToPcVw(8)};
      padding: ${pxToPcVw(12)};

      .ant-notification-notice-close {
        top: ${pxToPcVw(16)};
        right: ${pxToPcVw(16)};
      }

      .ant-notification-notice-message {
        color: #fff;
        font-size: ${pxToPcVw(14)};
        margin-left: ${pxToPcVw(40)};
        padding-right: ${pxToPcVw(24)};
        margin-bottom: 0;
      }

      @media (max-width: 1024px) {
        border: ${pxToMobileVw(2)} solid var(--color-border);
        border-radius: ${pxToMobileVw(8)};
        padding: ${pxToMobileVw(12)};

        .ant-notification-notice-close {
          top: ${pxToMobileVw(16)};
          right: ${pxToMobileVw(16)};
        }

        .ant-notification-notice-message {
          font-size: ${pxToMobileVw(14)};
          margin-left: ${pxToMobileVw(40)};
          padding-right: ${pxToMobileVw(24)};
        }
      }
    }

    .ant-switch {
      background-color: #4b4a62;
    }

    .ant-switch-checked {
      background-color: var(--ant-primary-4);
    }

    .ant-radio-button-wrapper {
      background: transparent;
      border-left: none !important;
      border: none;
      border-radius: ${pxToPcVw(8)};

      @media (max-width: 1024px) {
        border-radius: ${pxToMobileVw(8)};
      }
    }

    .ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled) {
      background: var(--ant-primary-color);
      border: none;
      color: white;
      border-radius: ${pxToPcVw(8)};

      @media (max-width: 1024px) {
        border-radius: ${pxToMobileVw(8)};
      }
    }

    .ant-radio-button-wrapper:not(:first-child)::before {
      width: 0;
    }
  }
`;

export const styleTipsColor = css`
  color: var(--color-text-secondary);
`;

export const styleErrorColor = css`
  color: var(--color-error);
`;

export const styleYellowColor = css`
  color: var(--color-yellow);
`;

export const styleSuccessColor = css`
  color: var(--color-success);
`;

export const styleNormalColor = css`
  color: var(--color-text-gray);
`;

export const styleBlackColor = css`
  color: var(--color-text-gray);
`;

export const styleFontSizeXSmall = css`
  font-size: var(--font-size-xsmall);
`;

export const styleFontSizeSmall = css`
  font-size: var(--font-size-small);
`;

export const styleFontSizeNormal = css`
  font-size: var(--font-size-normal);
`;

export const styleFontSizeLarge = css`
  font-size: var(--font-size-large);
`;

export const styleFontSizeXLarge = css`
  font-size: var(--font-size-xlarge);
`;

export const styleFontNormal = css`
  font-weight: normal;
`;

export const styleFontBold = css`
  font-weight: bold;
`;

export const styleTips = cx(styleFontSizeSmall, styleTipsColor);

export const styleAbsCenter = css`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translateX(-50%) translateY(-50%);
`;

export const styleFullWidthAndHeight = css`
  width: 100%;
  height: 100%;
`;

export const styleLineClamp2 = css`
  overflow: hidden;
  line-height: 1.2em;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-all;
`;

export const styleDisabled = css`
  opacity: 0.45;
  pointer-events: none;
`;
