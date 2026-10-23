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

export type Language = 'auto' | (typeof LANGUAGES)[number]['code'];

/** UI language: `auto` follows the browser, anything else is fixed. */
export const language = storage.defineItem<Language>('sync:language', {
  fallback: 'auto',
});

let translate: Translate = i18n.t;

/** Drop-in for `i18n.t` that honours the language setting after `initI18n()`. */
export const t = ((...args: Parameters<Translate>) =>
  (translate as (...a: unknown[]) => string)(...args)) as Translate;

/** Loads the configured language; call before rendering and after changing it. */
export async function initI18n(): Promise<void> {
  const selected = await language.getValue();
  if (selected === 'auto') {
    translate = i18n.t;
    document.documentElement.lang = browser.i18n.getUILanguage();
    return;
  }
  const url = new URL(
    `/_locales/${selected}/messages.json`,
    browser.runtime.getURL('/popup.html'),
  );
  const messages: Messages = await (await fetch(url)).json();
  translate = createTranslate(messages) as unknown as Translate;
  document.documentElement.lang = selected;
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
