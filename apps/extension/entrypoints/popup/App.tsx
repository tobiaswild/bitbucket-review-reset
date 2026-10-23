import { useEffect, useState } from 'react';
import { i18n } from '#i18n';
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
import './App.css';

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
  if (!injection) throw new Error(i18n.t('errors.noScriptResult'));
  return injection.result as R;
}

function App() {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    document.documentElement.lang = browser.i18n.getUILanguage();
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
        throw new Error(i18n.t('errors.noRepoName'));
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
      return <p className="muted">{i18n.t('loading')}</p>;
    case 'not-pr':
      return <p className="muted">{i18n.t('popup.notPr')}</p>;
    case 'error':
      return <p className="error">{state.message}</p>;
    case 'cleared':
      return <p className="success">{i18n.t('popup.cleared', state.count)}</p>;
    case 'uuid-url':
      return (
        <>
          <p className="muted">{i18n.t('popup.uuidNotice')}</p>
          <button
            type="button"
            onClick={() => openCanonical(state.tabId, state.url, state.pr)}
          >
            {i18n.t('popup.openRegularUrl')}
          </button>
          <p className="muted settings-link">
            <button
              type="button"
              className="link"
              onClick={() => browser.runtime.openOptionsPage()}
            >
              {i18n.t('popup.redirectAutomatically')}
            </button>
          </p>
        </>
      );
    case 'ready': {
      const { tabId, pr, keys } = state;
      return (
        <>
          <h1>
            {pr.workspace}/{pr.repo} <span className="pr-id">#{pr.id}</span>
          </h1>
          {keys.length === 0 ? (
            <p className="muted">{i18n.t('popup.noState')}</p>
          ) : (
            <>
              <ul className="keys">
                {keys.map(({ key, size }) => (
                  <li key={key} title={key}>
                    <code>{key}</code>
                    <span className="size">{size} B</span>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => reset(tabId, pr.ref)}>
                {i18n.t('popup.reset')}
              </button>
            </>
          )}
        </>
      );
    }
  }
}

export default App;
