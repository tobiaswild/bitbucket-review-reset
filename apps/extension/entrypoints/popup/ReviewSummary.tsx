import { Fragment } from 'react';
import { t } from '@/utils/i18n';
import { describeReviewEntry, type StoredKey } from '@/utils/reviewState';

function formatDate(at: number): string {
  return new Date(at).toLocaleString(document.documentElement.lang || [], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export interface Summary {
  files?: number;
  commit?: string;
  expiresAt?: number;
  /** Some values weren't understood, so the raw keys are worth a look. */
  hasUnknown: boolean;
}

export function summarize(keys: StoredKey[]): Summary {
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

export function ReviewSummary({ keys }: { keys: StoredKey[] }) {
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
