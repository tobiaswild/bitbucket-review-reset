import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import {
  buildRedirectRules,
  invalidateRepoName,
  LOOP_GUARD_MS,
  syncRedirectRules,
} from './redirectRules';
import { cacheKey, cacheRepoName, getCachedRepoName } from './repoNameCache';
import { autoRedirectUuid } from './settings';

const WS = '{0f4b2c9e-1a2b-4c3d-8e9f-001122334455}';
const REPO = '{a1b2c3d4-e5f6-4a7b-8c9d-aabbccddeeff}';

/** Applies a rule like the browser would (JS regex is close enough to RE2 for these patterns). */
function apply(
  rule: ReturnType<typeof buildRedirectRules>[number],
  url: string,
): string | null {
  const flags = rule.condition.isUrlFilterCaseSensitive ? '' : 'i';
  const pattern = new RegExp(rule.condition.regexFilter, flags);
  // The browser matches the normalized URL, where `{`/`}` are always percent-encoded.
  const normalized = new URL(url).href;
  if (!pattern.test(normalized)) return null;
  return normalized.replace(
    pattern,
    rule.action.redirect.regexSubstitution.replace(/\\(\d)/g, '$$$1'),
  );
}

describe('buildRedirectRules', () => {
  const [rule] = buildRedirectRules([
    { key: cacheKey(WS, REPO), fullName: 'acme/web' },
  ]);
  if (!rule) throw new Error('expected a rule');

  it.each([
    [
      `https://bitbucket.org/${WS}/${REPO}/pull-requests/12`,
      'https://bitbucket.org/acme/web/pull-requests/12',
    ],
    [
      `https://bitbucket.org/%7B${WS.slice(1, -1).toUpperCase()}%7D/%7b${REPO.slice(1, -1)}%7d/pull-requests/12/diff?w=1`,
      'https://bitbucket.org/acme/web/pull-requests/12/diff?w=1',
    ],
  ])('redirects %s', (from, to) => {
    expect(apply(rule, from)).toBe(to);
  });

  it.each([
    `https://bitbucket.org/${WS}/${REPO}/src/main`,
    `https://bitbucket.org/${WS}/${REPO}/pull-requests/12x`,
    `https://bitbucket.org/${WS}/{00000000-0000-0000-0000-000000000000}/pull-requests/12`,
    `https://evil.example/https://bitbucket.org/${WS}/${REPO}/pull-requests/12`,
  ])('leaves %s alone', (url) => {
    expect(apply(rule, url)).toBeNull();
  });

  it('escapes slug segments', () => {
    const [slugRule] = buildRedirectRules([
      { key: cacheKey(WS, 'my.repo'), fullName: 'acme/my.repo' },
    ]);
    if (!slugRule) throw new Error('expected a rule');
    expect(
      apply(slugRule, `https://bitbucket.org/${WS}/myxrepo/pull-requests/1`),
    ).toBeNull();
    expect(
      apply(slugRule, `https://bitbucket.org/${WS}/my.repo/pull-requests/1`),
    ).toBe('https://bitbucket.org/acme/my.repo/pull-requests/1');
  });

  it('numbers rules from 1', () => {
    const rules = buildRedirectRules([
      { key: 'a/b', fullName: 'a/b' },
      { key: 'c/d', fullName: 'c/d' },
    ]);
    expect(rules.map((r) => r.id)).toEqual([1, 2]);
  });
});

describe('syncing rules', () => {
  let installed: { id: number }[] = [];
  const isRegexSupported = vi.fn(async (_options: unknown) => ({
    isSupported: true,
  }));

  beforeEach(() => {
    fakeBrowser.reset();
    installed = [];
    vi.spyOn(
      fakeBrowser.declarativeNetRequest,
      'getDynamicRules',
    ).mockImplementation(async () => installed as never);
    isRegexSupported.mockClear();
    Object.assign(fakeBrowser.declarativeNetRequest, { isRegexSupported });
    vi.spyOn(
      fakeBrowser.declarativeNetRequest,
      'updateDynamicRules',
    ).mockImplementation(async ({ removeRuleIds = [], addRules = [] }) => {
      installed = [
        ...installed.filter((r) => !removeRuleIds.includes(r.id)),
        ...addRules,
      ];
    });
  });

  it('installs one rule per cached name while auto-redirect is on', async () => {
    await autoRedirectUuid.setValue(true);
    await cacheRepoName(WS, REPO, 'acme/web');
    await cacheRepoName(WS, 'api', 'acme/api');
    await syncRedirectRules();
    expect(installed).toHaveLength(2);

    await autoRedirectUuid.setValue(false);
    await syncRedirectRules();
    expect(installed).toHaveLength(0);
  });

  it('drops rules the browser cannot compile', async () => {
    isRegexSupported.mockResolvedValueOnce({ isSupported: false });
    await autoRedirectUuid.setValue(true);
    await cacheRepoName(WS, 'api', 'acme/api', Date.now() - 1);
    await cacheRepoName(WS, REPO, 'acme/web');
    await syncRedirectRules();
    expect(installed.map((r) => r.id)).toEqual([2]);
  });

  it('serializes overlapping syncs', async () => {
    await autoRedirectUuid.setValue(true);
    await cacheRepoName(WS, REPO, 'acme/web');
    await Promise.all([syncRedirectRules(), syncRedirectRules()]);
    expect(installed.map((r) => r.id)).toEqual([1]);
  });

  it('removes an invalidated entry and guards against redirect loops', async () => {
    await autoRedirectUuid.setValue(true);
    await cacheRepoName(WS, REPO, 'acme/web');
    const key = cacheKey(WS, REPO);

    expect(await invalidateRepoName(key, 1_000)).toBe(true);
    expect(await getCachedRepoName(WS, REPO)).toBeNull();
    expect(installed).toHaveLength(0);

    expect(await invalidateRepoName(key, 1_000 + LOOP_GUARD_MS - 1)).toBe(
      false,
    );
    expect(await invalidateRepoName(key, 1_000 + 3 * LOOP_GUARD_MS)).toBe(true);
  });
});
