import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearReviewKeys,
  fetchRepoFullName,
  isReviewKeyFor,
  isUuidSegment,
  listReviewKeys,
  parsePrFromUrl,
  withSlugs,
} from './reviewState';

describe('parsePrFromUrl', () => {
  it.each([
    'https://bitbucket.org/check24/mfso-mono/pull-requests/1644',
    'https://bitbucket.org/check24/mfso-mono/pull-requests/1644/',
    'https://bitbucket.org/check24/mfso-mono/pull-requests/1644/diff',
    'https://bitbucket.org/check24/mfso-mono/pull-requests/1644/overview?w=1#chg-a.ts',
  ])('parses %s', (url) => {
    expect(parsePrFromUrl(url)).toEqual({
      workspace: 'check24',
      repo: 'mfso-mono',
      id: '1644',
      ref: 'check24/mfso-mono/1644',
    });
  });

  it.each([
    'https://bitbucket.org/check24/mfso-mono/pull-requests/',
    'https://bitbucket.org/check24/mfso-mono/src/main/',
    'https://bitbucket.org/check24/mfso-mono/pull-requests/16x',
    'https://example.com/check24/mfso-mono/pull-requests/1644',
    'chrome://extensions',
    'not a url',
  ])('rejects %s', (url) => {
    expect(parsePrFromUrl(url)).toBeNull();
  });
});

describe('UUID urls', () => {
  const url =
    'https://bitbucket.org/%7Bf127bac8-d9fd-4e53-8774-011767c9bc1f%7D/%7B77be549c-a043-4b4d-8b12-9b9ecf5a8d10%7D/pull-requests/2638/diff?w=1#chg-a.ts';

  it('detects encoded and raw UUID segments', () => {
    const pr = parsePrFromUrl(url);
    expect(isUuidSegment(pr?.workspace ?? '')).toBe(true);
    expect(isUuidSegment('{f127bac8-d9fd-4e53-8774-011767c9bc1f}')).toBe(true);
    expect(isUuidSegment('check24')).toBe(false);
  });

  it('swaps in the slugs and keeps path, query and hash', () => {
    expect(withSlugs(url, 'check24/mfso-mono')).toBe(
      'https://bitbucket.org/check24/mfso-mono/pull-requests/2638/diff?w=1#chg-a.ts',
    );
  });
});

describe('isReviewKeyFor', () => {
  const ref = 'check24/mfso-mono/1644';

  it.each([
    'check24/mfso-mono/1644:files-reviewed-state',
    'last-reviewed-commit:check24/mfso-mono/1644',
    '__storejs_expire_mixin_last-reviewed-commit:check24/mfso-mono/1644',
  ])('matches %s', (key) => {
    expect(isReviewKeyFor(key, ref)).toBe(true);
  });

  it.each([
    'check24/mfso-mono/16440:files-reviewed-state',
    'last-reviewed-commit:check24/mfso-mono/164',
    'last-reviewed-commit:check24/other-repo/1644',
    'last-reviewed-commit:xcheck24/mfso-mono/1644',
    'unrelated-setting',
  ])('ignores %s', (key) => {
    expect(isReviewKeyFor(key, ref)).toBe(false);
  });
});

class MemoryStorage {
  [key: string]: unknown;
  getItem(key: string) {
    return Object.hasOwn(this, key) ? (this[key] as string) : null;
  }
  setItem(key: string, value: string) {
    this[key] = value;
  }
  removeItem(key: string) {
    delete this[key];
  }
}

describe('page scripts', () => {
  afterEach(() => vi.unstubAllGlobals());

  function seed() {
    const storage = new MemoryStorage();
    storage.setItem(
      'check24/mfso-mono/1644:files-reviewed-state',
      '{"a.ts":true}',
    );
    storage.setItem('last-reviewed-commit:check24/mfso-mono/1644', 'abc123');
    storage.setItem(
      '__storejs_expire_mixin_last-reviewed-commit:check24/mfso-mono/1644',
      '1',
    );
    storage.setItem('check24/mfso-mono/16440:files-reviewed-state', '{}');
    storage.setItem('theme', 'dark');
    vi.stubGlobal('localStorage', storage);
    return storage;
  }

  it('lists only the PR keys', () => {
    seed();
    expect(listReviewKeys('check24/mfso-mono/1644').map((k) => k.key)).toEqual([
      '__storejs_expire_mixin_last-reviewed-commit:check24/mfso-mono/1644',
      'check24/mfso-mono/1644:files-reviewed-state',
      'last-reviewed-commit:check24/mfso-mono/1644',
    ]);
  });

  it('clears only the PR keys', () => {
    const storage = seed();
    expect(clearReviewKeys('check24/mfso-mono/1644')).toBe(3);
    expect(Object.keys(storage).sort()).toEqual([
      'check24/mfso-mono/16440:files-reviewed-state',
      'theme',
    ]);
  });
});

describe('fetchRepoFullName', () => {
  const wsUuid = '%7Bf127bac8-d9fd-4e53-8774-011767c9bc1f%7D';
  const repoUuid = '{77be549c-a043-4b4d-8b12-9b9ecf5a8d10}';

  afterEach(() => vi.unstubAllGlobals());

  function stubFetch(body: unknown, ok = true) {
    const fetch = vi.fn(async () => ({ ok, json: async () => body }));
    vi.stubGlobal('fetch', fetch);
    return fetch;
  }

  it('requests the repository endpoint and returns the slug', async () => {
    const fetch = stubFetch({ full_name: 'check24/mfso-mono' });
    await expect(fetchRepoFullName(wsUuid, repoUuid)).resolves.toBe(
      'check24/mfso-mono',
    );
    expect(fetch).toHaveBeenCalledWith(
      `/!api/2.0/repositories/${wsUuid}/${repoUuid}?fields=full_name`,
      { credentials: 'same-origin' },
    );
  });

  it('accepts a slug next to a UUID', async () => {
    stubFetch({ full_name: 'check24/mfso_mono.v2' });
    await expect(fetchRepoFullName(wsUuid, 'mfso_mono.v2')).resolves.toBe(
      'check24/mfso_mono.v2',
    );
  });

  it.each([
    'a%2F..%2F..%2Fusers',
    '..',
    '.hidden',
    'repo%3Ffields=x',
    'repo?x',
    '',
  ])('does not request with segment %j', async (repo) => {
    const fetch = stubFetch({ full_name: 'check24/mfso-mono' });
    await expect(fetchRepoFullName(wsUuid, repo)).resolves.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    '//evil.com',
    'https://evil.com',
    'check24/mfso-mono/extra',
    '../x',
    'check24',
    42,
    null,
  ])('rejects full_name %j', async (fullName) => {
    stubFetch({ full_name: fullName });
    await expect(fetchRepoFullName(wsUuid, repoUuid)).resolves.toBeNull();
  });

  it('returns null on an error response', async () => {
    stubFetch({ full_name: 'check24/mfso-mono' }, false);
    await expect(fetchRepoFullName(wsUuid, repoUuid)).resolves.toBeNull();
  });
});
