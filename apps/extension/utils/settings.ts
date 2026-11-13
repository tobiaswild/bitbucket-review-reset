import { storage } from 'wxt/utils/storage';

/** Redirect UUID-based PR links to the regular workspace/repo URL on load. */
export const autoRedirectUuid = storage.defineItem<boolean>(
  'sync:autoRedirectUuid',
  { fallback: false },
);

/** Reload the tab after resetting so Bitbucket picks up the cleared state. */
export const reloadAfterReset = storage.defineItem<boolean>(
  'sync:reloadAfterReset',
  { fallback: true },
);
