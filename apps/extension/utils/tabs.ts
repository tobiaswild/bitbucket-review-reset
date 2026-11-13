import { t } from '@/utils/i18n';

/** Runs a self-contained function in the tab's page and returns its result. */
export async function runInTab<A extends unknown[], R>(
  tabId: number,
  func: (...args: A) => R,
  args: A,
): Promise<R> {
  const [injection] = await browser.scripting.executeScript({
    target: { tabId },
    func,
    args,
  });
  if (!injection) throw new Error(t('errors.noScriptResult'));
  return injection.result as R;
}
