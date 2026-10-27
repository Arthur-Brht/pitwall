# Verification — Pitwall 2.3.0 Preview

Release review: 27 October 2026. The 2.3 desktop preview runs locally at http://localhost:4183 (source startup remains 4173); GitHub stores source and executes checks. There is no hosted application, login or deployment workflow.

## Automated evidence

- **96 unit/integration tests** cover provider normalization, UTC rain/gust alignment, model-family votes, missing values, DST, session coverage/dry windows, backup merging, calendar/CSV exports, IndexedDB retention, custom-location identity, observation validation/scoring, local serving and documentation links. New checks cover native quarter-hour intervals, timing gaps and thresholds, absolute intensity scales, load-aware radar playback, cancellation and bounded layer retention.
- The browser suite exercises Chromium, Firefox, WebKit and a mobile Chromium viewport. It covers both light and dark appearance, system changes, saved theme choices, incomplete rainfall summaries, all views, source controls, session editing/undo, calendar/history/backup exports, restore/rejection, failed-provider recovery, custom coordinates, location search/timezones, corrupt storage, modal keyboard focus, observation verification and accessibility. Two offline harness skips remain documented below.
- Accessibility checks cover all five views in both themes plus search/preferences dialogs for critical or serious WCAG-tagged axe violations. They do not constitute a complete accessibility certification.
- Dashboard checks cover window-level rain estimates, complete ensemble-member denominators, wet outliers, per-location source choices, native quarter-hour rain windows, explicit hourly fallback, the removal of track-temperature entry, rain-chart context and radar start/end playback. Delayed-tile tests verify that the previous scan stays displayed while the replacement loads. Recovery checks verify that Refresh retries failed tiles even when the radar frame timestamp is unchanged. Existing saved forecasts remain available as explicitly stale data during an offline upgrade.
- Offline service-worker reload is checked in Chromium. Firefox and WebKit offline navigation are explicitly skipped in this automation harness; their normal application flows remain covered.
- `npm run check` checks lint, formatting, tests, TypeScript, reproducible pilot calculations and a production build. The dependency audit reports zero findings for the locked tree at review time.
- CI runs Windows and Ubuntu web checks, Windows Chromium/mobile flows, Ubuntu Chromium/Firefox/WebKit/mobile flows, and a redacted reachable-history secret scan. Actions are pinned to commit hashes and the workflow has read-only repository permissions.

The [GitHub workflow](https://github.com/Arthur-Brht/pitwall/actions/workflows/ci.yml) provides the current remote outcome. Test counts and dependency results describe this reviewed version, not every future revision.

## Mac application verification

The [Mac build workflow](https://github.com/Arthur-Brht/pitwall/actions/workflows/macos.yml) builds a universal app and DMG/ZIP on macOS, checks signatures and both CPU architectures, and launches the packaged application twice. Those checks cover rendering, sandboxed isolation, localStorage and IndexedDB persistence through quit/reopen, saved appearance through reopen, and hiding browser-install controls. A separate Electron flow verifies all eight synthetic provider feeds and three ensemble systems, saved plans and native backup export/import. Tests use a temporary profile and port 4175, leaving real data on 4173 untouched.

The initial packaged first/reopen checks and native file workflow passed on Windows. The host's Code Integrity policy blocked execution of a later unsigned Windows rebuild; that protection was left in place. The workflow is the source of truth for Mac build results. Ad-hoc signature verification is not Developer ID signing or Apple notarization; preview installers and build manifests state this explicitly. A standard installer remains dependent on maintainer signing credentials.

## Windows application verification

The [desktop build workflow](https://github.com/Arthur-Brht/pitwall/actions/workflows/macos.yml) additionally builds the Windows x64 NSIS installer. Its Windows job requires successful packaged launch/reopen and the synthetic eight-feed/three-ensemble, plan and native backup flow. A disposable runner installs to a path containing spaces, checks the Start menu and Windows Apps registration, launches/reopens the installed executable, reinstalls it and uninstalls it while retaining profile data. Checksums and a platform-specific build manifest identify the actual unsigned preview. These checks do not disable or bypass the local host's Code Integrity policy.

## Live-provider and local-runtime checks

The production browser loaded all eight real default feeds at Spa, plus native ICON-D2 quarter-hour rain timing. A separate live request confirmed native AROME HD quarter-hour output at the same coordinates. Assen's native ICON-D2 response also passed normalization; out-of-region data were rejected. Actual radar, OSM tiles and attributed circuit geometry loaded under the local server's content security policy. Saved forecast snapshots retain their real source/fetch/valid timestamps. These checks establish connectivity at review time, not continuous provider availability or forecast accuracy.

The local server binds to 127.0.0.1, serves built files only, rejects foreign hostnames and unexpected writes, and leaves unrelated port owners untouched. Starting another Pitwall launcher reuses the verified address. The app is not exposed on a LAN interface.

The offline shell uses a build revision derived from hashed assets and the early appearance script. A new cached HTML shell is stored only after its referenced modules are available. Cross-origin weather/radar/map data are not precached by the worker. Provider fallback is separately labelled with the original receipt time.

## Weather evaluation

The [real nearby-station pilot](FORECAST_VERIFICATION.md) compares genuine pre-valid-time forecasts with nine measured UTC hours from IPMA Portimão airport, 10.04 km from the selected circuit coordinates. Frozen inputs and `npm run verify:pilot` reproduce the results without network requests. Measurement-height/averaging and terrain differences are disclosed; rain is excluded where interval alignment is unverified. This is not general or track-level forecast calibration.

## Publication review

The release source is a standalone app-only history. Legacy project materials and personal machine paths are not part of this repository. Original code uses MIT; dependency notices and separate weather/geographic/data terms are retained. Browser exports and runtime data are excluded from source control.

README screenshots and the walkthrough use labelled synthetic test weather and an example session with real attributed OSM base tiles. No example forecasts or history are seeded in the normal application. Browser testing uses isolated origins/contexts and does not alter real localhost:4173 plans.

Public weather APIs, quotas, CORS, internet access, browser storage and radar coverage remain external limits. No software test or small station comparison establishes track grip, safety or precise shower timing. The source launcher is optional; packaged Mac lifecycle checks run on GitHub macOS rather than a personal Mac.

## 2.3 comparison review

Independent UX and technical reviews of 2.2 informed this preview. Changes cover competing risk numbers, conflicting onset windows, a shared quarter-hour strip, table-first comparison, malformed negative rain, hourly/native failure isolation, and radar controls during metadata failures. New browser scenarios verify window retention, native results during hourly failures, exclusions, and Pause during a metadata outage. Synthetic radar fixtures contain thirteen scans over two hours; production uses only actual returned scans.

The app uses a distinct ID, product name, default profile and local port. Native CI checks production-default coexistence with a checksum-pinned 2.2 app, alongside the existing isolated storage/plan/file checks. Windows verifies that removing 2.3 leaves 2.2 installed. Test markers establish profile isolation, not a live-weather accuracy assessment. No user Mac or existing installation is used for these checks.

## 2.4 session dashboard

The [2.4 review notes](REVIEW_2.4.md) describe the approved scope and isolation. The session window, its buffers, missing data, timing groups and comparable-history rules are exercised by dedicated unit and browser scenarios. Both desktop jobs build from the same tagged source. Production-default coexistence checks use the pinned 2.3 reference; Windows also verifies that removing 2.4 leaves 2.3 installed. Native results are recorded in the release's linked workflow run and manifests.
