# Bitbucket Review Reset

[![CI](https://github.com/tobiaswild/bitbucket-review-reset/actions/workflows/ci.yml/badge.svg)](https://github.com/tobiaswild/bitbucket-review-reset/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A browser extension that clears the locally stored review progress ("viewed"
files and last reviewed commit) for the Bitbucket Cloud pull request in the
current tab.

📖 **Documentation:** <https://tobiaswild.github.io/bitbucket-review-reset/>

## Install

- **Chrome:** [Chrome Web Store](https://chromewebstore.google.com/detail/jebhmbfjipcmfkojdjbfjdcnlfnmljim)
- **Firefox:** [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/bitbucket-review-reset/)
- **Manual:** download the zip for your browser from the
  [latest release](https://github.com/tobiaswild/bitbucket-review-reset/releases/latest)

## Usage

Open a pull request on `bitbucket.org`, click the toolbar icon, review the
listed keys and hit **Reset review state**. The page reloads afterwards.

Bitbucket keeps the review progress in `localStorage` under three keys per PR:

- `{workspace}/{repo}/{id}:files-reviewed-state`
- `last-reviewed-commit:{workspace}/{repo}/{id}`
- `__storejs_expire_mixin_last-reviewed-commit:{workspace}/{repo}/{id}`

## Repository layout

| Path | Contents |
| --- | --- |
| [`apps/extension`](apps/extension) | The extension, built with [WXT](https://wxt.dev) and React |
| [`apps/docs`](apps/docs) | The documentation site, built with Docusaurus |

## Development

Requires Node.js 24 and pnpm.

```sh
pnpm install
pnpm dev       # launches Chrome with the extension loaded
pnpm test      # unit tests
pnpm compile   # type check
pnpm check     # lint and format check (Biome)
pnpm build     # production builds
```

### Building the Firefox add-on from source

For reviewers on addons.mozilla.org. Requires Node.js 24 and pnpm (the root
`package.json` pins the exact version, pnpm downloads it automatically). From
the repository root:

```sh
pnpm install --frozen-lockfile
cd apps/extension
pnpm build:firefox
```

The add-on is written to `apps/extension/.output/firefox-mv2`.

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Security

Please report vulnerabilities privately, see [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
