import { storage } from 'wxt/utils/storage';

/** How long after a reset it can still be undone. */
export const UNDO_WINDOW_MS = 10 * 60 * 1000;

export type Entries = Record<string, string>;

interface ResetBackup {
  ref: string;
  entries: Entries;
  at: number;
}

// Session storage: kept across popup openings and page reloads, gone when the browser closes.
const lastReset = storage.defineItem<ResetBackup | null>('session:lastReset', {
  fallback: null,
});

/** Remembers the entries a reset removed, replacing any earlier backup. */
export async function saveBackup(
  ref: string,
  entries: Entries,
  now = Date.now(),
): Promise<void> {
  if (Object.keys(entries).length === 0) return;
  await lastReset.setValue({ ref, entries, at: now });
}

/** The entries of the last reset of `ref`, if it is still within the undo window. */
export async function getBackup(
  ref: string,
  now = Date.now(),
): Promise<Entries | null> {
  const backup = await lastReset.getValue();
  if (!backup || backup.ref !== ref || now - backup.at > UNDO_WINDOW_MS) {
    return null;
  }
  return backup.entries;
}

export async function clearBackup(): Promise<void> {
  await lastReset.removeValue();
}

/** The PR whose last reset can still be undone, and until when. */
export async function getUndoable(
  now = Date.now(),
): Promise<{ ref: string; until: number } | null> {
  const backup = await lastReset.getValue();
  if (!backup) return null;
  const until = backup.at + UNDO_WINDOW_MS;
  return now > until ? null : { ref: backup.ref, until };
}

/** Calls `onChange` whenever a reset is saved or undone, from any part of the extension. */
export function watchBackup(onChange: () => void): () => void {
  return lastReset.watch(onChange);
}
