import type { ReactNode } from 'react';
import { t } from '@/utils/i18n';
import {
  describeReviewEntry,
  type ReviewKeyGroup,
  reviewKeyGroup,
  type StoredKey,
} from '@/utils/reviewState';

function formatDate(at: number): string {
  return new Date(at).toLocaleString(document.documentElement.lang || [], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export interface Summary {
  /** Paths of the files marked as viewed. */
  files?: string[];
  commit?: string;
  expiresAt?: number;
  /** Some values weren't understood, so the raw keys are worth a look. */
  hasUnknown: boolean;
}

export function summarize(keys: StoredKey[]): Summary {
  const summary: Summary = { hasUnknown: false };
  for (const { key, value } of keys) {
    const entry = describeReviewEntry(key, value);
    if (entry.kind === 'files') summary.files = entry.paths;
    else if (entry.kind === 'commit') summary.commit = entry.hash;
    else if (entry.kind === 'expires') summary.expiresAt = entry.at;
    else summary.hasUnknown = true;
  }
  return summary;
}

/** The groups present in `keys`, in display order. */
export function presentGroups(keys: StoredKey[]): ReviewKeyGroup[] {
  const present = new Set(keys.map(({ key }) => reviewKeyGroup(key)));
  return (['files', 'commit', 'other'] as const).filter((group) =>
    present.has(group),
  );
}

/** One part of the review state; with `checked` set it becomes selectable for the reset. */
function GroupRow({
  checked,
  onToggle,
  children,
}: {
  checked?: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  if (checked === undefined) return <div>{children}</div>;
  return (
    <label className="flex cursor-pointer items-start gap-2">
      <input
        type="checkbox"
        className="mt-1"
        checked={checked}
        onChange={onToggle}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </label>
  );
}

/** Truncates the directory rather than the file name when space runs out. */
function FilePath({ path }: { path: string }) {
  const slash = path.lastIndexOf('/');
  return (
    <code className="flex min-w-0 text-[11px]">
      {slash >= 0 && (
        <span className="min-w-0 truncate text-muted">
          {path.slice(0, slash + 1)}
        </span>
      )}
      <span className="shrink-0">{path.slice(slash + 1)}</span>
    </code>
  );
}

function FileList({
  paths,
  picked,
  onTogglePath,
  onUnmark,
}: {
  paths: string[];
  picked: ReadonlySet<string>;
  onTogglePath: (path: string) => void;
  onUnmark: () => void;
}) {
  return (
    <details className="mt-1.5 text-[12px]">
      <summary className="cursor-pointer select-none text-muted">
        {t('popup.showFiles')}
      </summary>
      <ul className="mt-1 max-h-48 list-none overflow-y-auto p-0">
        {paths.map((path) => (
          <li key={path}>
            <label
              title={path}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-bg"
            >
              <input
                type="checkbox"
                checked={picked.has(path)}
                onChange={() => onTogglePath(path)}
              />
              <FilePath path={path} />
            </label>
          </li>
        ))}
      </ul>
      {picked.size > 0 && (
        <button
          type="button"
          className="mt-1.5 w-full cursor-pointer rounded border border-accent bg-transparent px-2 py-1 font-semibold text-accent hover:border-accent-hover hover:text-accent-hover"
          onClick={onUnmark}
        >
          {t('popup.unmarkFiles', picked.size)}
        </button>
      )}
    </details>
  );
}

export function ReviewSummary({
  keys,
  selectable,
  excluded,
  onToggleGroup,
  pickedFiles,
  onTogglePath,
  onUnmarkFiles,
}: {
  keys: StoredKey[];
  /** Show checkboxes to reset groups separately. */
  selectable: boolean;
  excluded: ReadonlySet<ReviewKeyGroup>;
  onToggleGroup: (group: ReviewKeyGroup) => void;
  pickedFiles: ReadonlySet<string>;
  onTogglePath: (path: string) => void;
  onUnmarkFiles: () => void;
}) {
  const { files, commit, expiresAt, hasUnknown } = summarize(keys);
  const groups = presentGroups(keys);
  const checked = (group: ReviewKeyGroup) =>
    selectable ? !excluded.has(group) : undefined;
  const otherCount = keys.filter(
    ({ key }) => reviewKeyGroup(key) === 'other',
  ).length;
  const hasCommitDetails = commit !== undefined || expiresAt !== undefined;
  const showOther = selectable && otherCount > 0;
  const hasRows = files !== undefined || groups.includes('commit') || showOther;

  return (
    <div className="mb-3">
      {hasRows && (
        <div className="grid gap-2 rounded bg-surface px-3 py-2.5 [&>*+*]:border-t [&>*+*]:border-bg [&>*+*]:pt-2">
          {files !== undefined && (
            <div>
              <GroupRow
                checked={checked('files')}
                onToggle={() => onToggleGroup('files')}
              >
                <p className="m-0 flex items-baseline gap-1.5">
                  <span className="text-lg font-semibold tabular-nums">
                    {files.length}
                  </span>
                  <span>{t('popup.filesViewed', files.length)}</span>
                </p>
              </GroupRow>
              {files.length > 0 && (
                <FileList
                  paths={files}
                  picked={pickedFiles}
                  onTogglePath={onTogglePath}
                  onUnmark={onUnmarkFiles}
                />
              )}
            </div>
          )}
          {groups.includes('commit') && (
            <GroupRow
              checked={checked('commit')}
              onToggle={() => onToggleGroup('commit')}
            >
              {hasCommitDetails ? (
                <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[12px]">
                  {commit !== undefined && (
                    <>
                      <dt className="text-muted">{t('popup.lastCommit')}</dt>
                      <dd className="m-0 truncate font-mono">
                        {commit.slice(0, 12)}
                      </dd>
                    </>
                  )}
                  {expiresAt !== undefined && (
                    <>
                      <dt className="text-muted">
                        {expiresAt < Date.now()
                          ? t('popup.expired')
                          : t('popup.expires')}
                      </dt>
                      <dd className="m-0 truncate">{formatDate(expiresAt)}</dd>
                    </>
                  )}
                </dl>
              ) : (
                <span className="text-[12px]">{t('popup.lastCommit')}</span>
              )}
            </GroupRow>
          )}
          {showOther && (
            <GroupRow
              checked={checked('other')}
              onToggle={() => onToggleGroup('other')}
            >
              <span className="text-[12px]">
                {t('popup.otherEntries', [String(otherCount)])}
              </span>
            </GroupRow>
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
