import {
  fetchRepoFullName,
  isUuidSegment,
  parsePrFromUrl,
  withSlugs,
} from '@/utils/reviewState';
import { autoRedirectUuid } from '@/utils/settings';

export default defineContentScript({
  matches: ['https://bitbucket.org/*'],
  runAt: 'document_start',
  async main() {
    const pr = parsePrFromUrl(location.href);
    if (!pr || !(isUuidSegment(pr.workspace) || isUuidSegment(pr.repo))) return;
    if (!(await autoRedirectUuid.getValue())) return;

    const fullName = await fetchRepoFullName(pr.workspace, pr.repo);
    if (fullName) location.replace(withSlugs(location.href, fullName));
  },
});
