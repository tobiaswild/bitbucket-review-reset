import { useEffect, useState } from 'react';
import { t } from '@/utils/i18n';
import {
  clearReviewKeys,
  fetchRepoFullName,
  isUuidSegment,
  listReviewKeys,
  type PullRequest,
  parsePrFromUrl,
  type StoredKey,
  withSlugs,
} from '@/utils/reviewState';

const buttonClass =
  'w-full cursor-pointer rounded bg-accent px-3 py-2 font-semibold text-accent-fg hover:bg-accent-hover';

type State =
  | { status: 'loading' }
  | { status: 'not-pr' }
  | { status: 'uuid-url'; tabId: number; url: string; pr: PullRequest }
  | { status: 'ready'; tabId: number; pr: PullRequest; keys: StoredKey[] }
  | { status: 'cleared'; count: number }
  | { status: 'error'; message: string };

async function runInTab<A extends unknown[], R>(
  tabId: number,
  func: (...args: A) => R,
  args: A,
): Promise<R> {
  const [injection] = await browser.scripting.executeScript({
    target: { tabId },
    func,
    args,
  });
  if (!injection) throw new Error(t('errors.noScriptResult'));
  return injection.result as R;
}

function App() {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    (async () => {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      const pr = tab?.url ? parsePrFromUrl(tab.url) : null;
      if (!tab?.id || !tab.url || !pr) {
        setState({ status: 'not-pr' });
        return;
      }
      if (isUuidSegment(pr.workspace) || isUuidSegment(pr.repo)) {
        setState({ status: 'uuid-url', tabId: tab.id, url: tab.url, pr });
        return;
      }
      const keys = await runInTab(tab.id, listReviewKeys, [pr.ref]);
      setState({ status: 'ready', tabId: tab.id, pr, keys });
    })().catch((error) =>
      setState({ status: 'error', message: String(error) }),
    );
  }, []);

  async function openCanonical(tabId: number, url: string, pr: PullRequest) {
    try {
      const fullName = await runInTab(tabId, fetchRepoFullName, [
        pr.workspace,
        pr.repo,
      ]);
      if (!fullName) {
        throw new Error(t('errors.noRepoName'));
      }
      await browser.tabs.update(tabId, { url: withSlugs(url, fullName) });
      window.close();
    } catch (error) {
      setState({ status: 'error', message: String(error) });
    }
  }

  async function reset(tabId: number, ref: string) {
    try {
      const count = await runInTab(tabId, clearReviewKeys, [ref]);
      await browser.tabs.reload(tabId);
      setState({ status: 'cleared', count });
      setTimeout(() => window.close(), 1200);
    } catch (error) {
      setState({ status: 'error', message: String(error) });
    }
  }

  switch (state.status) {
    case 'loading':
      return <p className="text-muted">{t('loading')}</p>;
    case 'not-pr':
      return <p className="text-muted">{t('popup.notPr')}</p>;
    case 'error':
      return <p className="wrap-break-word text-danger">{state.message}</p>;
    case 'cleared':
      return <p className="text-success">{t('popup.cleared', state.count)}</p>;
    case 'uuid-url':
      return (
        <>
          <p className="text-muted">{t('popup.uuidNotice')}</p>
          <button
            type="button"
            className={buttonClass}
            onClick={() => openCanonical(state.tabId, state.url, state.pr)}
          >
            {t('popup.openRegularUrl')}
          </button>
          <p className="mt-2 text-muted">
            <button
              type="button"
              className="cursor-pointer bg-transparent p-0 text-accent underline hover:text-accent-hover"
              onClick={() => browser.runtime.openOptionsPage()}
            >
              {t('popup.redirectAutomatically')}
            </button>
          </p>
        </>
      );
    case 'ready': {
      const { tabId, pr, keys } = state;
      return (
        <>
          <h1 className="mb-3 break-all text-sm font-semibold">
            {pr.workspace}/{pr.repo}{' '}
            <span className="font-normal text-muted">#{pr.id}</span>
          </h1>
          {keys.length === 0 ? (
            <p className="text-muted">{t('popup.noState')}</p>
          ) : (
            <>
              <ul className="mb-3 grid list-none grid-cols-1 gap-1 p-0">
                {keys.map(({ key, size }) => (
                  <li
                    key={key}
                    title={key}
                    className="flex justify-between gap-2 rounded bg-surface px-2 py-1.5"
                  >
                    <code className="min-w-0 truncate text-[11px]">{key}</code>
                    <span className="shrink-0 text-[11px] text-muted">
                      {size} B
                    </span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className={buttonClass}
                onClick={() => reset(tabId, pr.ref)}
              >
                {t('popup.reset')}
              </button>
            </>
          )}
        </>
      );
    }
  }
}

export default App;
