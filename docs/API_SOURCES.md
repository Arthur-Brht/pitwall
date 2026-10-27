# Data sources and interpretation

## Forecast feeds

Pitwall enables seven Open-Meteo model products by default—ECMWF IFS 0.25°, DWD ICON seamless, NOAA GFS seamless, Météo-France seamless, UK Met Office seamless, Canada GEM seamless and Japan JMA seamless—alongside direct MET Norway Locationforecast. Optional KNMI HARMONIE and ItaliaMeteo ICON-2I feeds can be selected per location. Seamless products can change regional model/resolution; hourly output can be interpolated from coarser steps. Regional feeds may be unavailable or have shorter coverage at some circuits.

[Open-Meteo documentation](https://open-meteo.com/en/docs), [MET Norway Locationforecast](https://api.met.no/weatherapi/locationforecast/2.0/documentation), [MET Norway data model](https://docs.api.met.no/doc/locationforecast/datamodel.html).

MET Norway shares ECMWF ancestry outside its regional domain and is conservatively grouped with IFS for consensus. KNMI is conservatively grouped with AROME/Météo-France, and ItaliaMeteo with ICON. More named outputs are not necessarily independent evidence. Other models also share observations and methods. Forecast selections are saved per coordinate pair; deselected feeds are not requested.

The dashboard additionally fetches ECMWF, GFS and ICON precipitation ensembles through the [Ensemble API](https://open-meteo.com/en/docs/ensemble-api). The window estimate checks each complete member for threshold-crossing rain during any included hour, then gives each model family equal weight. At least 80% of the supplied members and at least two complete members are required per ensemble. It shows the middle estimate and the range across systems; it is not an independently calibrated probability. These ensembles do not add votes to the separate deterministic/provider agreement count. [Dashboard definitions](DASHBOARD.md).

## Units and valid intervals

Internally, valid times are UTC Unix seconds; the interface uses the circuit's IANA timezone. Air temperature/dew point are °C, wind/gusts km/h, one-hour precipitation mm, pressure hPa and visibility metres. Missing scalar values remain null.

Precipitation describes the hour **beginning** at `Hour.time`. Open-Meteo reports preceding-hour amounts, so the amount at time+1 hour is paired with the interval beginning at time. Its preceding-hour gust maximum is shifted similarly. MET Norway `next_1_hours` rain already follows this convention; its instant gusts retain the provider timestamp. Six-hour rain is never divided into synthetic hourly amounts. Instant meteorological fields remain at the original valid time.

Fetch time means receipt by this browser, not model initialization. Pitwall does not invent cycle times. Requests use a ten-minute application cache; manual Refresh bypasses that cache while respecting Retry-After and MET Norway Expires when supplied. Coordinates are rounded to four decimals for public requests.

Open-Meteo model and ensemble requests are spaced at least 250 ms apart to avoid a burst on circuit changes. An HTTP 429 response applies a persisted cooldown across both Open-Meteo endpoints, not just the failed model URL. Refresh does not bypass that cooldown. Other providers retain their own cooldowns, and available/saved data remain explicit when a source cannot respond.

If a feed fails, its last real forecast fetched less than 24 hours ago can be shown if future intervals remain. It is labelled saved, with the original fetch time. Failures never renew that timestamp. Missing hours/fields remain missing.

## Consensus and planned sessions

Each reporting model family contributes its available median per field/hour. Wet family vote is the fraction of reporting families at or above the selected hourly rain threshold, not precipitation probability. Range/extrema retain individual-source differences.

The first wet signal includes any enabled source, even when its family median is dry. Model-dry windows require below-threshold rain from every enabled source over every interval, at least two reporting model families, and gust evidence from at least two families below the chosen gust review limit. Missing gust feeds are disclosed. Windows cannot bridge missing hours or elapsed time and must fit the selected duration.

Session summaries use the actual overlap of hourly intervals. Partial-hour rain totals are prorated rough estimates, not minute-resolution predictions. Gust thresholds are user review preferences, not race-control or safety limits.

## Radar and circuit maps

[RainViewer](https://www.rainviewer.com/api/weather-maps-api.html) supplies past radar composites, normally two hours at ten-minute steps. It is not future radar. Frame-generation times can differ from contributing radar observation times. Native zoom is seven; enlarging pixels over a circuit cannot show corner-level weather. Coverage masks distinguish unverified areas; transparency does not prove dry conditions.

Playback From/To controls select actual returned frames. The slider and loop are bounded to that interval, and selection is clamped to the available history after refresh. They cannot query arbitrary past dates or future radar.

Nine bundled outlines come from [F1 Circuits / Tomislav Bacinger](https://github.com/bacinger/f1-circuits), with its MIT licence retained. Nogaro uses [OSM way 95798633](https://www.openstreetmap.org/way/95798633), © OpenStreetMap contributors, ODbL 1.0. Raw source files and provenance are retained under `web/public/circuits/`. Download date is not survey date; circuit layouts can change.

Other locations query actual OSM raceways through Overpass within six kilometres. Results can include kart circuits or alternate layouts. When geometry is unavailable, Pitwall shows only the selected coordinates. It does not invent corners, sectors or boundaries from weather grids.

## History and observation verification

IndexedDB retains genuine fetched predictions for the same valid hour. It stores the first 24 hours per feed, up to 30,000 points per location over seven days. Recent captures remain distinct; captures older than six hours retain the latest actual fetch per source, valid hour and UTC capture hour. Cached snapshots are deduplicated.

History charts compare temperature, hourly rain or wind across actual fetches. CSV keeps source, location, UTC fetch and valid timestamps. Forecast evolution is not an observed weather record.

The separate observation importer compares exact valid hours with nearby measured station data, excluding retrospective fetches. It reports counts, errors, lead bands and measurement limits. [Verification method and real pilot](FORECAST_VERIFICATION.md).

Provider access, quotas, CORS, licences and availability remain external limits. No API key, proxy bypass, login or cloud service is used. [Attribution and terms](../THIRD_PARTY.md).
