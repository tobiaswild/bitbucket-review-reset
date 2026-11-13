import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { badgeText, flashBadge, setReviewBadge } from './badge';

describe('badgeText', () => {
  it.each([
    [null, ''],
    [0, ''],
    [8, '8'],
    [999, '999'],
    [1000, '999+'],
  ])('shows %j as %j', (count, text) => {
    expect(badgeText(count)).toBe(text);
  });
});

describe('flashBadge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(fakeBrowser.action, 'setBadgeText').mockResolvedValue();
  });
  afterEach(() => vi.useRealTimers());

  it('returns to the file count afterwards', async () => {
    await setReviewBadge(5, 8);
    await flashBadge(5, '✓');
    expect(fakeBrowser.action.setBadgeText).toHaveBeenLastCalledWith({
      tabId: 5,
      text: '✓',
    });
    vi.advanceTimersByTime(3000);
    expect(fakeBrowser.action.setBadgeText).toHaveBeenLastCalledWith({
      tabId: 5,
      text: '8',
    });
  });
});
