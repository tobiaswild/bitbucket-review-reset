import { describe, expect, it } from 'vitest';
import { createTranslate } from './i18n';

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
