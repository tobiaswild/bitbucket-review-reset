import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { pullRequestPatterns, syncUndoMenu, UNDO_MENU_ID } from './contextMenu';
import { saveBackup, UNDO_WINDOW_MS } from './undo';

describe('pullRequestPatterns', () => {
  it('covers the PR page, its sub pages and query strings', () => {
    expect(pullRequestPatterns('ws/repo/7')).toEqual([
      'https://bitbucket.org/ws/repo/pull-requests/7',
      'https://bitbucket.org/ws/repo/pull-requests/7/*',
      'https://bitbucket.org/ws/repo/pull-requests/7?*',
    ]);
  });
});

describe('syncUndoMenu', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.spyOn(fakeBrowser.contextMenus, 'update').mockResolvedValue();
  });

  it('shows undo only on the PR that was last reset', async () => {
    await saveBackup('ws/repo/7', { 'last-reviewed-commit:ws/repo/7': 'x' }, 0);
    await syncUndoMenu(1000);
    expect(fakeBrowser.contextMenus.update).toHaveBeenCalledWith(UNDO_MENU_ID, {
      visible: true,
      documentUrlPatterns: pullRequestPatterns('ws/repo/7'),
    });
  });

  it('hides undo without a backup or once it expired', async () => {
    await syncUndoMenu(0);
    expect(fakeBrowser.contextMenus.update).toHaveBeenLastCalledWith(
      UNDO_MENU_ID,
      { visible: false },
    );

    await saveBackup('ws/repo/7', { 'last-reviewed-commit:ws/repo/7': 'x' }, 0);
    await syncUndoMenu(UNDO_WINDOW_MS + 1);
    expect(fakeBrowser.contextMenus.update).toHaveBeenLastCalledWith(
      UNDO_MENU_ID,
      { visible: false },
    );
  });
});
