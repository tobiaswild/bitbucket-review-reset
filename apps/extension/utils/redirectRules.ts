import type { Browser } from 'wxt/browser';
import { storage } from 'wxt/utils/storage';
import {
  type CachedRepoName,
  listCachedRepoNames,
  removeCachedRepoName,
} from '@/utils/repoNameCache';
import { autoRedirectUuid } from '@/utils/settings';

/** Browser-native redirect from a UUID PR link to its `workspace/repo` URL. */
export interface RedirectRule {
  id: number;
  priority: 1;
  action: {
    type: 'redirect';
    redirect: { regexSubstitution: string };
  };
  condition: {
    regexFilter: string;
    isUrlFilterCaseSensitive: false;
    resourceTypes: ['main_frame'];
  };
}

const UUID_KEY_SEGMENT = /^\{([0-9a-f-]{36})\}$/;

/**
 * A cache-key segment as it appears in a request URL. Browsers always percent-encode `{` and `}`
 * in paths, so only `%7B…%7D` needs matching; allowing raw braces too pushes the compiled regex
 * past Chrome's 2KB limit.
 */
function segmentPattern(segment: string): string {
  const uuid = segment.match(UUID_KEY_SEGMENT)?.[1];
  if (uuid) return `%7B${uuid}%7D`;
  return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Only PR pages are redirected, mirroring `parsePrFromUrl`. */
export function buildRedirectRules(entries: CachedRepoName[]): RedirectRule[] {
  return entries.map(({ key, fullName }, index) => {
    const [workspace = '', repo = ''] = key.split('/');
    return {
      id: index + 1,
      priority: 1,
      action: {
        type: 'redirect',
        redirect: {
          regexSubstitution: `https://bitbucket.org/${fullName}/\\1`,
        },
      },
      condition: {
        regexFilter: `^https://bitbucket\\.org/${segmentPattern(workspace)}/${segmentPattern(repo)}/(pull-requests/[0-9]+(?:[/?].*)?)$`,
        isUrlFilterCaseSensitive: false,
        resourceTypes: ['main_frame'],
      },
    };
  });
}

/** One rejected rule fails the whole update, so unsupported regexes are dropped up front. */
async function supportedOnly(rules: RedirectRule[]): Promise<RedirectRule[]> {
  const { isRegexSupported } = browser.declarativeNetRequest;
  if (typeof isRegexSupported !== 'function') return rules;
  const supported = await Promise.all(
    rules.map(async ({ condition }) => {
      const result = await isRegexSupported({
        regex: condition.regexFilter,
        isCaseSensitive: condition.isUrlFilterCaseSensitive,
      });
      return result.isSupported;
    }),
  );
  // Ids must stay unique, not contiguous, so the kept rules keep theirs.
  return rules.filter((_, index) => supported[index]);
}

let pending: Promise<void> = Promise.resolve();

/**
 * Replaces all dynamic rules with one per cached name (none while auto-redirect is off).
 * Calls are serialized so overlapping syncs can't race on rule ids.
 */
export function syncRedirectRules(): Promise<void> {
  pending = pending
    .catch(() => {})
    .then(async () => {
      const enabled = await autoRedirectUuid.getValue();
      const rules = await supportedOnly(
        buildRedirectRules(enabled ? await listCachedRepoNames() : []),
      );
      const existing = await browser.declarativeNetRequest.getDynamicRules();
      await browser.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existing.map((rule) => rule.id),
        // The generated typings model action/resource types as TS enums, which string literals can't satisfy.
        addRules: rules as unknown as Browser.declarativeNetRequest.Rule[],
      });
    });
  return pending;
}

/** A key invalidated again within this window is not redirected back a second time. */
export const LOOP_GUARD_MS = 60_000;

const recentInvalidations = storage.defineItem<Record<string, number>>(
  'session:recentInvalidations',
  { fallback: {} },
);

/**
 * Runs in the background: drops the entry and its rule, and only then answers, so the
 * content script's redirect back to the UUID link can't hit the stale rule again.
 * Returns whether redirecting back is safe (false if this key was just invalidated).
 */
export async function invalidateRepoName(
  key: string,
  now = Date.now(),
): Promise<boolean> {
  await removeCachedRepoName(key);
  await syncRedirectRules();

  const recent = await recentInvalidations.getValue();
  const last = recent[key];
  const fresh = Object.fromEntries(
    Object.entries(recent).filter(([, at]) => now - at < LOOP_GUARD_MS),
  );
  await recentInvalidations.setValue({ ...fresh, [key]: now });
  return last === undefined || now - last >= LOOP_GUARD_MS;
}
