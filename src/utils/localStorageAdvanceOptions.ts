export interface AdvancedOptions {
  isUsingRelayer: boolean;
}

const LOCAL_STORAGE_ADVANCE_OPTIONS_KEY = 'CarrierAdvanceOptions';

export function getLocalStorageAdvanceOptions() {
  const cache = localStorage.getItem(LOCAL_STORAGE_ADVANCE_OPTIONS_KEY);
  return cache ? (JSON.parse(cache) as AdvancedOptions) : null;
}

export function setLocalStorageAdvanceOptions(options: Partial<AdvancedOptions>) {
  const oldCache = getLocalStorageAdvanceOptions();
  const newCache = { ...(oldCache || {}), ...options };
  localStorage.setItem(LOCAL_STORAGE_ADVANCE_OPTIONS_KEY, JSON.stringify(newCache));
}
