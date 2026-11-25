import { describe, expect, it } from 'vitest';
import {
  createTranslate,
  isLanguage,
  languageForLocale,
  parseBitbucketLocale,
} from './i18n';

const t = createTranslate({
  hello: { message: 'Hello' },
  nested_key: { message: 'Hi $1, $$1 for $2' },
  items: { message: '$1 item | $1 items' },
  named: { message: 'Hello {name}' },
});

describe('createTranslate', () => {
  it('looks up flat and nested keys', () => {
    expect(t('hello')).toBe('Hello');
    expect(t('nested.key', ['A', 'B'])).toBe('Hi A, $1 for B');
  });

  it('picks the plural form from the count', () => {
    expect(t('items', 1)).toBe('1 item');
    expect(t('items', 3)).toBe('3 items');
  });

  it('applies named substitutions', () => {
    expect(t('named', { name: 'Ada' })).toBe('Hello Ada');
  });

  it('returns the key for unknown messages', () => {
    expect(t('missing')).toBe('missing');
  });
});

describe('isLanguage', () => {
  it.each(['auto', 'bitbucket', 'en', 'de'])('accepts %s', (value) => {
    expect(isLanguage(value)).toBe(true);
  });

  it.each(['', 'fr', 'EN', 'toString'])('rejects %j', (value) => {
    expect(isLanguage(value)).toBe(false);
  });
});

describe('parseBitbucketLocale', () => {
  it('reads the locale of the app data', () => {
    const script =
      'window.__app_data__ = {"marketing_consent_locale": "fr", "locale": "ja", "path": "/"}';
    expect(parseBitbucketLocale(script)).toBe('ja');
  });

  it('ignores a locale inside a string value', () => {
    const script =
      'window.__app_data__ = {"title": "\\"locale\\": \\"de\\"", "locale": "en"}';
    expect(parseBitbucketLocale(script)).toBe('en');
  });

  it('ignores other scripts and missing locales', () => {
    expect(parseBitbucketLocale('x = {"locale": "de"}')).toBeNull();
    expect(parseBitbucketLocale('window.__app_data__ = {}')).toBeNull();
  });
});

describe('languageForLocale', () => {
  it.each([
    ['de', 'de'],
    ['de-AT', 'de'],
    ['en_GB', 'en'],
    ['ja', 'en'],
  ])('maps %s to %s', (locale, code) => {
    expect(languageForLocale(locale)).toBe(code);
  });
});
