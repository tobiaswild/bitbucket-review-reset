import { t } from '@/utils/i18n';
import { resetTab } from '@/utils/reset';

const RESET_COMMAND = 'reset-review';
const MENU_ID = 'reset-review';

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
      id: MENU_ID,
      title: t('contextMenu.reset'),
      contexts: ['page'],
      documentUrlPatterns: ['https://bitbucket.org/*/*/pull-requests/*'],
    });
  });

  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === MENU_ID) resetTab(tab);
  });

  browser.commands.onCommand.addListener(async (command, tab) => {
    if (command !== RESET_COMMAND) return;
    const [active] = tab
      ? [tab]
      : await browser.tabs.query({ active: true, currentWindow: true });
    await resetTab(active);
  });
});
