import { storage } from 'wxt/utils/storage';

/** Redirect UUID-based PR links to the regular workspace/repo URL on load. */
export const autoRedirectUuid = storage.defineItem<boolean>(
  'sync:autoRedirectUuid',
  { fallback: false },
);
