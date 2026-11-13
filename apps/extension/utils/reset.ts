import { flashBadge } from '@/utils/badge';
import type { DidResetMessage, DidResetResponse } from '@/utils/messages';
import {
  clearReviewKeys,
  isReviewKeyFor,
  isUuidSegment,
  parsePrFromUrl,
  restoreReviewKeys,
} from '@/utils/reviewState';
import { reloadAfterReset } from '@/utils/settings';
import { runInTab } from '@/utils/tabs';
import { clearBackup, type Entries, getBackup, saveBackup } from '@/utils/undo';

/** Clears the PR's review keys in the tab (all, or only `only`) and keeps them for undo. */
export async function clearWithBackup(
  tabId: number,
  ref: string,
  only: string[] | null = null,
): Promise<Entries> {
  const entries = await runInTab(tabId, clearReviewKeys, [ref, only]);
  await saveBackup(ref, entries);
  return entries;
}

/** Resets the PR open in `tab` without the popup; does nothing on other pages. */
export async function resetTab(tab: Browser.tabs.Tab | undefined) {
  const pr = tab?.url ? parsePrFromUrl(tab.url) : null;
  if (!tab?.id || !pr) return;
  if (isUuidSegment(pr.workspace) || isUuidSegment(pr.repo)) {
    // Review state lives under the slug URL; the popup explains how to get there.
    await flashBadge(tab.id, '!');
    return;
  }
  try {
    await clearWithBackup(tab.id, pr.ref);
    if (await reloadAfterReset.getValue()) await browser.tabs.reload(tab.id);
    else await flashBadge(tab.id, '✓');
  } catch (error) {
    console.error('[bitbucket-review-reset] reset failed', error);
    await flashBadge(tab.id, '!');
  }
}

/** Writes back the last reset of the PR open in `tab`, if it is still within the undo window. */
export async function undoTab(tab: Browser.tabs.Tab | undefined) {
  const pr = tab?.url ? parsePrFromUrl(tab.url) : null;
  if (!tab?.id || !pr) return;
  const backup = await getBackup(pr.ref);
  if (!backup) {
    await flashBadge(tab.id, '–');
    return;
  }
  try {
    await runInTab(tab.id, restoreReviewKeys, [pr.ref, backup]);
    await clearBackup();
    if (await reloadAfterReset.getValue()) await browser.tabs.reload(tab.id);
    else await flashBadge(tab.id, '↺');
  } catch (error) {
    console.error('[bitbucket-review-reset] undo failed', error);
    await flashBadge(tab.id, '!');
  }
}

/**
 * Finishes a reset the page button did in `tab`: keeps the entries for undo and reports whether the
 * caller should expect a reload. Only accepts entries of the PR the tab actually shows.
 */
export async function afterPageReset(
  tab: Browser.tabs.Tab,
  { ref, entries }: DidResetMessage,
): Promise<DidResetResponse> {
  const pr = tab.url ? parsePrFromUrl(tab.url) : null;
  if (!pr || pr.ref !== ref) return { reloaded: false };
  const own = Object.fromEntries(
    Object.entries(entries).filter(([key]) => isReviewKeyFor(key, ref)),
  );
  await saveBackup(ref, own);
  return { reloaded: await reloadAfterReset.getValue() };
}
