import { describe, expect, it } from 'vitest';
import { summarize } from './ReviewSummary';

const files = 'ws/repo/1:files-reviewed-state';
const commit = 'last-reviewed-commit:ws/repo/1';
const expire = '__storejs_expire_mixin_last-reviewed-commit:ws/repo/1';
const hash = '0123456789abcdef0123456789abcdef01234567';

const key = (k: string, value: string) => ({ key: k, value, size: 0 });

describe('summarize', () => {
  it('combines files, commit and expiry', () => {
    expect(
      summarize([
        key(files, '{"a.ts":true,"b.ts":true}'),
        key(commit, `"${hash}"`),
        key(expire, '1700000000000'),
      ]),
    ).toEqual({
      files: 2,
      commit: hash,
      expiresAt: 1700000000000,
      hasUnknown: false,
    });
  });

  it('flags values it does not understand', () => {
    expect(summarize([key(commit, '"not a hash"')])).toEqual({
      hasUnknown: true,
    });
  });

  it('returns nothing for no keys', () => {
    expect(summarize([])).toEqual({ hasUnknown: false });
  });
});
