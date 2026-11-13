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
    permissions: ['activeTab', 'scripting', 'storage'],
    ...(browser === 'firefox' && {
      browser_specific_settings: {
        gecko: {
          // Permanent add-on ID on addons.mozilla.org, never change it.
          id: 'bitbucket-review-reset@tobiaswild.de',
          data_collection_permissions: { required: ['none'] },
        },
      },
    }),
  }),
  // AMO gets the whole repository as source code (`git archive` in the
  // release workflow), so WXT's own sources zip is not needed.
  zip: {
    zipSources: false,
  },
});
