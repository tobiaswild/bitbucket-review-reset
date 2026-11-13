import { t } from '@/utils/i18n';
import { getUndoable } from '@/utils/undo';

export const RESET_MENU_ID = 'reset-review';
export const UNDO_MENU_ID = 'undo-reset';

const ALL_PULL_REQUESTS = ['https://bitbucket.org/*/*/pull-requests/*'];

/** URL patterns of one PR's pages (`ws/repo/7`), without matching `ws/repo/70`. */
export function pullRequestPatterns(ref: string): string[] {
  const [workspace, repo, id] = ref.split('/');
  const base = `https://bitbucket.org/${workspace}/${repo}/pull-requests/${id}`;
  return [base, `${base}/*`, `${base}?*`];
}

export function createMenus() {
  browser.contextMenus.create({
    id: RESET_MENU_ID,
    title: t('contextMenu.reset'),
    contexts: ['page'],
    documentUrlPatterns: ALL_PULL_REQUESTS,
  });
  browser.contextMenus.create({
    id: UNDO_MENU_ID,
    title: t('contextMenu.undo'),
    contexts: ['page'],
    documentUrlPatterns: ALL_PULL_REQUESTS,
    visible: false,
  });
}

let hideTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Shows "Undo last reset" only on the pages of the PR that was last reset, while that can still be
 * undone. Call it whenever the backup changes.
 */
export async function syncUndoMenu(now = Date.now()) {
  clearTimeout(hideTimer);
  const undoable = await getUndoable(now);
  if (!undoable) {
    await browser.contextMenus.update(UNDO_MENU_ID, { visible: false });
    return;
  }
  await browser.contextMenus.update(UNDO_MENU_ID, {
    visible: true,
    documentUrlPatterns: pullRequestPatterns(undoable.ref),
  });
  hideTimer = setTimeout(
    () => {
      syncUndoMenu().catch(() => {});
    },
    undoable.until - now + 1000,
  );
}
