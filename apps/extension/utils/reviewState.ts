export interface PullRequest {
  workspace: string;
  repo: string;
  id: string;
  /** `workspace/repo/id` — the segment Bitbucket embeds in its localStorage keys. */
  ref: string;
}

export interface StoredKey {
  key: string;
  size: number;
  value: string;
}

/** What a stored entry means, as far as we can tell from its key and value. */
export type ReviewEntry =
  | { kind: 'files'; paths: string[] }
  | { kind: 'commit'; hash: string }
  | { kind: 'expires'; at: number }
  | { kind: 'unknown' };

const FILES_SUFFIX = ':files-reviewed-state';

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

/**
 * Interprets a review key's value. Bitbucket's format is undocumented (values are written by store.js,
 * which JSON-encodes them), so anything unexpected yields `unknown` and the popup falls back to the raw key.
 */
export function describeReviewEntry(key: string, value: string): ReviewEntry {
  const parsed = parseJson(value);

  if (key.startsWith('__storejs_expire_mixin_')) {
    const at = typeof parsed === 'number' ? parsed : Number.NaN;
    if (!Number.isFinite(at) || at <= 0) return { kind: 'unknown' };
    // store.js stores milliseconds; tolerate seconds just in case.
    return { kind: 'expires', at: at < 1e11 ? at * 1000 : at };
  }

  if (key.startsWith('last-reviewed-commit:')) {
    const hash = typeof parsed === 'string' ? parsed : value;
    return /^[0-9a-f]{7,64}$/i.test(hash)
      ? { kind: 'commit', hash }
      : { kind: 'unknown' };
  }

  if (key.endsWith(FILES_SUFFIX)) {
    // Bitbucket stores `{ "path/to/file": "<short hash it was viewed at>" }`.
    if (Array.isArray(parsed)) {
      return { kind: 'files', paths: parsed.map(String).sort() };
    }
    if (typeof parsed === 'object' && parsed !== null) {
      const paths = Object.entries(parsed)
        .filter(([, viewed]) => viewed !== false && viewed != null)
        .map(([path]) => path)
        .sort();
      return { kind: 'files', paths };
    }
  }

  return { kind: 'unknown' };
}

/** Number of files marked as viewed in a `files-reviewed-state` value, or `null` if there is none. */
export function countViewedFiles(value: string | null): number | null {
  if (value === null) return null;
  const entry = describeReviewEntry(FILES_SUFFIX, value);
  return entry.kind === 'files' ? entry.paths.length : null;
}

/** Which part of the review state a key belongs to, for resetting parts separately. */
export type ReviewKeyGroup = 'files' | 'commit' | 'other';

export function reviewKeyGroup(key: string): ReviewKeyGroup {
  if (key.endsWith(FILES_SUFFIX)) return 'files';
  // The expiry belongs to the commit entry and is meaningless without it.
  if (/^(?:__storejs_expire_mixin_)?last-reviewed-commit:/.test(key)) {
    return 'commit';
  }
  return 'other';
}

const PR_PATH = /^\/([^/]+)\/([^/]+)\/pull-requests\/(\d+)(?:\/|$)/;

export function parsePrFromUrl(url: string): PullRequest | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.hostname !== 'bitbucket.org') return null;

  const [, workspace, repo, id] = parsed.pathname.match(PR_PATH) ?? [];
  if (!workspace || !repo || !id) return null;

  return { workspace, repo, id, ref: `${workspace}/${repo}/${id}` };
}

const UUID_SEGMENT = /^(?:\{|%7B)[0-9a-f-]{36}(?:\}|%7D)$/i;

/** Bitbucket accepts `{uuid}` in place of a workspace/repo slug (e.g. links from emails or integrations). */
export function isUuidSegment(segment: string): boolean {
  return UUID_SEGMENT.test(segment);
}

/** Rewrites `/{ws-uuid}/{repo-uuid}/…` to `/<workspace>/<repo>/…`, keeping the rest of the URL. */
export function withSlugs(url: string, fullName: string): string {
  const parsed = new URL(url);
  const [, , , ...rest] = parsed.pathname.split('/');
  parsed.pathname = `/${fullName}/${rest.join('/')}`;
  return parsed.toString();
}

