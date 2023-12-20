const ENABLE_FLEXIABLE_PC_LAYOUT = process.env.ENABLE_FLEXIABLE_PC_LAYOUT;

export function pxToPcVw(px) {
  // for now, we use fixed px unit instead of using vw
  // if we decide to use flexible layout, then simply set ENABLE_FLEXIABLE_PC_LAYOUT to true
  return ENABLE_FLEXIABLE_PC_LAYOUT ? `${(px / 1440) * 100}vw` : `${px}px`;
}

export function pxToMobileVw(px) {
  return `${(px / 375) * 100}vw`;
}
