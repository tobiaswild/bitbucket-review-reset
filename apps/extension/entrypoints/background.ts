import { invalidateRepoName, syncRedirectRules } from '@/utils/redirectRules';
import { repoNameCache } from '@/utils/repoNameCache';
import { isInvalidateMessage } from '@/utils/repoVerification';
import { autoRedirectUuid } from '@/utils/settings';

const SYNC_ALARM = 'sync-redirect-rules';

export default defineBackground(() => {
  // Rules mirror the cache: rebuild whenever it or the setting changes, and hourly so
  // entries past their TTL stop redirecting.
  const sync = () => {
    syncRedirectRules().catch((error) =>
      console.error('Could not update redirect rules', error),
    );
  };
  repoNameCache.watch(sync);
  autoRedirectUuid.watch(sync);
  browser.runtime.onInstalled.addListener(sync);
  browser.runtime.onStartup.addListener(sync);
  browser.alarms.create(SYNC_ALARM, { periodInMinutes: 60 });
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === SYNC_ALARM) sync();
  });

  browser.runtime.onMessage.addListener((message, sender) => {
    if (!isInvalidateMessage(message)) return;
    if (!sender.url?.startsWith('https://bitbucket.org/')) return;
    return invalidateRepoName(message.key).then((redirectBack) => ({
      redirectBack,
    }));
  });
});
