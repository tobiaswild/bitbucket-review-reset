import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { clearBackup, getBackup, saveBackup, UNDO_WINDOW_MS } from './undo';

const ref = 'check24/mfso-mono/1644';
const entries = { 'last-reviewed-commit:check24/mfso-mono/1644': '"abc1234"' };

describe('reset backup', () => {
  beforeEach(() => fakeBrowser.reset());

  it('returns the entries of the last reset of the same PR', async () => {
    await saveBackup(ref, entries, 1000);
    await expect(getBackup(ref, 1000 + UNDO_WINDOW_MS)).resolves.toEqual(
      entries,
    );
  });

  it('ignores other PRs and expired backups', async () => {
    await saveBackup(ref, entries, 1000);
    await expect(getBackup('check24/mfso-mono/1645', 1000)).resolves.toBeNull();
    await expect(getBackup(ref, 1001 + UNDO_WINDOW_MS)).resolves.toBeNull();
  });

  it('keeps the previous backup when nothing was removed', async () => {
    await saveBackup(ref, entries, 1000);
    await saveBackup(ref, {}, 2000);
    await expect(getBackup(ref, 2000)).resolves.toEqual(entries);
  });

  it('forgets the backup once cleared', async () => {
    await saveBackup(ref, entries, 1000);
    await clearBackup();
    await expect(getBackup(ref, 1000)).resolves.toBeNull();
  });
});
