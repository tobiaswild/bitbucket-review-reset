import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import {
  cacheKey,
  cacheRepoName,
  clearRepoNameCache,
  countCachedRepoNames,
  getCachedRepoName,
  MAX_CACHED_REPO_NAMES,
  REPO_NAME_TTL_MS,
  repoNameCache,
  resolveRepoFullName,
} from './repoNameCache';

const WS = '{0f4b2c9e-1a2b-4c3d-8e9f-001122334455}';
const REPO = '{a1b2c3d4-e5f6-4a7b-8c9d-aabbccddeeff}';

beforeEach(() => {
  fakeBrowser.reset();
});

describe('cacheKey', () => {
  it('treats braces and their percent-encoding, in any case, as the same key', () => {
    expect(cacheKey(WS, REPO)).toBe(
      cacheKey(
        `%7b${WS.slice(1, -1).toUpperCase()}%7D`,
        `%7B${REPO.slice(1, -1)}%7d`,
      ),
    );
  });
});

describe('repo name cache', () => {
  it('returns a stored name until the TTL runs out', async () => {
    await cacheRepoName(WS, REPO, 'acme/web', 1_000);
    expect(await getCachedRepoName(WS, REPO, 1_000)).toBe('acme/web');
    expect(
      await getCachedRepoName(WS, REPO, 1_000 + REPO_NAME_TTL_MS - 1),
    ).toBe('acme/web');
    expect(
      await getCachedRepoName(WS, REPO, 1_000 + REPO_NAME_TTL_MS),
    ).toBeNull();
  });

  it('ignores entries dated in the future', async () => {
    await cacheRepoName(WS, REPO, 'acme/web', 5_000);
    expect(await getCachedRepoName(WS, REPO, 1_000)).toBeNull();
  });

  it('refuses names that are not workspace/repo shaped', async () => {
    await cacheRepoName(WS, REPO, '../evil', 1_000);
    expect(await countCachedRepoNames(1_000)).toBe(0);
  });

  it('ignores malformed stored data', async () => {
    await fakeBrowser.storage.local.set({
      repoNameCache: {
        [cacheKey(WS, REPO)]: { fullName: 'evil.example/x/y', savedAt: 1 },
        [cacheKey(WS, 'x')]: 'acme/web',
      },
    });
    expect(await getCachedRepoName(WS, REPO, 1)).toBeNull();
    expect(await getCachedRepoName(WS, 'x', 1)).toBeNull();

    await fakeBrowser.storage.local.set({ repoNameCache: ['acme/web'] });
    expect(await countCachedRepoNames(1)).toBe(0);
  });

  it('drops expired entries and keeps only the newest ones', async () => {
    await cacheRepoName(WS, 'old', 'acme/old', 0);
    for (let i = 1; i <= MAX_CACHED_REPO_NAMES + 5; i++) {
      await cacheRepoName(WS, `r${i}`, `acme/r${i}`, REPO_NAME_TTL_MS + i);
    }
    const stored = await repoNameCache.getValue();
    expect(Object.keys(stored)).toHaveLength(MAX_CACHED_REPO_NAMES);
    expect(stored[cacheKey(WS, 'old')]).toBeUndefined();
    expect(stored[cacheKey(WS, 'r1')]).toBeUndefined();
    expect(stored[cacheKey(WS, `r${MAX_CACHED_REPO_NAMES + 5}`)]).toBeDefined();
  });

  it('replaces an existing entry for the same key', async () => {
    await cacheRepoName(WS, REPO, 'acme/old-name', 1_000);
    await cacheRepoName(WS, REPO, 'acme/new-name', 2_000);
    expect(await getCachedRepoName(WS, REPO, 2_000)).toBe('acme/new-name');
    expect(await countCachedRepoNames(2_000)).toBe(1);
  });

  it('can be cleared', async () => {
    await cacheRepoName(WS, REPO, 'acme/web');
    await clearRepoNameCache();
    expect(await countCachedRepoNames()).toBe(0);
  });
});

describe('resolveRepoFullName', () => {
  it('fetches once and serves later lookups from the cache', async () => {
    const fetchName = vi.fn().mockResolvedValue('acme/web');
    expect(await resolveRepoFullName(WS, REPO, fetchName)).toBe('acme/web');
    expect(await resolveRepoFullName(WS, REPO, fetchName)).toBe('acme/web');
    expect(fetchName).toHaveBeenCalledTimes(1);
  });

  it('does not cache a failed lookup', async () => {
    const fetchName = vi.fn().mockResolvedValue(null);
    expect(await resolveRepoFullName(WS, REPO, fetchName)).toBeNull();
    expect(await resolveRepoFullName(WS, REPO, fetchName)).toBeNull();
    expect(fetchName).toHaveBeenCalledTimes(2);
  });
});
