# Changelog

## 2.1.0 — Rain-risk dashboard

- Added a Dashboard tab with selectable forecast windows, ensemble rain estimates and their range, provider agreement, family counts, first rain signal and hourly source comparison.
- Added UK Met Office, Canada GEM and Japan JMA to the default feeds, plus optional KNMI and ItaliaMeteo regional forecasts. Source selections are saved separately per location and included in backups.
- Added ECMWF, GFS and ICON ensembles for window-level estimates, requiring complete hourly members and keeping probability separate from model agreement. Wet outliers remain visible; missing data never become dry votes.
- Added timestamped manual track-temperature readings alongside forecast humidity, air temperature, wind and gusts. Readings stay local and travel in backups.
- Added radar start/end selection, playback restricted to that range, and reset to available history. The controls remain limited to actual returned historical frames.
- Added Dijon-Prenois and visible coordinates for custom locations, retained existing plans and saved forecasts on upgrade, and updated links for the renamed repository.

## 2.0.0 ? A clearer weather desk

- Rebuilt the four views around a focused outlook, hourly strip and radar, with shorter copy and detailed methods/source breakdowns behind expandable sections.
- Added light, dark and system appearance, a one-click theme switch, persistent device preference, and matching chart, map and model colours.
- Refined responsive layouts, keyboard scrolling, dialog focus and contrast, preserving session editing, calendar/data exports, backups, history and station verification.
- Kept missing rainfall explicit in the outlook instead of presenting incomplete evidence as a dry 24-hour forecast.
- Extended browser checks to both appearances and theme persistence; updated packaged-app checks, screenshots and Mac/Windows installers.

## 1.3.1 — Windows application preview

- Added a self-contained Windows x64 installer with Start menu/desktop shortcuts and Windows Apps registration, requiring no terminal or Node.js installation.
- Added Windows CI checks for the packaged app and actual installation, reinstallation, launch/reopen, native backup export/import and uninstallation with data retention.
- Added separate Windows build metadata and SHA256 checksums, and Windows installation/privacy/security documentation. Windows previews are explicitly unsigned.
- Kept Mac packaging and verification alongside Windows, with both required before preparing a tagged release download.

## 1.3.0 — Mac application preview

- Added a self-contained universal Mac app and drag-to-Applications disk image, bundling its runtime and automatic server/window lifecycle.
- Added persistent app storage, native menus and restricted navigation/downloads, with no Node or native IPC access from the interface.
- Added packaged launch/reopen checks, desktop provider/plan/file tests, Mac CI builds, installer checksums and explicit signed/notarized release mode.
- Made Mac installation the main README path. Previews are labelled; standard distribution awaits Apple Developer signing credentials.

## 1.2.0 — 27 October 2026

- Prepared Pitwall as a standalone local application, with MIT licensing, third-party notices, public setup/contribution guidance and an app-only source history.
- Split the interface into separate views, dialogs, charts, source cards and shared workspace state.
- Added browser tests for desktop/mobile flows, accessibility, persistence, backup/restore, provider failure, exports and offline shell reloads.
- Improved text and rainfall-matrix contrast, keyboard scrolling and modal focus restoration across browser engines.
- Added local observation CSV verification with exact valid-hour matching, lead bands, sample counts, absolute error, bias and wet-event counts. Retrospective fetches are excluded.
- Expanded history retention to 30,000 points per location, retaining recent captures and compacting older captures to real hourly fetches.
- Gave each production build its own offline cache revision and protected cached startup against interrupted updates.
- Added local-server host/header protections, locked CI actions, history secret scanning.

## 1.1.0 — 26 October 2026

Added per-source session coverage, stricter model-dry windows, editable plans with undo, calendar exports, JSON backup/restore, rainfall/wind forecast evolution, saved-forecast recovery and bundled mapping.

## 1.0.0 — 26 October 2026

Established the standalone React/Vite local application, direct public weather clients, family-aware comparison, historical radar, circuit outlines, session planning and device-local forecast history.
