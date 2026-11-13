import { storage } from 'wxt/utils/storage';

/** How long a resolved name is trusted before Bitbucket is asked again (repos can be renamed or moved). */
export const REPO_NAME_TTL_MS = 14 * 24 * 60 * 60 * 1000;
/** Upper bound on stored names; the oldest are dropped first. */
export const MAX_CACHED_REPO_NAMES = 200;

interface CacheEntry {
  fullName: string;
  savedAt: number;
}

type Cache = Record<string, CacheEntry>;

const FULL_NAME = /^[\w-][\w.-]*\/[\w-][\w.-]*$/;

/**
 * Resolved `workspace/repo` names for UUID-based PR links, keyed by the URL segments.
 * Kept in `local:` storage so the names never leave this browser via sync.
 */
export const repoNameCache = storage.defineItem<Cache>('local:repoNameCache', {
  fallback: {},
});

function isCacheEntry(value: unknown): value is CacheEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    'fullName' in value &&
    typeof value.fullName === 'string' &&
    FULL_NAME.test(value.fullName) &&
    'savedAt' in value &&
    typeof value.savedAt === 'number' &&
    Number.isFinite(value.savedAt)
  );
}

function isFresh(entry: CacheEntry, now: number): boolean {
  return entry.savedAt <= now && now - entry.savedAt < REPO_NAME_TTL_MS;
}

/** `{UUID}` and `%7BUUID%7D` (and any letter case) map to the same key. */
export function cacheKey(workspace: string, repo: string): string {
  const normalize = (segment: string) =>
    segment.replace(/^%7B/i, '{').replace(/%7D$/i, '}').toLowerCase();
  return `${normalize(workspace)}/${normalize(repo)}`;
}

/** Storage may hold anything (older versions, manual edits), so entries are validated on read. */
async function readCache(): Promise<Record<string, unknown>> {
  const value: unknown = await repoNameCache.getValue();
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : {};
}

export async function getCachedRepoName(
  workspace: string,
  repo: string,
  now = Date.now(),
): Promise<string | null> {
  const entry: unknown = (await readCache())[cacheKey(workspace, repo)];
  return isCacheEntry(entry) && isFresh(entry, now) ? entry.fullName : null;
}

export async function cacheRepoName(
  workspace: string,
  repo: string,
  fullName: string,
  now = Date.now(),
): Promise<void> {
  if (!FULL_NAME.test(fullName)) return;
  const entries = Object.entries(await readCache()).filter(
    (pair): pair is [string, CacheEntry] =>
      isCacheEntry(pair[1]) && isFresh(pair[1], now),
  );
  entries.push([cacheKey(workspace, repo), { fullName, savedAt: now }]);
  // Later entries win on duplicate keys, so the fresh one replaces any old one.
  const deduped = Object.entries(Object.fromEntries(entries));
  deduped.sort(([, a], [, b]) => b.savedAt - a.savedAt);
  await repoNameCache.setValue(
    Object.fromEntries(deduped.slice(0, MAX_CACHED_REPO_NAMES)),
  );
}

/** Number of entries still within their TTL. */
export async function countCachedRepoNames(now = Date.now()): Promise<number> {
  return Object.values(await readCache()).filter(
    (entry) => isCacheEntry(entry) && isFresh(entry, now),
  ).length;
}

export async function clearRepoNameCache(): Promise<void> {
  await repoNameCache.removeValue();
}

/** Returns the cached name, or calls `fetchName` and caches a successful result. */
export async function resolveRepoFullName(
  workspace: string,
  repo: string,
  fetchName: () => Promise<string | null>,
): Promise<string | null> {
  const cached = await getCachedRepoName(workspace, repo);
  if (cached) return cached;
  const fullName = await fetchName();
  if (fullName) await cacheRepoName(workspace, repo, fullName);
  return fullName;
}
