import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Bitbucket Review Reset',
    description: 'Reset locally stored PR review progress on Bitbucket Cloud.',
    permissions: ['activeTab', 'scripting', 'storage'],
  },
});
