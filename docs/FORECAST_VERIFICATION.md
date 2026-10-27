# Forecast verification

Pitwall can compare genuine saved predictions with measured station observations. Forecast evolution and model agreement alone do not establish accuracy.

## Use your own observations

1. Keep Pitwall open occasionally at the circuit so actual predictions are recorded before their valid hours. Export history if you need evidence beyond the browser's retention window.
2. Obtain hourly observations from a trusted station within 25 km, with coordinates, units, timestamps and measurement-period definitions. A closer station at similar elevation/exposure is preferable; distance alone does not establish representativeness.
3. In **History & sources → Forecast verification**, download the empty CSV template and fill it with measurements. Import one station/source at a time. No API key, upload or account is involved.
4. Review the station distance, matched-hour counts, lead bands and errors. Export the comparison if needed. Imported observations are kept only in that panel until it closes or reloads.

The exact CSV header is:

```csv
station,source,latitude,longitude,observed_at_utc,temperature_C,precipitation_mm_hour,wind_km_h
```

Use UTC timestamps such as `2026-10-26T12:00:00Z`. Temperature is °C; wind is km/h. Hourly precipitation must describe **12:00–13:00**, the interval beginning at its timestamp. If a provider labels rain by the end of the hour, align it correctly before importing. Leave unavailable fields empty; never substitute zero or a provider's missing-value sentinel. Do not import reanalysis or another forecast as an observation.

The importer checks timestamps, ranges, missing values, station identity, duplicate conflicts and file size. Those checks cannot authenticate a station or establish that its measurement method matches the model. Check sensor height, averaging periods, elevation, exposure and quality flags yourself. Hourly mean temperature is not identical to an instantaneous model value and should be treated as an exploratory comparison.

## Scoring method

Only exact UTC valid-hour matches are used. A forecast must have been fetched **strictly before** its valid time. Retrospectively fetched predictions, future observations, missing scalar values and unmatched hours are excluded.

The latest actual fetch is selected for each source, valid hour and lead band: 0–6, 6–24, 24–48 and 48–72 hours. Lead uses fetch time because model initialization time is unavailable. The browser currently records the first 24 forecast hours per fetch, so its normal evidence is in the first two bands. The same observed hour can contribute to different lead bands; those scores are not independent observations.

For each field/source/lead band, the report gives matched sample count, mean absolute error, signed bias and root mean square error. Positive bias means overprediction. Rain also reports hits, misses, false alarms and correct dry intervals at the selected amount threshold. These categorical counts are not probability calibration or a Brier score.

Small, dry, single-station or single-event samples cannot establish which forecast is generally best. A useful ongoing evaluation needs many weather situations, circuits and lead times, a common matched sample, suitable observations and explicit missing-data reporting.

## Real nearby-station pilot — 27 October 2026

The frozen [pilot inputs and results](validation/pilot-2026-10-27.json) contain genuine Portimão forecasts captured on 26 October, before their valid hours, and observations from **IPMA station 1210878, Portimão (Aeródromo)**. The station is **10.04 km** from the selected circuit coordinates. Nine distinct measured UTC hours matched; each field/band reports its own sample count.

For the 0–6-hour band, seven temperature/wind samples were available per feed:

| Feed         | Air temperature MAE (°C) | Wind MAE (km/h) |
| ------------ | -----------------------: | --------------: |
| ECMWF IFS    |                     2.71 |            4.00 |
| NOAA GFS     |                     2.90 |            5.79 |
| DWD ICON     |                     4.27 |            4.30 |
| Météo-France |                     3.09 |            5.59 |
| MET Norway   |                     2.33 |            7.97 |

This is a **nearby-station consistency check**, not track-level calibration or a model ranking. IPMA reports hourly mean air temperature at 1.5 m; the model field is an instantaneous two-metre value. The airport and inland circuit also have different terrain and exposure. Those differences contribute to the errors. Rain is excluded because its accumulation-period alignment was not established for this pilot. No observation or historical prediction was invented.

Reproduce the stored calculation without a network connection:

```sh
npm run verify:pilot
```

Observation sources: [IPMA station catalogue](https://api.ipma.pt/open-data/observation/meteorology/stations/stations.json), [rolling hourly observations](https://api.ipma.pt/open-data/observation/meteorology/stations/observations.json), and [field definitions and reuse conditions](https://api.ipma.pt/). Data © IPMA; its attributed non-commercial reuse conditions apply separately from the code's MIT licence. The API is a rolling feed, so frozen inputs are retained for reproducibility. Forecast data © Open-Meteo and MET Norway, normalized by Pitwall, under their stated data licences.

[![IPMA, source of the pilot observations](validation/ipma-logo.png)](https://api.ipma.pt/)

The logo is retained unmodified to credit the source, in accordance with IPMA's reuse notice; it does not imply endorsement of Pitwall.
