import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearReviewKeys,
  isReviewKeyFor,
  listReviewKeys,
  parsePrFromUrl,
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
