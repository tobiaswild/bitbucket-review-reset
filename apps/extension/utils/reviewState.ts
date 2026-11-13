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
  | { kind: 'files'; count: number }
  | { kind: 'commit'; hash: string }
  | { kind: 'expires'; at: number }
  | { kind: 'unknown' };

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

  if (key.endsWith(':files-reviewed-state')) {
    if (Array.isArray(parsed)) return { kind: 'files', count: parsed.length };
    if (typeof parsed === 'object' && parsed !== null) {
      const count = Object.values(parsed).filter(
        (reviewed) => reviewed !== false && reviewed != null,
      ).length;
      return { kind: 'files', count };
    }
  }

  return { kind: 'unknown' };
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

/** Removes the PR's keys and returns what they held, so the reset can be undone. */
export function clearReviewKeys(ref: string): Record<string, string> {
  const escaped = ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(^|:)${escaped}(:|$)`);
  const removed: Record<string, string> = {};
  for (const key of Object.keys(localStorage)) {
    if (!pattern.test(key)) continue;
    removed[key] = localStorage.getItem(key) ?? '';
    localStorage.removeItem(key);
  }
  return removed;
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
