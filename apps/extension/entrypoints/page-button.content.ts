import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { t } from '@/utils/i18n';
import type { DidResetMessage, DidResetResponse } from '@/utils/messages';
import {
  clearReviewKeys,
  isUuidSegment,
  parsePrFromUrl,
} from '@/utils/reviewState';
import { showPageButton } from '@/utils/settings';

const ARM_TIMEOUT_MS = 3000;
const MESSAGE_TIMEOUT_MS = 4000;

// Lives in a shadow root, so neither side's CSS leaks into the other.
const STYLE = `
  :host { all: initial; }
  button {
    position: fixed; left: 16px; bottom: 16px; z-index: 2147483000;
    display: flex; align-items: center; gap: 6px;
    padding: 6px 12px; border: 1px solid #c1c7d0; border-radius: 999px;
    background: #ffffff; color: #172b4d; box-shadow: 0 1px 3px rgb(9 30 66 / 25%);
    font: 500 13px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    cursor: pointer; opacity: 0.85; transition: opacity 120ms;
  }
  button:hover, button:focus-visible, button[data-state="armed"] { opacity: 1; }
  button[data-state="armed"] { background: #c9372c; border-color: #c9372c; color: #ffffff; }
  button[data-state="done"] { color: #216e4e; }
  button[data-state="error"] { color: #c9372c; }
  button:disabled { cursor: default; }
  @media (prefers-color-scheme: dark) {
    button { background: #22272b; border-color: #454f59; color: #dee4ea; }
    button[data-state="done"] { color: #4bce97; }
    button[data-state="error"] { color: #f87168; }
  }
`;

type ButtonState = 'idle' | 'armed' | 'busy' | 'done' | 'error';

function createButton(ctx: ContentScriptContext) {
  const host = document.createElement('bitbucket-review-reset');
  const root = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = STYLE;
  const button = document.createElement('button');
  button.type = 'button';
  root.append(style, button);

  let timer: number | undefined;
  function show(state: ButtonState, label: string, resetAfter?: number) {
    button.dataset.state = state;
    button.textContent = label;
    button.disabled = state === 'busy';
    clearTimeout(timer);
    if (resetAfter) {
      timer = ctx.setTimeout(
        () => show('idle', t('pageButton.reset')),
        resetAfter,
      );
    }
  }
  show('idle', t('pageButton.reset'));

  async function reset() {
    const pr = parsePrFromUrl(location.href);
    if (!pr) return;
    show('busy', t('pageButton.reset'));
    try {
      // Same origin as Bitbucket, so the page's localStorage is ours to clear.
      const entries = clearReviewKeys(pr.ref);
      if (Object.keys(entries).length === 0) {
        show('done', t('pageButton.nothing'), MESSAGE_TIMEOUT_MS);
        return;
      }
      const message: DidResetMessage = {
        type: 'did-reset',
        ref: pr.ref,
        entries,
      };
      const { reloaded }: DidResetResponse =
        await browser.runtime.sendMessage(message);
      show(
        'done',
        reloaded ? t('pageButton.done') : t('pageButton.doneNoReload'),
        reloaded ? undefined : MESSAGE_TIMEOUT_MS,
      );
    } catch (error) {
      console.error('[bitbucket-review-reset] reset failed', error);
      show('error', t('pageButton.failed'), MESSAGE_TIMEOUT_MS);
    }
  }

  button.addEventListener('click', () => {
    if (button.dataset.state === 'armed') reset();
    else if (button.dataset.state !== 'busy') {
      show('armed', t('pageButton.confirm'), ARM_TIMEOUT_MS);
    }
  });

  return host;
}

export default defineContentScript({
  matches: ['https://bitbucket.org/*'],
  runAt: 'document_idle',
  async main(ctx) {
    let host: HTMLElement | null = null;

    // Bitbucket navigates between pages without reloading, so re-check on every URL change.
    async function update() {
      const pr = parsePrFromUrl(location.href);
      const wanted =
        pr !== null &&
        !isUuidSegment(pr.workspace) &&
        !isUuidSegment(pr.repo) &&
        (await showPageButton.getValue());
      if (wanted && !host) {
        host = createButton(ctx);
        document.body.append(host);
      } else if (!wanted && host) {
        host.remove();
        host = null;
      }
    }

    await update();
    ctx.addEventListener(window, 'wxt:locationchange', update);
    const unwatch = showPageButton.watch(update);
    ctx.onInvalidated(() => {
      unwatch();
      host?.remove();
    });
  },
});
