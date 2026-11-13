import { resolve } from 'node:path';
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
  // The Firefox sources zip must be buildable on its own. React and
  // TypeScript versions come from the pnpm catalog, so the zip starts at the
  // workspace root and carries the workspace files along.
  zip: {
    sourcesRoot: resolve(import.meta.dirname, '../..'),
    includeSources: [
      'package.json',
      'pnpm-lock.yaml',
      'pnpm-workspace.yaml',
      'LICENSE',
      'SOURCE_CODE_REVIEW.md',
      'apps/extension/**',
    ],
  },
});
