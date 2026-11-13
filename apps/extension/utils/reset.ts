import {
  clearReviewKeys,
  isUuidSegment,
  parsePrFromUrl,
} from '@/utils/reviewState';
import { reloadAfterReset } from '@/utils/settings';
import { runInTab } from '@/utils/tabs';
import { type Entries, saveBackup } from '@/utils/undo';

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

// MV2 (Firefox) only has browserAction.
const action = browser.action ?? browser.browserAction;

/** Briefly marks the toolbar icon on the tab, as feedback when the page isn't reloaded. */
async function flashBadge(tabId: number, text: string) {
  await action.setBadgeText({ tabId, text });
  setTimeout(() => {
    action.setBadgeText({ tabId, text: '' }).catch(() => {});
  }, 3000);
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
