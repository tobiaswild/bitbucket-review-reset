import { bitbucketLocale, parseBitbucketLocale } from '@/utils/i18n';

function readLocale(): string | null {
  for (const script of document.querySelectorAll('script:not([src])')) {
    const locale = parseBitbucketLocale(script.textContent ?? '');
    if (locale) return locale;
  }
  return null;
}

export default defineContentScript({
  matches: ['https://bitbucket.org/*'],
  runAt: 'document_idle',
  async main() {
    const locale = readLocale();
    if (locale && locale !== (await bitbucketLocale.getValue())) {
      await bitbucketLocale.setValue(locale);
    }
  },
});
