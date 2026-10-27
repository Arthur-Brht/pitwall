# Verification — Pitwall 1.3.0

Release review: 27 October 2026. The application runs locally at http://localhost:4173; GitHub stores source and executes checks. There is no hosted application, login or deployment workflow.

## Automated evidence

- **65 unit/integration tests** cover provider normalization, UTC rain/gust alignment, model-family votes, missing values, DST, session coverage/dry windows, backup merging, calendar/CSV exports, IndexedDB retention, custom-location identity, observation validation/scoring, local serving and documentation links.
- The browser suite exercises Chromium, Firefox, WebKit and a mobile Chromium viewport. It covers all views, source controls, session editing/undo, calendar/history/backup exports, restore/rejection, failed-provider recovery, custom coordinates, location search/timezones, corrupt storage, modal keyboard focus, observation verification and accessibility.
- Accessibility checks cover the four views plus search/preferences dialogs for critical or serious WCAG-tagged axe violations. They do not constitute a complete accessibility certification.
- Offline service-worker reload is checked in Chromium. Firefox and WebKit offline navigation are explicitly skipped in this automation harness; their normal application flows remain covered.
- `npm run check` checks lint, formatting, tests, TypeScript, reproducible pilot calculations and a production build. The dependency audit reports zero findings for the locked tree at review time.
- CI runs Windows and Ubuntu web checks, Windows Chromium/mobile flows, Ubuntu Chromium/Firefox/WebKit/mobile flows, and a redacted reachable-history secret scan. Actions are pinned to commit hashes and the workflow has read-only repository permissions.

The [GitHub workflow](https://github.com/Arthur-Brht/pitwall-/actions/workflows/ci.yml) provides the current remote outcome. Test counts and dependency results describe this reviewed version, not every future revision.

## Mac application verification

The [Mac build workflow](https://github.com/Arthur-Brht/pitwall-/actions/workflows/macos.yml) builds a universal app and DMG/ZIP on macOS, checks signatures and both CPU architectures, and launches the packaged application twice. Those checks cover rendering, sandboxed isolation, localStorage and IndexedDB persistence through quit/reopen, and hiding browser-install controls. A separate Electron flow verifies all five synthetic provider feeds, saved plans and native backup export/import. Tests use a temporary profile and port 4175, leaving real data on 4173 untouched.

The initial packaged first/reopen checks and native file workflow passed on Windows. The host's Code Integrity policy blocked execution of a later unsigned Windows rebuild; that protection was left in place. The workflow is the source of truth for Mac build results. Ad-hoc signature verification is not Developer ID signing or Apple notarization; preview installers and build manifests state this explicitly. A standard installer remains dependent on maintainer signing credentials.

## Live-provider and local-runtime checks

The production browser loaded all five real feeds: IFS, ICON, GFS and Météo-France through Open-Meteo, plus MET Norway. Actual radar, OSM tiles and attributed circuit geometry loaded under the local server's content security policy. Saved forecast snapshots retain their real source/fetch/valid timestamps.

The local server binds to 127.0.0.1, serves built files only, rejects foreign hostnames and unexpected writes, and leaves unrelated port owners untouched. Starting another Pitwall launcher reuses the verified address. The app is not exposed on a LAN interface.

The offline shell uses an asset-derived build revision. A new cached HTML shell is stored only after its referenced modules are available. Cross-origin weather/radar/map data are not precached by the worker. Provider fallback is separately labelled with the original receipt time.

## Weather evaluation

The [real nearby-station pilot](FORECAST_VERIFICATION.md) compares genuine pre-valid-time forecasts with nine measured UTC hours from IPMA Portimão airport, 10.04 km from the selected circuit coordinates. Frozen inputs and `npm run verify:pilot` reproduce the results without network requests. Measurement-height/averaging and terrain differences are disclosed; rain is excluded where interval alignment is unverified. This is not general or track-level forecast calibration.

## Publication review

The release source is a standalone app-only history. Legacy project materials and personal machine paths are not part of this repository. Original code uses MIT; dependency notices and separate weather/geographic/data terms are retained. Browser exports and runtime data are excluded from source control.

README screenshots and the walkthrough use labelled synthetic test weather and an example session with real attributed OSM base tiles. No example forecasts or history are seeded in the normal application. Browser testing uses isolated origins/contexts and does not alter real localhost:4173 plans.

Public weather APIs, quotas, CORS, internet access, browser storage and radar coverage remain external limits. No software test or small station comparison establishes track grip, safety or precise shower timing. The macOS launcher is supplied but has not been executed on macOS in the Windows/Linux review.
