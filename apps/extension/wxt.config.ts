import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react', '@wxt-dev/i18n/module'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: ({ browser }) => ({
    default_locale: 'en',
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    permissions: [
      'activeTab',
      'alarms',
      'contextMenus',
      'declarativeNetRequestWithHostAccess',
      'scripting',
      'storage',
    ],
    host_permissions: ['https://bitbucket.org/*'],
    commands: {
      'reset-review': {
        suggested_key: { default: 'Alt+Shift+R' },
        description: '__MSG_commandReset__',
      },
      'undo-reset': {
        suggested_key: { default: 'Alt+Shift+U' },
        description: '__MSG_commandUndo__',
      },
    },
    ...(browser === 'firefox' && {
      browser_specific_settings: {
        gecko: {
          // Permanent add-on ID on addons.mozilla.org, never change it.
          id: 'bitbucket-review-reset@tobiaswild.de',
          // data_collection_permissions needs Firefox 140 (Android 142), which
          // also covers storage.session (115+) used to undo a reset.
          strict_min_version: '140.0',
          data_collection_permissions: { required: ['none'] },
        },
        gecko_android: { strict_min_version: '142.0' },
      },
    }),
  }),
  // AMO gets the whole repository as source code (`git archive` in the
  // release workflow), so WXT's own sources zip is not needed.
  zip: {
    zipSources: false,
  },
});
