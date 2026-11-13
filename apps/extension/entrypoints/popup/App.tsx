import { Fragment, useEffect, useState } from 'react';
import { t } from '@/utils/i18n';
import {
  clearReviewKeys,
  describeReviewEntry,
  fetchRepoFullName,
  isUuidSegment,
  listReviewKeys,
  type PullRequest,
  parsePrFromUrl,
  restoreReviewKeys,
  type StoredKey,
  withSlugs,
} from '@/utils/reviewState';
import { reloadAfterReset } from '@/utils/settings';
import { clearBackup, type Entries, getBackup, saveBackup } from '@/utils/undo';

const buttonClass =
  'w-full cursor-pointer rounded bg-accent px-3 py-2 font-semibold text-accent-fg hover:bg-accent-hover';
const secondaryButtonClass =
  'mt-2 w-full cursor-pointer rounded border border-accent bg-transparent px-3 py-2 font-semibold text-accent hover:border-accent-hover hover:text-accent-hover';

/** Result of a reset or undo; `reloaded` is false when the reload setting is off. */
interface Done {
  tabId: number;
  count: number;
  reloaded: boolean;
}

type State =
  | { status: 'loading' }
  | { status: 'not-pr' }
  | { status: 'uuid-url'; tabId: number; url: string; pr: PullRequest }
  | {
      status: 'ready';
      tabId: number;
      pr: PullRequest;
      keys: StoredKey[];
      backup: Entries | null;
    }
  | ({ status: 'cleared'; ref: string; entries: Entries } & Done)
  | ({ status: 'restored' } & Done)
  | { status: 'error'; message: string };

function formatDate(at: number): string {
  return new Date(at).toLocaleString(document.documentElement.lang || [], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

interface Summary {
  files?: number;
  commit?: string;
  expiresAt?: number;
  /** Some values weren't understood, so the raw keys are worth a look. */
  hasUnknown: boolean;
}

function summarize(keys: StoredKey[]): Summary {
  const summary: Summary = { hasUnknown: false };
  for (const { key, value } of keys) {
    const entry = describeReviewEntry(key, value);
    if (entry.kind === 'files') summary.files = entry.count;
    else if (entry.kind === 'commit') summary.commit = entry.hash;
    else if (entry.kind === 'expires') summary.expiresAt = entry.at;
    else summary.hasUnknown = true;
  }
  return summary;
}

function ReviewSummary({ keys }: { keys: StoredKey[] }) {
  const { files, commit, expiresAt, hasUnknown } = summarize(keys);
  const details: Array<[label: string, value: string, mono?: boolean]> = [];
  if (commit) details.push([t('popup.lastCommit'), commit.slice(0, 12), true]);
  if (expiresAt !== undefined) {
    details.push([
      expiresAt < Date.now() ? t('popup.expired') : t('popup.expires'),
      formatDate(expiresAt),
    ]);
  }

  return (
    <div className="mb-3">
      {(files !== undefined || details.length > 0) && (
        <div className="rounded bg-surface px-3 py-2.5">
          {files !== undefined && (
            <p className="m-0 flex items-baseline gap-1.5">
              <span className="text-lg font-semibold tabular-nums">
                {files}
              </span>
              <span>{t('popup.filesViewed', files)}</span>
            </p>
          )}
          {details.length > 0 && (
            <dl
              className={`m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[12px] ${files !== undefined ? 'mt-2 border-t border-bg pt-2' : ''}`}
            >
              {details.map(([label, value, mono]) => (
                <Fragment key={label}>
                  <dt className="text-muted">{label}</dt>
                  <dd className={`m-0 truncate ${mono ? 'font-mono' : ''}`}>
                    {value}
                  </dd>
                </Fragment>
              ))}
            </dl>
          )}
        </div>
      )}
      <details className="mt-2 text-[11px] text-muted" open={hasUnknown}>
        <summary className="cursor-pointer select-none">
          {t('popup.storedKeys', [String(keys.length)])}
        </summary>
        <ul className="mt-1 grid list-none grid-cols-1 gap-1 p-0">
          {keys.map(({ key, size }) => (
            <li
              key={key}
              title={key}
              className="flex justify-between gap-2 rounded bg-surface px-2 py-1"
            >
              <code className="min-w-0 truncate">{key}</code>
              <span className="shrink-0">{size} B</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

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
      const [keys, backup] = await Promise.all([
        runInTab(tab.id, listReviewKeys, [pr.ref]),
        getBackup(pr.ref),
      ]);
      setState({ status: 'ready', tabId: tab.id, pr, keys, backup });
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
    case 'restored': {
      const { count, reloaded } = state;
      let message: string;
      if (state.status === 'cleared') {
        message = reloaded
          ? t('popup.cleared', count)
          : t('popup.clearedNoReload', count);
      } else {
        message = reloaded
          ? t('popup.restored', count)
          : t('popup.restoredNoReload', count);
      }
      return (
        <>
          <p className="text-success">{message}</p>
          {!reloaded && (
            <button
              type="button"
              className={buttonClass}
              onClick={async () => {
                await browser.tabs.reload(state.tabId);
                window.close();
              }}
            >
              {t('popup.reloadNow')}
            </button>
          )}
          {!reloaded && state.status === 'cleared' && (
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => undo(state.tabId, state.ref, state.entries)}
            >
              {t('popup.undo')}
            </button>
          )}
        </>
      );
    }
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
      const { tabId, pr, keys, backup } = state;
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
              <ReviewSummary keys={keys} />
              <button
                type="button"
                className={buttonClass}
                onClick={() => reset(tabId, pr.ref)}
              >
                {t('popup.reset')}
              </button>
            </>
          )}
          {backup && (
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => undo(tabId, pr.ref, backup)}
            >
              {t('popup.undoLastReset', Object.keys(backup).length)}
            </button>
          )}
        </>
      );
    }
  }
}

export default App;
