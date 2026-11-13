import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { afterPageReset, resetTab, undoTab } from './reset';
import { reloadAfterReset } from './settings';
import { runInTab } from './tabs';
import { getBackup, saveBackup } from './undo';

vi.mock('./tabs', () => ({ runInTab: vi.fn() }));

const url = 'https://bitbucket.org/ws/repo/pull-requests/7/diff';
const entries = { 'last-reviewed-commit:ws/repo/7': '"abc1234"' };

describe('resetTab', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.mocked(runInTab).mockReset().mockResolvedValue(entries);
    vi.spyOn(fakeBrowser.tabs, 'reload').mockResolvedValue();
    vi.spyOn(fakeBrowser.action, 'setBadgeText').mockResolvedValue();
  });

  it('clears the PR, keeps a backup and reloads', async () => {
    await resetTab({ id: 3, url } as Browser.tabs.Tab);
    expect(runInTab).toHaveBeenCalledWith(3, expect.any(Function), [
      'ws/repo/7',
      null,
    ]);
    await expect(getBackup('ws/repo/7')).resolves.toEqual(entries);
    expect(fakeBrowser.tabs.reload).toHaveBeenCalledWith(3);
  });

  it('marks the icon instead of reloading when that is turned off', async () => {
    await reloadAfterReset.setValue(false);
    await resetTab({ id: 3, url } as Browser.tabs.Tab);
    expect(fakeBrowser.tabs.reload).not.toHaveBeenCalled();
    expect(fakeBrowser.action.setBadgeText).toHaveBeenCalledWith({
      tabId: 3,
      text: '✓',
    });
  });

  it.each([
    'https://bitbucket.org/ws/repo/src/main/',
    'https://example.com/ws/repo/pull-requests/7',
  ])('ignores %s', async (other) => {
    await resetTab({ id: 3, url: other } as Browser.tabs.Tab);
    expect(runInTab).not.toHaveBeenCalled();
  });

  it('does not touch UUID links', async () => {
    await resetTab({
      id: 3,
      url: 'https://bitbucket.org/%7Bf127bac8-d9fd-4e53-8774-011767c9bc1f%7D/repo/pull-requests/7',
    } as Browser.tabs.Tab);
    expect(runInTab).not.toHaveBeenCalled();
  });
});

describe('undoTab', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.mocked(runInTab).mockReset().mockResolvedValue(1);
    vi.spyOn(fakeBrowser.tabs, 'reload').mockResolvedValue();
    vi.spyOn(fakeBrowser.action, 'setBadgeText').mockResolvedValue();
  });

  it('writes the backup back, forgets it and reloads', async () => {
    await saveBackup('ws/repo/7', entries);
    await undoTab({ id: 3, url } as Browser.tabs.Tab);
    expect(runInTab).toHaveBeenCalledWith(3, expect.any(Function), [
      'ws/repo/7',
      entries,
    ]);
    await expect(getBackup('ws/repo/7')).resolves.toBeNull();
    expect(fakeBrowser.tabs.reload).toHaveBeenCalledWith(3);
  });

  it('only marks the icon when there is nothing to undo', async () => {
    await saveBackup('ws/repo/8', entries);
    await undoTab({ id: 3, url } as Browser.tabs.Tab);
    expect(runInTab).not.toHaveBeenCalled();
    expect(fakeBrowser.action.setBadgeText).toHaveBeenCalledWith({
      tabId: 3,
      text: '–',
    });
  });
});

describe('afterPageReset', () => {
  beforeEach(() => fakeBrowser.reset());

  const message = (ref: string, extra: Record<string, string> = {}) => ({
    type: 'did-reset' as const,
    ref,
    entries: { ...entries, ...extra },
  });

  it('keeps the backup and asks for a reload', async () => {
    await expect(
      afterPageReset({ id: 3, url } as Browser.tabs.Tab, message('ws/repo/7')),
    ).resolves.toEqual({ reloaded: true });
    await expect(getBackup('ws/repo/7')).resolves.toEqual(entries);
  });

  it('drops entries that do not belong to the PR', async () => {
    await afterPageReset(
      { id: 3, url } as Browser.tabs.Tab,
      message('ws/repo/7', { theme: 'dark' }),
    );
    await expect(getBackup('ws/repo/7')).resolves.toEqual(entries);
  });

  it('ignores a ref the tab does not show', async () => {
    await expect(
      afterPageReset({ id: 3, url } as Browser.tabs.Tab, message('ws/repo/8')),
    ).resolves.toEqual({ reloaded: false });
    await expect(getBackup('ws/repo/8')).resolves.toBeNull();
  });
});
