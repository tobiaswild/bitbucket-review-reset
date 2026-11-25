import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { loadTranslations, t, watchLanguage } from '@/utils/i18n';
import type { DidResetMessage, DidResetResponse } from '@/utils/messages';
import {
  clearReviewKeys,
  isUuidSegment,
  parsePrFromUrl,
} from '@/utils/reviewState';
import {
  type PageButtonPosition,
  pageButtonPosition,
  showPageButton,
} from '@/utils/settings';

const ARM_TIMEOUT_MS = 3000;
const PLACE_MS = 250;
const MENU_OPEN_MS = 30;
const MESSAGE_TIMEOUT_MS = 4000;

const APPROVE_SELECTOR =
  'button[aria-label="Approve this pull request"], button[aria-label="Unapprove this pull request"]';
// The trigger of the open "…" menu; the menu itself may be rendered elsewhere in the page.
const OPEN_MENU_SELECTOR =
  '[data-qa="pr-header-actions-drop-down-menu-styles"] button[aria-expanded="true"][aria-controls]';

// Lives in a shadow root, so neither side's CSS leaks into the other.
const STYLE = `
  :host { all: initial; }
  button {
    box-sizing: border-box; height: 32px; padding: 0 12px;
    border: 1px solid var(--ds-border, #0b120e24); border-radius: var(--ds-radius-medium, 6px);
    background: transparent; color: var(--ds-text-subtle, #505258);
    font: 500 14px/20px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-family: var(--ds-font-family-body, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
    white-space: nowrap; cursor: pointer;
  }
  :host([data-position="floating"]) button {
    position: fixed; left: 16px; bottom: 16px; z-index: 2147483000;
    border-radius: 999px; background: var(--ds-surface-overlay, #ffffff);
    box-shadow: var(--ds-shadow-overlay, 0 1px 3px rgb(9 30 66 / 25%));
  }
  :host([data-position="menu"]) button {
    width: 100%; border: 0; border-radius: 0; text-align: start;
    color: var(--ds-text, #292a2e); font-weight: 400;
  }
  button:hover { background: var(--ds-background-neutral-subtle-hovered, #0515240f); }
  button:focus-visible { outline: 2px solid var(--ds-border-focused, #4688ec); outline-offset: 2px; }
  :host([data-position="floating"]) button:hover { background: var(--ds-surface-overlay-hovered, #f0f1f2); }
  :host([data-position="menu"]) button:focus-visible { outline-offset: -2px; }
  :host button[data-state="done"] { color: var(--ds-text-success, #4c6b1f); }
  :host button[data-state="error"] { color: var(--ds-text-danger, #ae2e24); }
  :host button[data-state="armed"],
  :host([data-position]) button[data-state="armed"]:hover {
    border-color: transparent; background: var(--ds-background-danger-bold, #c9372c);
    color: var(--ds-text-inverse, #ffffff);
  }
  button:disabled { cursor: default; }
`;

type ButtonState = 'idle' | 'armed' | 'busy' | 'done' | 'error';

