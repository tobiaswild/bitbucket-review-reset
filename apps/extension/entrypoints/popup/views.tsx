import { t } from '@/utils/i18n';
import type { PullRequest, StoredKey } from '@/utils/reviewState';
import type { Entries } from '@/utils/undo';
import { ReviewSummary } from './ReviewSummary';

const buttonClass =
  'w-full cursor-pointer rounded bg-accent px-3 py-2 font-semibold text-accent-fg hover:bg-accent-hover';
const secondaryButtonClass =
  'mt-2 w-full cursor-pointer rounded border border-accent bg-transparent px-3 py-2 font-semibold text-accent hover:border-accent-hover hover:text-accent-hover';

/** Result of a reset or undo; `reloaded` is false when the reload setting is off. */
export interface Done {
  tabId: number;
  count: number;
  reloaded: boolean;
}

export type State =
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

export function DoneView({
  state,
  onUndo,
}: {
  state: Extract<State, Done>;
  onUndo: (tabId: number, ref: string, entries: Entries) => void;
}) {
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
          onClick={() => onUndo(state.tabId, state.ref, state.entries)}
        >
          {t('popup.undo')}
        </button>
      )}
    </>
  );
}

export function UuidUrlView({
  onOpenRegularUrl,
}: {
  onOpenRegularUrl: () => void;
}) {
  return (
    <>
      <p className="text-muted">{t('popup.uuidNotice')}</p>
      <button type="button" className={buttonClass} onClick={onOpenRegularUrl}>
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
}

export function ReadyView({
  state,
  onReset,
  onUndo,
}: {
  state: Extract<State, { status: 'ready' }>;
  onReset: () => void;
  onUndo: (backup: Entries) => void;
}) {
  const { pr, keys, backup } = state;
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
          <button type="button" className={buttonClass} onClick={onReset}>
            {t('popup.reset')}
          </button>
        </>
      )}
      {backup && (
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() => onUndo(backup)}
        >
          {t('popup.undoLastReset', Object.keys(backup).length)}
        </button>
      )}
    </>
  );
}
