import { bitbucketLocale, parseBitbucketLocale } from '@/utils/i18n';

export default defineContentScript({
  matches: ['https://bitbucket.org/*'],
  runAt: 'document_idle',
  async main() {
    for (const script of document.querySelectorAll('script:not([src])')) {
      const locale = parseBitbucketLocale(script.textContent ?? '');
      if (!locale) continue;
      if (locale !== (await bitbucketLocale.getValue())) {
        await bitbucketLocale.setValue(locale);
      }
      return;
    }
  },
});
