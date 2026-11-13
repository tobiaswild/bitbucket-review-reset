import type { Entries } from '@/utils/undo';

/** Sent by the page button after it cleared the review keys itself. */
export interface DidResetMessage {
  type: 'did-reset';
  ref: string;
  entries: Entries;
}

export interface DidResetResponse {
  reloaded: boolean;
}

export function isDidResetMessage(
  message: unknown,
): message is DidResetMessage {
  if (typeof message !== 'object' || message === null) return false;
  const { type, ref, entries } = message as Record<string, unknown>;
  return (
    type === 'did-reset' &&
    typeof ref === 'string' &&
    typeof entries === 'object' &&
    entries !== null &&
    Object.values(entries).every((value) => typeof value === 'string')
  );
}
