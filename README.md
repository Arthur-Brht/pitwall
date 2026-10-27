# Pitwall

Compare racetrack forecasts, inspect recent radar over the circuit, and review the weather expected during your sessions.

**Runs locally at [localhost:4173](http://localhost:4173/). No account or API key is required.** GitHub holds the source and runs checks; there is no hosted application or deployment service.

![Pitwall overview showing isolated example weather data](docs/images/overview.png)

Screenshots and the [short walkthrough](docs/images/walkthrough.webm) use clearly synthetic browser-test data and an example session. They demonstrate the interface; they are not weather reports. The normal application fetches real provider data and has no seeded demo weather.

## Run it

Install [Node.js 22.13 or newer](https://nodejs.org/en/download), then:

```sh
git clone https://github.com/Arthur-Brht/pitwall-.git pitwall
cd pitwall
npm ci
npm start -- --open
```

Open **http://localhost:4173/** and keep the terminal running. Press Ctrl+C to stop. On later launches, run `npm start -- --open` again. Windows users can double-click `Start Pitwall.cmd`; a macOS launcher is also included. In PowerShell, use `npm.cmd` if `npm.ps1` is blocked. [Setup and troubleshooting](docs/RUN_LOCALLY.md).

Fresh forecasts, location search, map tiles and radar need internet access. The optional installed app can reopen its saved interface offline, with the original timestamps on available saved forecasts.

## Plan a session

1. Choose a circuit, search for a location, or enter coordinates and its timezone.
2. Compare ECMWF IFS, DWD ICON, NOAA GFS and Météo-France through Open-Meteo, alongside MET Norway. Enable or disable feeds to inspect their differences.
3. Use **Session planner** to enter a date, local start time and duration. Inspect each source's rain/gust coverage and the model-dry windows that fit your session.
4. Save and edit plans on this device. Download a calendar file or back up plans and preferences as JSON.

The map shows recent historical radar and attributed circuit outlines where available. **History & sources** records actual fetched predictions for the same valid hour; it exports CSV and can compare those predictions with imported station observations. [Forecast verification method and pilot](docs/FORECAST_VERIFICATION.md).

![Per-source session evidence](docs/images/planner.png)

## What the evidence means

Five feeds use two weather API transports and contain shared model ancestry. Consensus groups related feeds into model families; a wet family vote is a descriptive threshold count, not a calibrated probability. Agreement does not establish accuracy.

Rain refers to the hourly interval beginning at its displayed time. Missing values remain unavailable. Radar is historical, has limited native resolution, and can have gaps; zooming over the track does not create corner-level weather detail. Air temperature and forecast rain do not measure grip, track temperature, standing water or drying rate. [Sources, timing and limits](docs/API_SOURCES.md).

The observation comparison reports sample counts, errors, lead bands and station distance. It rejects forecasts fetched at or after their valid time. A small sample or a nearby station cannot establish track-level accuracy.

## Your data

Circuits, preferences and sessions stay in this browser's local storage. Forecast snapshots and caches stay in IndexedDB. Nothing is uploaded to GitHub, synced to another device, or sent to a Pitwall backend. Weather and map providers receive the requested coordinates or map area and normal connection metadata.

Use the same browser profile and **localhost:4173** each time: another hostname or port has a separate store. Browser storage can be cleared or evicted. Export a JSON backup for plans/settings and CSV for history you want to retain. [Privacy and storage details](docs/PRIVACY.md).

## Develop and contribute

```sh
npm ci
npm run dev
npm run check
npx playwright install chromium firefox webkit
npm run build
npm run test:e2e
```

Development uses port 5173. Browser tests use isolated contexts on port 4174 with clearly synthetic provider fixtures; they do not touch your saved 4173 data or call public weather services. Chromium, Firefox, WebKit and a mobile viewport exercise the interface. Offline service-worker reload checks run in Chromium.

The stack is React 19, TypeScript, Vite 8, Recharts and locally bundled Leaflet, with a small Node server bound to loopback. See [architecture](docs/ARCHITECTURE.md), [contributing](CONTRIBUTING.md), [security](SECURITY.md), [verification](docs/VERIFICATION.md) and the [changelog](CHANGELOG.md).

## Licence and data terms

Pitwall's original code and documentation use the [MIT licence](LICENSE). Dependencies, circuit geometry, weather and radar retain their own licences and service conditions; they are **not** relicensed under MIT. Full bundled library notices are generated during build. [Third-party attribution and terms](THIRD_PARTY.md).

Open-Meteo's free service is for non-commercial use within its limits. A public source repository does not grant commercial access to any provider's free API. Check the providers' current terms before redistribution or commercial use.
