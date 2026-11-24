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

/** Show a reset button on Bitbucket pull request pages. */
export const showPageButton = storage.defineItem<boolean>(
  'sync:showPageButton',
  { fallback: true },
);

export const PAGE_BUTTON_POSITIONS = ['approve', 'menu', 'floating'] as const;

export type PageButtonPosition = (typeof PAGE_BUTTON_POSITIONS)[number];

export function isPageButtonPosition(
  value: string,
): value is PageButtonPosition {
  return PAGE_BUTTON_POSITIONS.some((position) => position === value);
}

/** Where the reset button goes: next to Approve, in the "…" menu or in the bottom left corner. */
export const pageButtonPosition = storage.defineItem<PageButtonPosition>(
  'sync:pageButtonPosition',
  { fallback: 'approve' },
);

/** Show the number of viewed files on the toolbar icon. */
export const showBadge = storage.defineItem<boolean>('sync:showBadge', {
  fallback: true,
});
