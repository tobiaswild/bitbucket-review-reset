import { forgetTab, initBadgeStyle, setReviewBadge } from '@/utils/badge';
import {
  createMenus,
  RESET_MENU_ID,
  syncUndoMenu,
  UNDO_MENU_ID,
} from '@/utils/contextMenu';
import { isDidResetMessage, isReviewStateMessage } from '@/utils/messages';
import { afterPageReset, resetTab, undoTab } from '@/utils/reset';
import { watchBackup } from '@/utils/undo';

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

  browser.contextMenus.onClicked.addListener((info, tab) => {
    ACTIONS[String(info.menuItemId)]?.(tab);
  });

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
