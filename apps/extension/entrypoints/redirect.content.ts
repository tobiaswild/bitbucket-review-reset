import {
  type CachedRepoName,
  listCachedRepoNames,
  resolveRepoFullName,
} from '@/utils/repoNameCache';
import {
  fetchRepoIdentity,
  type InvalidateMessage,
  isStale,
} from '@/utils/repoVerification';
import {
  fetchRepoFullName,
  isUuidSegment,
  type PullRequest,
  parsePrFromUrl,
  withSlugs,
} from '@/utils/reviewState';
import { autoRedirectUuid } from '@/utils/settings';

/**
 * Cached UUID links are normally redirected by the browser's declarativeNetRequest rules
 * before this runs. This script covers the first visit (no rule yet) and checks, on the
 * regular URL, that a cached name still points at the same repository.
 */
export default defineContentScript({
  matches: ['https://bitbucket.org/*'],
  runAt: 'document_start',
  async main() {
    const pr = parsePrFromUrl(location.href);
    if (!pr) return;
    if (!(await autoRedirectUuid.getValue())) return;

    if (isUuidSegment(pr.workspace) || isUuidSegment(pr.repo)) {
      const fullName = await resolveRepoFullName(pr.workspace, pr.repo, () =>
        fetchRepoFullName(pr.workspace, pr.repo),
      );
      if (fullName) location.replace(withSlugs(location.href, fullName));
      return;
    }

    await verifyCachedRedirect(pr);
  },
});

/** If a cached name now leads elsewhere (renamed, moved, deleted), drop it and go back to the UUID link. */
async function verifyCachedRedirect(pr: PullRequest) {
  const fullName = `${pr.workspace}/${pr.repo}`.toLowerCase();
  const entries: CachedRepoName[] = (await listCachedRepoNames()).filter(
    (entry) => entry.fullName.toLowerCase() === fullName,
  );
  if (entries.length === 0) return;

  const identity = await fetchRepoIdentity(pr.workspace, pr.repo);
  const stale = entries.filter((entry) => isStale(entry.key, identity));

  let backTo: string | null = null;
  for (const { key } of stale) {
    const message: InvalidateMessage = { type: 'invalidate-repo-name', key };
    const response: unknown = await browser.runtime.sendMessage(message);
    const redirectBack =
      typeof response === 'object' &&
      response !== null &&
      'redirectBack' in response &&
      response.redirectBack === true;
    // With several stale keys for one name we can't tell which link was used; the first will do.
    if (redirectBack && backTo === null) backTo = key;
  }
  if (backTo) location.replace(withSlugs(location.href, backTo));
}
