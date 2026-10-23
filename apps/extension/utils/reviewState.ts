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
    .map((key) => ({ key, size: localStorage.getItem(key)?.length ?? 0 }));
}

export function clearReviewKeys(ref: string): number {
  const escaped = ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(^|:)${escaped}(:|$)`);
  const keys = Object.keys(localStorage).filter((key) => pattern.test(key));
  for (const key of keys) localStorage.removeItem(key);
  return keys.length;
}

/** Injected into a bitbucket.org tab; uses the page's session to resolve UUIDs to `workspace/repo` slugs. */
export async function fetchRepoFullName(
  workspace: string,
  repo: string,
): Promise<string | null> {
  const response = await fetch(
    `/!api/2.0/repositories/${workspace}/${repo}?fields=full_name`,
    { credentials: 'same-origin' },
  );
  if (!response.ok) return null;
  const body = (await response.json()) as { full_name?: string };
  return body.full_name ?? null;
}
