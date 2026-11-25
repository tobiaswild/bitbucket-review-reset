import { storage } from 'wxt/utils/storage';
import { i18n } from '#i18n';

type Translate = typeof i18n.t;
type LooseTranslate = (
  key: string,
  ...args: Array<number | string[] | Record<string, string> | undefined>
) => string;
type Messages = Record<string, { message: string }>;

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
] as const;

type LanguageCode = (typeof LANGUAGES)[number]['code'];

export type Language = 'auto' | 'bitbucket' | LanguageCode;

export function isLanguage(value: string): value is Language {
  return (
    value === 'auto' ||
    value === 'bitbucket' ||
    LANGUAGES.some(({ code }) => code === value)
  );
}

/** UI language: `auto` follows the browser, `bitbucket` follows Bitbucket, the rest is fixed. */
export const language = storage.defineItem<Language>('sync:language', {
  fallback: 'auto',
});

/** Locale Bitbucket last showed its own UI in, e.g. `en` or `ja`; null until a page was opened. */
export const bitbucketLocale = storage.defineItem<string | null>(
  'local:bitbucketLocale',
  { fallback: null },
);

/**
 * Bitbucket's UI locale from the inline script that defines `window.__app_data__`. Its
 * `<html lang>` is always `en`, whatever the UI language is.
 */
export function parseBitbucketLocale(script: string): string | null {
  if (!script.includes('__app_data__')) return null;
  return /"locale":\s*"([A-Za-z]{2,3}(?:[-_]\w+)*)"/.exec(script)?.[1] ?? null;
}

/** The translation for a locale of Bitbucket; English where there is none. */
export function languageForLocale(locale: string): LanguageCode {
  const base = locale.toLowerCase().split(/[-_]/)[0];
  return LANGUAGES.find(({ code }) => code === base)?.code ?? 'en';
}

/** The language to show, or null to leave it to the browser. */
async function resolveLanguage(): Promise<LanguageCode | null> {
  const selected = await language.getValue();
  if (selected === 'auto') return null;
  if (selected !== 'bitbucket') return selected;
  const locale = await bitbucketLocale.getValue();
  return locale ? languageForLocale(locale) : null;
}

let translate: Translate = i18n.t;

/** Drop-in for `i18n.t` that honours the language setting after `loadTranslations()`. */
export const t = ((...args: Parameters<Translate>) =>
  (translate as (...a: unknown[]) => string)(...args)) as Translate;

/** Loads the configured language and returns it, or null if the browser's is used. */
export async function loadTranslations(): Promise<LanguageCode | null> {
  const selected = await resolveLanguage();
  if (selected === null) {
    translate = i18n.t;
    return null;
  }
  const url = new URL(
    `/_locales/${selected}/messages.json`,
    browser.runtime.getURL('/popup.html'),
  );
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url.pathname}: ${response.status}`);
  }
  const messages: Messages = await response.json();
  translate = createTranslate(messages) as unknown as Translate;
  return selected;
}

/** For the extension's own pages; call before rendering and after changing the language. */
export async function initI18n(): Promise<void> {
  document.documentElement.lang =
    (await loadTranslations()) ?? browser.i18n.getUILanguage();
}

/** Calls back when the language setting or Bitbucket's own language changes. */
export function watchLanguage(onChange: () => void): () => void {
  const unwatchSetting = language.watch(onChange);
  const unwatchLocale = bitbucketLocale.watch(onChange);
  return () => {
    unwatchSetting();
    unwatchLocale();
  };
}

// browser.i18n can't be told to use another locale, so for a fixed language
// we read the generated `_locales/<lang>/messages.json` and mirror what
// `@wxt-dev/i18n` does: `$1`-style substitutions, ` | `-separated plurals and
// `{name}` placeholders.
export function createTranslate(messages: Messages): LooseTranslate {
  return (key, ...args) => {
    let count: number | undefined;
    let subs: string[] | undefined;
    let named: Record<string, string> | undefined;
    for (const arg of args) {
      if (typeof arg === 'number') count = arg;
      else if (Array.isArray(arg)) subs = arg;
      else if (arg) named = arg;
    }
    if (count !== undefined && !subs) subs = [String(count)];

    const raw = messages[key.replaceAll('.', '_')]?.message;
    if (raw === undefined) {
      console.warn(`[i18n] Message not found: "${key}"`);
      return key;
    }

    let message = raw;
    if (count !== undefined) {
      const forms = message.split(' | ');
      message =
        forms.length === 3
          ? (forms[count === 0 || count === 1 ? count : 2] ?? raw)
          : (forms[count === 1 ? 0 : 1] ?? forms[0] ?? raw);
    }
    message = message.replace(/\$(\$|[1-9])/g, (_, token: string) =>
      token === '$' ? '$' : (subs?.[Number(token) - 1] ?? ''),
    );
    if (named) {
      message = message.replace(
        /\{(\w+)\}/g,
        (match, name: string) => named[name] ?? match,
      );
    }
    return message;
  };
}
