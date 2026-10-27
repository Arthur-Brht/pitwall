# Pitwall

Pitwall is a desktop app for Mac and Windows that helps you plan around the weather at a racetrack. Pick a circuit, and it puts several weather forecasts side by side, shows recent rain radar over the track, and lays out the rain, wind, gusts and temperatures expected during your sessions.

Weather models often disagree, and before a track day or a race weekend it helps to see where they agree and where they don't before deciding when to run. Pitwall is a planning aid. It can't tell you how much grip the track will have, and it can't promise that a session will be dry.

You don't need an account, an API key, Terminal or any other software to use it. You download it, install it and open it like any other app.

![Pitwall's rain dashboard, with example data](docs/images/dashboard.png)

[Dark mode](docs/images/dashboard-dark.png) · [Mobile layout](docs/images/dashboard-mobile.png) · [Short walkthrough video](docs/images/walkthrough.webm)

The screenshots and video use made-up example data to show the interface. When you use the app, it shows real forecasts.

## Download

The latest versions are on the [Releases page](https://github.com/Arthur-Brht/pitwall/releases).

**Mac** (macOS 13 Ventura or newer, Apple silicon or Intel): download the `.dmg`, open it and drag Pitwall into Applications. Then open it from Applications, Launchpad or the Dock.

**Windows** (Windows 10 or 11, 64-bit Intel or AMD): download the setup `.exe`, run it and follow the steps. Pitwall then appears in the Start menu and on your desktop.

These are preview builds. The Mac app isn't signed with an Apple Developer ID or notarised by Apple, and the Windows app isn't signed either, so your computer may warn you before opening it or block it. The [Mac notes](docs/MAC_APP.md) and [Windows notes](docs/WINDOWS_APP.md) explain what to expect.

## What it does

Pitwall has five main views.

- **Dashboard** brings together the estimated chance of rain, forecast agreement, first rain signal, humidity, air temperature and wind for a window you choose. It also compares hourly rain across sources and lets you record a track-temperature reading. [How to read the dashboard](docs/DASHBOARD.md).

- **Overview** gives the outlook for your circuit, the next 24 hours and a map with recent rain radar.
- **Sessions** lets you enter a session's date, start time and length, and see what each forecast expects for rain and gusts during it, including any windows where the models expect it to stay dry. You can save and edit your sessions, add them to your calendar, and back them up to a file.
- **Models** compares the forecasts in detail. You can switch individual forecasts on or off to see where they differ.
- **History** keeps the forecasts Pitwall has fetched, so you can look back at what was predicted, export it as a CSV file, and compare it with weather station measurements you import.

You can choose from a list of known circuits, including Dijon-Prenois, search for any place, or enter coordinates and a timezone yourself. Light, dark and system appearance are all available. The radar's From and To controls let you loop a selected part of the available recent history.

![Comparing forecasts for a planned session, with example data](docs/images/planner.png)

## Where the weather comes from

Eight forecast feeds are enabled by default: ECMWF IFS, DWD ICON, NOAA GFS, Météo-France, UK Met Office, Canada GEM, Japan JMA and MET Norway. Manage forecasts lets you choose what to fetch for each circuit, with KNMI and ItaliaMeteo as extra regional options. Most feeds come through [Open-Meteo](https://open-meteo.com/); MET Norway is contacted directly. Radar comes from RainViewer.

More feeds don't automatically mean more independent opinions. Some models are related, so they can agree and still be wrong. Forecast agreement is a count; the dashboard's separate rain estimate comes from ECMWF, GFS and ICON ensembles, which each contain multiple model runs. It shows their range as well as the middle estimate. Radar shows recent rain rather than a forecast, and zooming in on the track doesn't give you corner-by-corner detail. [More on the sources and their limits](docs/API_SOURCES.md).

Track temperature needs a trackside measurement. Pitwall keeps your manual reading and its time separate from forecast air temperature; it doesn't substitute soil temperature or invent an asphalt reading.

## Your data

Your circuits, sessions, preferences and saved forecasts stay on your computer. Pitwall doesn't upload your plans or history to a hosted service, and there's no cloud sync. Your computer asks the weather and map providers directly for the location you're looking at, so they see that location and ordinary connection details, as any website would.

Pitwall needs internet for fresh forecasts, search, maps and radar. Offline, it still opens and shows any forecasts you already have, labelled with when they were fetched.

To move your plans to another computer, or from an older browser version of Pitwall, export a backup file from Preferences and import it in the app. History is exported separately as a CSV file. [Privacy and storage details](docs/PRIVACY.md).

## Running it from source

This part is only for people who want to work on the code. You need [Node.js 22.13 or newer](https://nodejs.org/en/download).

```sh
git clone https://github.com/Arthur-Brht/pitwall.git pitwall
cd pitwall
npm ci
npm start -- --open
```

This runs Pitwall in your browser at `http://localhost:4173/` until you stop it with Ctrl+C. See [running locally](docs/RUN_LOCALLY.md) for more.

For development and tests:

```sh
npm ci
npm run dev
npm run check
npx playwright install chromium firefox webkit
npm run build
npm run test:e2e
```

The development server uses port 5173. The browser tests run on port 4174 with made-up weather data, so they don't touch your saved data or call the real weather services.

Pitwall is built with React, TypeScript and Vite, and Electron packages it as a desktop app. More detail is in [architecture](docs/ARCHITECTURE.md), [forecast verification](docs/FORECAST_VERIFICATION.md), [testing and verification](docs/VERIFICATION.md), [contributing](CONTRIBUTING.md), [security](SECURITY.md) and the [changelog](CHANGELOG.md).

## Licence

Pitwall's code and documentation are under the [MIT licence](LICENSE). The weather data, radar, circuit outlines and libraries it uses keep their own licences and terms. See [third-party terms](THIRD_PARTY.md).

Open-Meteo's free service is for non-commercial use within its limits. The code's licence doesn't include commercial access to these providers, so check their terms before redistributing Pitwall or using it commercially.
