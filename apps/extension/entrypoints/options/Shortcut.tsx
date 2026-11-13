import { useEffect, useState } from 'react';
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

export function Shortcut() {
  const [shortcut, setShortcut] = useState<string | null>(null);

  useEffect(() => {
    browser.commands.getAll().then((commands) => {
      const reset = commands.find(({ name }) => name === 'reset-review');
      setShortcut(reset?.shortcut ?? '');
    });
  }, []);

  if (shortcut === null) return null;
  return (
    <p className="mt-3">
      {t('options.shortcut')}{' '}
      {shortcut ? (
        <kbd className="rounded bg-surface px-1.5 py-0.5 font-mono text-[12px]">
          {shortcut}
        </kbd>
      ) : (
        <span className="text-muted">{t('options.shortcutNone')}</span>
      )}
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
    </p>
  );
}
