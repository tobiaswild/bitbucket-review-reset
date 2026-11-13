# Source code review

Build instructions for the Firefox add-on, for reviewers on
addons.mozilla.org.

## Requirements

- Node.js 24
- pnpm 12 (the root `package.json` pins the exact version; pnpm downloads it
  automatically)

## Build

Run from the root of the extracted sources:

```sh
pnpm install --frozen-lockfile
cd apps/extension
pnpm build:firefox
```

The built add-on is written to `apps/extension/.output/firefox-mv2`.
