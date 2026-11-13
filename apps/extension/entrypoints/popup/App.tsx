import { useEffect, useState } from 'react';
import { t } from '@/utils/i18n';
import {
  clearReviewKeys,
  fetchRepoFullName,
  isUuidSegment,
  listReviewKeys,
  type PullRequest,
  parsePrFromUrl,
  restoreReviewKeys,
  withSlugs,
} from '@/utils/reviewState';
import { reloadAfterReset } from '@/utils/settings';
import { clearBackup, type Entries, getBackup, saveBackup } from '@/utils/undo';
import {
  type Done,
  DoneView,
  ReadyView,
  type State,
  UuidUrlView,
} from './views';

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

/** Reads the active tab and decides which view the popup starts with. */
async function loadInitialState(): Promise<State> {
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  const pr = tab?.url ? parsePrFromUrl(tab.url) : null;
  if (!tab?.id || !tab.url || !pr) return { status: 'not-pr' };
  if (isUuidSegment(pr.workspace) || isUuidSegment(pr.repo)) {
    return { status: 'uuid-url', tabId: tab.id, url: tab.url, pr };
  }
  const [keys, backup] = await Promise.all([
    runInTab(tab.id, listReviewKeys, [pr.ref]),
    getBackup(pr.ref),
  ]);
  return { status: 'ready', tabId: tab.id, pr, keys, backup };
}

function App() {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    (async () => {
      try {
        setState(await loadInitialState());
      } catch (error) {
        setState({ status: 'error', message: String(error) });
      }
    })();
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

  /** Shows the result and reloads the tab unless the user turned that off. */
  async function finish(state: Extract<State, Done>) {
    setState(state);
    if (state.reloaded) {
      await browser.tabs.reload(state.tabId);
      setTimeout(() => window.close(), 1200);
    }
  }

  async function reset(tabId: number, ref: string) {
    try {
      const entries = await runInTab(tabId, clearReviewKeys, [ref]);
      await saveBackup(ref, entries);
      await finish({
        status: 'cleared',
        tabId,
        ref,
        entries,
        count: Object.keys(entries).length,
        reloaded: await reloadAfterReset.getValue(),
      });
    } catch (error) {
      setState({ status: 'error', message: String(error) });
    }
  }

  async function undo(tabId: number, ref: string, entries: Entries) {
    try {
      const count = await runInTab(tabId, restoreReviewKeys, [ref, entries]);
      await clearBackup();
      await finish({
        status: 'restored',
        tabId,
        count,
        reloaded: await reloadAfterReset.getValue(),
      });
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
    case 'restored':
      return <DoneView state={state} onUndo={undo} />;
    case 'uuid-url':
      return (
        <UuidUrlView
          onOpenRegularUrl={() =>
            openCanonical(state.tabId, state.url, state.pr)
          }
        />
      );
    case 'ready':
      return (
        <ReadyView
          state={state}
          onReset={() => reset(state.tabId, state.pr.ref)}
          onUndo={(backup) => undo(state.tabId, state.pr.ref, backup)}
        />
      );
  }
}

export default App;
