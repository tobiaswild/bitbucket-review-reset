import { describe, expect, it } from 'vitest';
import { isDidResetMessage, isReviewStateMessage } from './messages';

describe('isDidResetMessage', () => {
  it('accepts a well-formed message', () => {
    expect(
      isDidResetMessage({ type: 'did-reset', ref: 'a/b/1', entries: {} }),
    ).toBe(true);
  });

  it.each([
    null,
    'did-reset',
    { type: 'other', ref: 'a/b/1', entries: {} },
    { type: 'did-reset', ref: 1, entries: {} },
    { type: 'did-reset', ref: 'a/b/1', entries: null },
    { type: 'did-reset', ref: 'a/b/1', entries: { k: 1 } },
  ])('rejects %j', (message) => {
    expect(isDidResetMessage(message)).toBe(false);
  });
});

describe('isReviewStateMessage', () => {
  it.each([0, 8, null])('accepts count %j', (count) => {
    expect(isReviewStateMessage({ type: 'review-state', count })).toBe(true);
  });

  it.each([-1, 1.5, '3', undefined])('rejects count %j', (count) => {
    expect(isReviewStateMessage({ type: 'review-state', count })).toBe(false);
  });
});
