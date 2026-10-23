# Bitbucket Review Reset

Chrome extension that clears the locally stored review progress ("viewed" files and last reviewed commit) for the Bitbucket Cloud pull request in the current tab.

Bitbucket keeps this in `localStorage` under three keys per PR:

- `{workspace}/{repo}/{id}:files-reviewed-state`
- `last-reviewed-commit:{workspace}/{repo}/{id}`
- `__storejs_expire_mixin_last-reviewed-commit:{workspace}/{repo}/{id}`

Open a PR, click the toolbar icon, review the listed keys and hit **Reset review state**. The page reloads afterwards.

## Development

```sh
pnpm dev      # launches Chrome with the extension loaded
pnpm test     # unit tests
pnpm compile  # type check
pnpm build    # production build in .output/chrome-mv3 (load via chrome://extensions → Load unpacked)
```

## Translations

UI strings live in `locales/<lang>.yml` (English is the default, German is included) and are loaded via `@wxt-dev/i18n`. The browser picks the language from its UI locale. To add a language, copy `locales/en.yml` to `locales/<lang>.yml` and translate it.
