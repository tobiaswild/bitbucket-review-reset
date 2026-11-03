import { forgetTab, initBadgeStyle, setReviewBadge } from '@/utils/badge';
import {
  createMenus,
  RESET_MENU_ID,
  syncUndoMenu,
  UNDO_MENU_ID,
} from '@/utils/contextMenu';
import { isDidResetMessage, isReviewStateMessage } from '@/utils/messages';
import { invalidateRepoName, syncRedirectRules } from '@/utils/redirectRules';
import { repoNameCache } from '@/utils/repoNameCache';
import { isInvalidateMessage } from '@/utils/repoVerification';
import { afterPageReset, resetTab, undoTab } from '@/utils/reset';
import { autoRedirectUuid } from '@/utils/settings';
import { watchBackup } from '@/utils/undo';

const SYNC_ALARM = 'sync-redirect-rules';

type TabAction = (tab?: Browser.tabs.Tab) => Promise<void>;

const ACTIONS: Record<string, TabAction> = {
  [RESET_MENU_ID]: resetTab,
  [UNDO_MENU_ID]: undoTab,
};

function syncMenu() {
  syncUndoMenu().catch((error) => {
    console.error('[bitbucket-review-reset] menu update failed', error);
  });
}

export default defineBackground(() => {
  initBadgeStyle().catch(() => {});
  browser.tabs.onRemoved.addListener(forgetTab);

  // Firefox drops menus on browser restart and Chrome keeps them, so start from scratch every time
  // the background starts. That also picks up the undo state again.
  browser.contextMenus
    .removeAll()
    .then(() => {
      createMenus();
      syncMenu();
    })
    .catch((error) => {
      console.error('[bitbucket-review-reset] menu setup failed', error);
    });
  watchBackup(syncMenu);

  // Redirect rules mirror the repo name cache: rebuild whenever it or the setting changes, and
  // hourly so entries past their TTL stop redirecting.
  const syncRules = () => {
    syncRedirectRules().catch((error) =>
      console.error('Could not update redirect rules', error),
    );
  };
  repoNameCache.watch(syncRules);
  autoRedirectUuid.watch(syncRules);
  browser.runtime.onInstalled.addListener(syncRules);
  browser.runtime.onStartup.addListener(syncRules);
  browser.alarms.create(SYNC_ALARM, { periodInMinutes: 60 });
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === SYNC_ALARM) syncRules();
  });

  browser.contextMenus.onClicked.addListener((info, tab) => {
    ACTIONS[String(info.menuItemId)]?.(tab);
  });

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (isInvalidateMessage(message)) {
      if (!sender.url?.startsWith('https://bitbucket.org/')) return;
      invalidateRepoName(message.key).then(
        (redirectBack) => sendResponse({ redirectBack }),
        () => sendResponse({ redirectBack: false }),
      );
      return true; // keeps sendResponse alive for the async reply
    }
    const tab = sender.tab;
    if (sender.id !== browser.runtime.id || !tab?.id) return;
    if (isReviewStateMessage(message)) {
      setReviewBadge(tab.id, message.count).catch(() => {});
      return;
    }
    if (!isDidResetMessage(message)) return;
    afterPageReset(tab, message).then(
      (response) => {
        sendResponse(response);
        if (response.reloaded && tab.id) browser.tabs.reload(tab.id);
      },
      (error) => {
        console.error('[bitbucket-review-reset] page reset failed', error);
        sendResponse({ reloaded: false });
      },
    );
    return true; // keeps sendResponse alive for the async reply
  });

  // Command names match the menu ids.
  browser.commands.onCommand.addListener(async (command, tab) => {
    const run = ACTIONS[command];
    if (!run) return;
    const [active] = tab
      ? [tab]
      : await browser.tabs.query({ active: true, currentWindow: true });
    await run(active);
  });
});