/**
 * Matches keys where `ref` is a whole `:`-delimited segment, e.g.
 * `ws/repo/1644:files-reviewed-state` or `last-reviewed-commit:ws/repo/1644`,
 * but not `ws/repo/16440:…`.
 */
export function isReviewKeyFor(key: string, ref: string): boolean {
  const escaped = ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|:)${escaped}(:|$)`).test(key);
}

// The functions below are injected into the page via chrome.scripting and are
// serialized on their own, so they must not reference anything outside their body.

export function listReviewKeys(ref: string): StoredKey[] {
  const escaped = ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(^|:)${escaped}(:|$)`);
  return Object.keys(localStorage)
    .filter((key) => pattern.test(key))
    .sort()
    .map((key) => {
      const value = localStorage.getItem(key) ?? '';
      return { key, size: value.length, value };
    });
}

/**
 * Removes the PR's keys (or only those listed in `only`) and returns what they held, so the reset
 * can be undone. `only` is `null` rather than optional because injected arguments must be serializable.
 */
export function clearReviewKeys(
  ref: string,
  only: string[] | null = null,
): Record<string, string> {
  const escaped = ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(^|:)${escaped}(:|$)`);
  const selected = only && new Set(only);
  const removed: Record<string, string> = {};
  for (const key of Object.keys(localStorage)) {
    if (!pattern.test(key) || (selected && !selected.has(key))) continue;
    removed[key] = localStorage.getItem(key) ?? '';
    localStorage.removeItem(key);
  }
  return removed;
}

/**
 * Marks single files as not viewed by dropping them from the PR's `files-reviewed-state`.
 * Returns the previous value under its key (for undo), or an empty object if nothing changed.
 */
export function unmarkReviewedFiles(
  ref: string,
  paths: string[],
): Record<string, string> {
  const key = `${ref}:files-reviewed-state`;
  const previous = localStorage.getItem(key);
  if (previous === null) return {};
  let state: unknown;
  try {
    state = JSON.parse(previous);
  } catch {
    return {};
  }
  const unmark = new Set(paths);
  let next: unknown;
  if (Array.isArray(state)) {
    next = state.filter((path) => !unmark.has(String(path)));
  } else if (typeof state === 'object' && state !== null) {
    next = Object.fromEntries(
      Object.entries(state).filter(([path]) => !unmark.has(path)),
    );
  } else {
    return {};
  }
  const value = JSON.stringify(next);
  if (value === previous) return {};
  localStorage.setItem(key, value);
  return { [key]: previous };
}

/** Writes back entries from `clearReviewKeys`; skips keys that don't belong to `ref`. */
export function restoreReviewKeys(
  ref: string,
  entries: Record<string, string>,
): number {
  const escaped = ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(^|:)${escaped}(:|$)`);
  let count = 0;
  for (const [key, value] of Object.entries(entries)) {
    if (!pattern.test(key) || typeof value !== 'string') continue;
    localStorage.setItem(key, value);
    count++;
  }
  return count;
}

/**
 * Injected into a bitbucket.org tab; uses the page's session to resolve UUIDs to `workspace/repo` slugs.
 * Only accepts `{uuid}` or slug-shaped segments, so a crafted link can't steer the request to another
 * API path, and only returns a `workspace/repo`-shaped name.
 */
export async function fetchRepoFullName(
  workspace: string,
  repo: string,
): Promise<string | null> {
  const segment = /^(?:(?:\{|%7B)[0-9a-f-]{36}(?:\}|%7D)|[\w-][\w.-]*)$/i;
  if (!segment.test(workspace) || !segment.test(repo)) return null;

  const response = await fetch(
    `/!api/2.0/repositories/${workspace}/${repo}?fields=full_name`,
    { credentials: 'same-origin' },
  );
  if (!response.ok) return null;
  const body: unknown = await response.json();
  const fullName =
    typeof body === 'object' && body !== null && 'full_name' in body
      ? body.full_name
      : undefined;
  return typeof fullName === 'string' &&
    /^[\w-][\w.-]*\/[\w-][\w.-]*$/.test(fullName)
    ? fullName
    : null;
}