function createButton(ctx: ContentScriptContext) {
  const host = document.createElement('bitbucket-review-reset');
  // `all: initial` would otherwise keep the button visible inside a hidden header.
  host.setAttribute(
    'style',
    'display: flex !important; visibility: inherit !important; flex: none !important;',
  );
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

/**
 * The item holding the Approve button in its row of header actions. While scrolled, Bitbucket hides
 * the page header and shows a second copy of the row in a sticky one, so only a visible one counts.
 */
function findApproveItem(host: HTMLElement | null): HTMLElement | null {
  const approve = [
    ...document.querySelectorAll<HTMLElement>(APPROVE_SELECTOR),
  ].find((button) => getComputedStyle(button).visibility !== 'hidden');
  if (!approve) return null;
  // Step out of tooltip wrappers, up to the element that has the other actions as siblings.
  let item = approve;
  while (item.parentElement && item.parentElement !== document.body) {
    const siblings = [...item.parentElement.children].filter(
      (child) => child !== item && child !== host,
    );
    if (siblings.length > 0) break;
    item = item.parentElement;
  }
  return item;
}

/** The list of actions in the open "…" menu. */
function findMenuList(): HTMLElement | null {
  const id = document
    .querySelector(OPEN_MENU_SELECTOR)
    ?.getAttribute('aria-controls');
  const menu = id ? document.getElementById(id) : null;
  const item = menu?.querySelector<HTMLElement>('[role="menuitem"]');
  if (!menu || !item) return null;
  const group = item.closest<HTMLElement>('[role="group"]');
  return group && menu.contains(group) ? group : item.parentElement;
}

export default defineContentScript({
  matches: ['https://bitbucket.org/*'],
  runAt: 'document_idle',
  async main(ctx) {
    let host: HTMLElement | null = null;
    let wanted = false;
    let position: PageButtonPosition = 'approve';

    function getHost(): HTMLElement {
      if (!host) host = createButton(ctx);
      host.dataset.position = position;
      return host;
    }

    function placeFloating() {
      // Outside <body>, which Bitbucket's React app re-renders and may clear.
      if (host?.parentElement !== document.documentElement) {
        document.documentElement.append(getHost());
      }
    }

    function placeInMenu() {
      const list = findMenuList();
      // A fresh button per opening, so it never comes back still asking for the second click.
      if (!list) removeButton();
      else if (list.lastElementChild !== host) list.append(getHost());
    }

    // Left of Approve. Without an Approve button (e.g. signed out) there is nowhere to put it.
    function placeNextToApprove() {
      const item = findApproveItem(host);
      if (!item) {
        host?.remove();
        return;
      }
      if (host && item.previousElementSibling === host) return;
      const element = getHost();
      element.style.removeProperty('margin-right');
      item.before(element);
      // Only add a gap where the row's own layout has none.
      const gap =
        item.getBoundingClientRect().left -
        element.getBoundingClientRect().right;
      if (gap < 1)
        element.style.setProperty('margin-right', '4px', 'important');
    }

    function place() {
      if (!wanted) return;
      if (position === 'floating') placeFloating();
      else if (position === 'menu') placeInMenu();
      else placeNextToApprove();
    }

    function removeButton() {
      host?.remove();
      host = null;
    }

    // Bitbucket navigates between pages without reloading, so re-check on every URL change.
    async function update() {
      const pr = parsePrFromUrl(location.href);
      const newPosition = await pageButtonPosition.getValue();
      if (newPosition !== position) removeButton();
      position = newPosition;
      wanted =
        pr !== null &&
        !isUuidSegment(pr.workspace) &&
        !isUuidSegment(pr.repo) &&
        (await showPageButton.getValue());
      if (wanted) place();
      else removeButton();
    }

    async function updateLanguage() {
      try {
        await loadTranslations();
      } catch (error) {
        console.error('[bitbucket-review-reset] translations failed', error);
      }
      if (ctx.isInvalid) return;
      // The labels are set when the button is created.
      removeButton();
      await update();
    }

    await updateLanguage();
    ctx.addEventListener(window, 'wxt:locationchange', update);
    // Approve renders late, moves to the sticky header on scroll and can be re-rendered any time.
    ctx.setInterval(() => {
      if (!document.hidden) place();
    }, PLACE_MS);
    // Adds the menu entry as the menu opens instead of a moment later.
    for (const type of ['click', 'keyup'] as const) {
      ctx.addEventListener(document, type, () => {
        if (position === 'menu') ctx.setTimeout(place, MENU_OPEN_MS);
      });
    }
    const unwatchShow = showPageButton.watch(update);
    const unwatchPosition = pageButtonPosition.watch(update);
    const unwatchLanguage = watchLanguage(updateLanguage);
    ctx.onInvalidated(() => {
      unwatchLanguage();
      unwatchShow();
      unwatchPosition();
      removeButton();
    });
  },
});
