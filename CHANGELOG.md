# Changelog

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
