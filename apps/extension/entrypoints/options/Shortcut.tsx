import { Fragment, useEffect, useState } from 'react';
import { t } from '@/utils/i18n';

/** Opens the browser's own page for changing extension shortcuts. */
function openShortcutSettings() {
  const commands = browser.commands as typeof browser.commands & {
    openShortcutSettings?: () => Promise<void>;
  };
  // Firefox has an API for it; Chromium only allows opening its settings page.
  if (commands.openShortcutSettings) return commands.openShortcutSettings();
  return browser.tabs.create({ url: 'chrome://extensions/shortcuts' });
}

const COMMANDS = [
  { name: 'reset-review', label: 'options.shortcutReset' },
  { name: 'undo-reset', label: 'options.shortcutUndo' },
] as const;

export function Shortcut() {
  const [shortcuts, setShortcuts] = useState<Record<string, string> | null>(
    null,
  );

  useEffect(() => {
    browser.commands.getAll().then((commands) => {
      setShortcuts(
        Object.fromEntries(
          commands.map(({ name, shortcut }) => [name ?? '', shortcut ?? '']),
        ),
      );
    });
  }, []);

  if (shortcuts === null) return null;
  return (
    <div className="mt-3">
      <p className="m-0">{t('options.shortcuts')}</p>
      <dl className="my-1 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1">
        {COMMANDS.map(({ name, label }) => (
          <Fragment key={name}>
            <dt>
              {shortcuts[name] ? (
                <kbd className="rounded bg-surface px-1.5 py-0.5 font-mono text-[12px]">
                  {shortcuts[name]}
                </kbd>
              ) : (
                <span className="text-muted">{t('options.shortcutNone')}</span>
              )}
            </dt>
            <dd className="m-0">{t(label)}</dd>
          </Fragment>
        ))}
      </dl>
      <small className="block text-muted">
        {t('options.shortcutHelp')}{' '}
        <button
          type="button"
          className="cursor-pointer bg-transparent p-0 text-accent underline hover:text-accent-hover"
          onClick={openShortcutSettings}
        >
          {t('options.shortcutChange')}
        </button>
      </small>
    </div>
  );
}
