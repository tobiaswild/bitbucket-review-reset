import type { ReviewStateMessage } from '@/utils/messages';
import { countViewedFiles, parsePrFromUrl } from '@/utils/reviewState';
import { showBadge } from '@/utils/settings';

const POLL_MS = 2000;

export default defineContentScript({
  matches: ['https://bitbucket.org/*'],
  runAt: 'document_idle',
  async main(ctx) {
    let enabled = await showBadge.getValue();
    let last: number | null | undefined;

    // Bitbucket writes localStorage from this same page, which fires no `storage` event,
    // so the count is polled while the tab is visible and sent only when it changes.
    function check() {
      const pr = parsePrFromUrl(location.href);
      const count =
        enabled && pr
          ? countViewedFiles(
              localStorage.getItem(`${pr.ref}:files-reviewed-state`),
            )
          : null;
      if (count === last) return;
      last = count;
      const message: ReviewStateMessage = { type: 'review-state', count };
      browser.runtime.sendMessage(message).catch(() => {
        // Extension reloaded or background asleep; the next change retries.
        last = undefined;
      });
    }

    check();
    ctx.setInterval(() => {
      if (!document.hidden) check();
    }, POLL_MS);
    ctx.addEventListener(window, 'wxt:locationchange', check);
    ctx.addEventListener(document, 'visibilitychange', check);
    const unwatch = showBadge.watch((value) => {
      enabled = value;
      check();
    });
    ctx.onInvalidated(unwatch);
  },
});
