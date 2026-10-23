# Docs

Documentation site for Bitbucket Review Reset, built with [Docusaurus](https://docusaurus.io/) and published to GitHub Pages at <https://tobiaswild.github.io/bitbucket-review-reset/>.

## Development

```sh
pnpm start      # dev server with live reload
pnpm build      # static build in ./build
pnpm serve      # serve the production build locally
pnpm typecheck  # type check
```

Run from the repository root with `pnpm --filter docs <script>`.

## Deployment

Pushes to `main` that touch `apps/docs/` are deployed by `.github/workflows/docs.yml`. The repository's Pages source must be set to **GitHub Actions** (Settings → Pages).

## Translations

The site is available in English and German. German pages and UI strings live in `i18n/de/`. To add a language, add it to `i18n.locales` in `docusaurus.config.ts`, then run `pnpm exec docusaurus write-translations --locale <lang>` and translate the generated files plus `docs/intro.md` under `i18n/<lang>/docusaurus-plugin-content-docs/current/`. Preview with `pnpm start --locale de`.
