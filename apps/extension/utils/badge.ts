// MV2 (Firefox) only has browserAction.
const action = browser.action ?? browser.browserAction;

/** What the badge shows per tab when nothing is flashing, so a flash can restore it. */
const badgeTexts = new Map<number, string>();

export function badgeText(count: number | null): string {
  if (!count) return '';
  return count > 999 ? '999+' : String(count);
}

/** Shows the number of viewed files on the tab's toolbar icon (nothing for none). */
export async function setReviewBadge(tabId: number, count: number | null) {
  const text = badgeText(count);
  badgeTexts.set(tabId, text);
  await action.setBadgeText({ tabId, text });
}

export function forgetTab(tabId: number) {
  badgeTexts.delete(tabId);
}

/** Briefly shows `text` on the tab's icon, as feedback when the page isn't reloaded. */
export async function flashBadge(tabId: number, text: string) {
  await action.setBadgeText({ tabId, text });
  setTimeout(() => {
    action
      .setBadgeText({ tabId, text: badgeTexts.get(tabId) ?? '' })
      .catch(() => {});
  }, 3000);
}

export async function initBadgeStyle() {
  await action.setBadgeBackgroundColor({ color: '#0c66e4' });
  // Not in every browser; the default text color is fine where it's missing.
  await action.setBadgeTextColor?.({ color: '#ffffff' });
}
