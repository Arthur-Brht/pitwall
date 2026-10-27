# Contributing to Pitwall

Changes should make weather evidence clearer, preserve user data and keep the app easy to run locally.

## Setup

Use Node.js 22.13 or newer. Run `npm ci`, then `npm run dev`. The normal application stays at localhost:4173; development uses 5173 and browser tests use 4174. Their browser storage is separate.

Before proposing a change:

```sh
npm run check
npx playwright install chromium firefox webkit
npm run test:e2e
```

`check` runs lint, formatting, unit/integration tests, TypeScript and a production build. Install browsers once per Playwright version. `npm run test:e2e -- --project=chromium` is useful while working; the complete suite covers the other engines and mobile layout. CI checks Windows and Ubuntu. Review traces/screenshots after a browser failure; do not update expectations merely to hide a regression.

## Weather and storage rules

- Keep missing values missing, including unreported gusts and hourly precipitation.
- Preserve real source, fetch and forecast-valid timestamps. Fetch time is not model initialization time.
- Do not manufacture station observations or history. Synthetic data belong only in isolated tests and must be identified as such.
- Compare the same valid intervals and retain field-specific coverage. Related feeds must not receive independent family votes.
- Never describe agreement, radar transparency or air temperature as a measurement of track grip.
- Respect provider quotas, cache instructions, attribution and terms. Avoid real API calls in CI.
- Preserve existing browser stores and backup compatibility. Test migrations and recovery paths before changing schemas.

## Code and reviews

Views live under `web/src/components/pitwall/`; shared state and domain calculations live under `web/src/lib/`. Keep numerical rules independent of React where practical. Avoid importing the whole workspace into a pure calculation.

Use `npm run format` before committing. Keep changes focused, describe the user-visible result, explain any changed interpretation, and include verification evidence. Add a regression test for a real bug or important new behaviour. Include desktop/mobile screenshots when the interface changes.

Do not commit keys, `.env` files, local backup/history exports, private coordinates, browser profiles, build output or dependencies. Use the issue template for reproducible bugs, with UTC times and source status. Share only information you are comfortable making public.

AI assistance is welcome when disclosed. Review generated changes and verify the resulting behaviour. Substantially AI-authored commits should identify the actual tool in a co-author trailer; assistance does not imply human review or meteorological validation.

By contributing original work, you agree to license it under the repository's MIT licence. Preserve third-party notices and obtain permission before adding material you do not own.

To regenerate the labelled documentation screenshots/video, run `npm run build` then `npm run docs:capture`. This optional capture uses synthetic weather/session fixtures and real attributed OpenStreetMap base tiles, so it needs a connection for the map. It overwrites `docs/images/`; review the assets before committing them. Ordinary regression tests never contact those services.
