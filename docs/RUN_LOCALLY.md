# Run Pitwall locally

Pitwall opens at **http://localhost:4173/**. GitHub stores the source and runs tests; there is no hosting, login, Pages or cloud deployment step.

## First launch

Install Node.js 22.13 or newer, then open a terminal in the repository:

```sh
npm ci
npm start -- --open
```

The start command builds `dist/`, starts the loopback server and opens the browser. Keep the terminal running; Ctrl+C stops it. The Windows launcher is `Start Pitwall.cmd`; `Start Pitwall.command` is included for macOS. In PowerShell, use `npm.cmd ci` and `npm.cmd start -- --open` if execution policy blocks `npm.ps1`; no policy change is needed.

For later launches, use `npm start -- --open`. If Pitwall already owns 4173, the launcher reuses it. It leaves unrelated applications on that port untouched. Fresh weather, radar, search and map tiles need a connection.

## Updating

Export a plan backup if the data matter to you. Stop the server, obtain the updated source, then run:

```sh
git pull --ff-only
npm ci
npm start -- --open
```

Reload the browser after rebuilding. The optional offline worker uses a build-specific cache revision. Updates retain browser stores; the app does not intentionally clear sessions or forecast history.

## Development and checks

```sh
npm run dev
npm run check
npx playwright install chromium firefox webkit
npm run test:e2e
npm run verify:pilot
```

Development uses 5173. Browser tests serve the production build on 4174 in fresh contexts and use isolated synthetic provider responses. Build before a standalone browser test: `npm run build`. `npm run check` checks formatting, lint, types, unit/integration tests and a production build. Pilot verification reproduces the documented real station comparison from frozen inputs without external API calls.

## Saved data

Use the same browser profile and localhost:4173 origin. Another port, hostname or profile has separate storage. Preferences/circuits/plans use localStorage; actual forecast history and caches use IndexedDB. Nothing is synchronized or uploaded to GitHub.

Export plan/settings JSON from Weather preferences. Import merges missing plans and preserves existing sessions. History is separate: export its CSV from History & sources. Calendar export downloads `.ics`; it never contacts a calendar account. Observation imports stay in the current panel only. [Privacy and retention](PRIVACY.md).

A supported browser can optionally install the app. A successful online visit caches the interface; offline mode does not create new weather or radar. Saved forecasts retain their original timestamps and warnings.

## Troubleshooting

- If Node/npm is missing, install a supported Node version and reopen the terminal.
- If 4173 is occupied by another app, stop that app before launching Pitwall. Keep the same origin for saved data.
- If weather is unavailable, inspect source status and connection/provider limits. Other feeds can still work.
- If radar/map tiles fail, inspect the coverage/error messages. A blank tile is not a dry-weather observation.
- If plans/history appear missing, check the browser profile, hostname and port.
- If storage is blocked or full, keep the app open and export data. A visible warning explains when saving is paused.
- If an old interface persists, rebuild/restart and reload. Before clearing site data, export anything you need: clearing it removes local plans and history.
- If Playwright reports missing browsers, rerun its install command after the dependency update. Tests use 4174 and require that port to be free.

The included macOS launcher has not been executed on macOS in the Windows/Linux CI matrix; the Node entry point is the common supported launch path.
