# Extension

The browser extension, built with [WXT](https://wxt.dev) and React. For what
it does and how to install it, see the [root README](../../README.md).

## Commands

Run from this directory:

```sh
pnpm dev            # launches Chrome with the extension loaded
pnpm dev:firefox    # same for Firefox
pnpm test           # unit tests (Vitest)
pnpm compile        # type check
pnpm build          # production build in .output/chrome-mv3 (load via chrome://extensions → Load unpacked)
pnpm build:firefox  # production build in .output/firefox-mv2
pnpm zip            # store-ready zip, as built by the release workflow
```

## Translations

UI strings live in `locales/<lang>.yml` (English is the default, German is included) and are loaded via `@wxt-dev/i18n`. By default the browser's UI language is used; the options page lets users pin English or German instead (`utils/i18n.ts`). The extension name and description in the manifest always follow the browser language. To add a language, copy `locales/en.yml` to `locales/<lang>.yml` and translate it.
