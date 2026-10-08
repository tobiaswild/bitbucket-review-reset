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

  const match = parsed.pathname.match(PR_PATH);
  if (!match) return null;

  const [, workspace, repo, id] = match as [string, string, string, string];
  return { workspace, repo, id, ref: `${workspace}/${repo}/${id}` };
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
    .map((key) => ({ key, size: localStorage.getItem(key)?.length ?? 0 }));
}

export function clearReviewKeys(ref: string): number {
  const escaped = ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(^|:)${escaped}(:|$)`);
  const keys = Object.keys(localStorage).filter((key) => pattern.test(key));
  for (const key of keys) localStorage.removeItem(key);
  return keys.length;
}
