# Contributing

Thanks for your interest in improving Bitbucket Review Reset! Bug reports,
ideas and pull requests are all welcome.

By participating you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Reporting bugs and requesting features

Use the [issue templates](https://github.com/tobiaswild/bitbucket-review-reset/issues/new/choose).
For security issues, follow [SECURITY.md](SECURITY.md) instead of opening a
public issue.

## Development setup

You need Node.js 24 and pnpm (the version is pinned in `package.json` and
downloaded automatically).

```sh
pnpm install
pnpm dev                                 # Chrome with the extension loaded
pnpm --filter bitbucket-review-reset-extension dev:firefox   # Firefox
pnpm --filter docs start                 # docs site
```

Git hooks are installed by [lefthook](https://lefthook.dev) on `pnpm install`
and run Biome on staged files.

## Before opening a pull request

Make sure the same checks CI runs pass locally:

```sh
pnpm check     # Biome lint + format
pnpm compile   # TypeScript
pnpm test      # Vitest
pnpm knip      # unused files, exports and dependencies
pnpm build
```

- Keep pull requests focused on one change.
- Add or update tests for behavior changes.
- If you change user-facing strings, update every file in
  `apps/extension/locales/` (English and German).
- Update the docs in `apps/docs` when behavior changes.

## Translations

UI strings live in `apps/extension/locales/<lang>.yml`. To add a language,
copy `en.yml` to `<lang>.yml` and translate it.

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE).
