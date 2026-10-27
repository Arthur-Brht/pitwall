# Architecture

Pitwall is a browser application served by a small, read-only local Node server. Weather requests go directly from the browser to public providers; `/api/` names inside the code are browser-local dispatch paths, not a backend API.

The Mac and Windows applications package the same interface and server with Electron. `desktop/main.mjs` owns window/server lifecycle; `desktop/policy.mjs` restricts navigation, external links and downloads. The renderer is sandboxed, with context isolation and no Node integration or native IPC API. The preload exposes only a read-only desktop marker. Desktop mode hides browser-install controls and uses bundled files instead of a service worker, so updates replace the shell reliably. Data stays in a persistent profile outside the app bundle.

`scripts/prepare-desktop.mjs` stages an explicit set of application/runtime files, excluding the repository, development dependencies, credentials and browser exports. `electron-builder.config.cjs` produces the universal Mac app, DMG and ZIP, plus the Windows x64 NSIS setup executable. Runtime/Chromium licence notices are retained. Mac signing/notarization require an explicit credential-backed build; Mac previews are ad-hoc signed and Windows previews are unsigned. [Mac builds and storage](MAC_APP.md), [Windows builds and storage](WINDOWS_APP.md).

```text
web/src/App.tsx                     Workspace composition
web/src/components/pitwall/          Views, dialogs, charts, map and verification panel
web/src/lib/use-pitwall-state.ts     Workspace coordination and user actions
web/src/lib/pitwall-context.tsx      Typed shared workspace context
web/src/lib/providers.ts            Public clients and unit/interval normalization
web/src/lib/forecast-catalog.ts     Global/regional source choices and defaults
web/src/lib/ensemble.ts             Ensemble member normalization and public client
web/src/lib/rain-outlook.ts         Window-level rain estimates and source comparison
web/src/lib/radar-window.ts         Radar playback bounds within available history
web/src/lib/browser-api.ts          Local dispatch, caching and source isolation
web/src/lib/browser-history.ts      IndexedDB snapshots and cache retention
web/src/lib/consensus.ts            Family grouping and descriptive summaries
web/src/lib/session-planner.ts      Coverage, session evidence and dry windows
web/src/lib/local-time.ts           Circuit timezone and DST validation
web/src/lib/device-state.ts         Validated preferences and portable plan backups
web/src/lib/verification.ts         Observation CSV validation and forecast scoring
scripts/start.mjs                   Loopback-only production file server
scripts/build-worker.mjs            Build-specific offline shell revision
scripts/notices.mjs                 Production dependency licence notices
tests/                             Isolated domain, provider, storage and server checks
e2e/                               Browser flows with synthetic network fixtures
```

Weather is represented by nullable fields at UTC valid timestamps. Rain and preceding-hour gust maxima from Open-Meteo are shifted to the interval beginning at the displayed time. MET Norway next-hour rain already uses that convention. Six-hour rain is never divided into invented hourly values.

Consensus groups related forecasts by family before calculating descriptive medians and threshold votes. Session windows separately require complete rain evidence from every enabled feed. Field-specific coverage makes absent gusts visible.

The production origin is `http://localhost:4173`. Preferences and plans use localStorage. Actual weather snapshots and caches use IndexedDB. Recent history retains distinct real fetches; older history keeps the latest real fetch per source, valid hour and UTC capture hour. Cache fallback preserves its original receipt time. The app has no telemetry endpoint, cloud database or authentication.

An offline worker precaches local build assets. Each asset build produces a new worker revision, so old cache generations can be retired after a successful install. Navigation replaces cached HTML only after its referenced assets are available. External provider responses and tiles are excluded.

Browser tests run on 4174 in isolated contexts. Normal tests block workers so network fixtures remain deterministic; a separate Chromium test enables the real worker for cached-shell reload checks. Public services are never required for automated tests. README captures use explicitly labelled synthetic browser-test data. Live provider availability is checked separately and is never implied by mocked test success.
