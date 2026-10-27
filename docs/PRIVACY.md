# Privacy and device data

Pitwall does not upload your plans or forecast history to GitHub or a Pitwall service. It has no sign-in, account database, analytics collector or automatic GPS access.

The browser directly requests weather, location search, circuit geometry, map tiles and radar. Their providers receive the requested coordinates/map area and normal network metadata, including your IP address. Search text goes to Open-Meteo's geocoding service. Provider privacy and retention rules apply.

## Storage

- **localStorage:** selected/saved circuits, weather preferences and planned sessions.
- **IndexedDB:** genuine forecast snapshots, source cooldowns and short-lived response caches.
- **Cache Storage:** the optional app's local HTML, JavaScript, CSS and icons.
- **Observation imports:** kept only in the current verification panel until it unmounts or the page reloads; no automatic upload or persistence.

All stores belong to the complete origin and browser profile. `localhost:4173`, `127.0.0.1:4173`, 5173 and another browser have separate data.

The desktop app keeps its own profile at `~/Library/Application Support/Pitwall` on Mac and `%APPDATA%\Pitwall` on Windows. It uses the same data formats but does not read Safari, Chrome or Edge profiles. Transfer plans/settings with a JSON backup. Updates retain that profile; the Windows uninstaller retains it too. The desktop shell uses bundled files instead of service-worker caching. Its page has no Node access, filesystem API or general-purpose IPC bridge; imports/exports use native file dialogs.

History records the first 24 forecast hours per source, with a seven-day retention window and 30,000-point cap per location. Captures from the past six hours remain distinct; older captures retain the latest real fetch per source/valid-hour/UTC-capture-hour. This preserves actual timestamps while limiting storage growth. Forecast history is not an observed weather record.

## Backups and removal

Export a JSON backup in Weather preferences for circuits, settings and sessions. Import merges plans without silently replacing existing sessions. History is separate and exports as CSV. Calendar export downloads a file and never sends anything to a calendar account.

Backup, history, calendar and observation files can contain locations and planned activities. Review them before sharing. Browser storage can be cleared or evicted. Removing site data for localhost:4173 deletes Pitwall's local plans, history and cached shell; export anything you want to keep first. No server-side copy exists to recover it.

Corrupt storage pauses automatic saving to preserve existing values. Storage failures are shown visibly. Dependency and provider failures can still occur; keep important plans outside browser storage as well.
