# Rain dashboard

The Dashboard is the opening view. Choose this hour or a 3, 6, 12 or 24-hour window to compare the rain outlook at your selected circuit. The displayed start and end use the circuit's timezone. Windows contain complete hours, including the current hour.

## Rain estimate and agreement

The percentage comes from ECMWF, GFS and ICON ensemble forecasts, fetched through [Open-Meteo's Ensemble API](https://open-meteo.com/en/docs/ensemble-api). Each ensemble contains multiple model runs. Pitwall checks whether each run predicts at least your selected hourly rain threshold in any hour of the window. It does not add hourly percentages or assume that successive hours are independent.

A member must have a finite, nonnegative rain value for every hour in the window. At least two members and 80% of the supplied members must be complete before that ensemble contributes an estimate. Every model family has equal weight, regardless of its ensemble size. The middle family estimate is the headline percentage; the lowest and highest family estimates are shown alongside it. This is an ensemble estimate, not an independently calibrated track-level probability. A zero means no qualifying complete member predicted rain, not that rain is impossible.

Agreement is separate. The dashboard counts individual forecasts that expect rain, those that remain dry with complete coverage, and incomplete forecasts. Related forecasts share one model-family vote. Any rain signal in a family is retained so a wet outlier cannot disappear inside a dry median. Missing hours or failed requests never count as dry.

The descriptive rain-risk label is:

- **Elevated:** the middle ensemble estimate is at least 60%, or at least half of three or more reporting families signal rain.
- **Possible:** any ensemble estimate is at least 20%, or any reporting model family signals rain.
- **Low signal:** neither condition applies and enough evidence is present.
- **Limited:** no usable ensemble estimate and fewer than three reporting model families.

These labels describe forecast rain signals. They do not measure grip, tyre suitability, aquaplaning, standing water or driving safety. Cached forecasts retain their real fetch times; an offline or failed refresh is shown as saved data.

## Forecast choices

Manage forecasts opens the catalog. Eight feeds are enabled by default: ECMWF IFS, DWD ICON, NOAA GFS, Météo-France, UK Met Office, Canada GEM, Japan JMA and direct MET Norway. KNMI HARMONIE and ItaliaMeteo ICON-2I are optional regional choices. Availability, horizon and resolution depend on location.

Choices are saved separately for each coordinate pair, including custom locations, and travel in device backups. Switching to another circuit does not change its selection. The Models view also lets you temporarily exclude a loaded feed from comparison. Ensemble estimates remain a separate three-system comparison.

MET Norway is grouped with ECMWF, KNMI conservatively with the AROME/Météo-France family, and ItaliaMeteo with ICON. More named forecasts do not necessarily mean more independent evidence.

## Circuit conditions

Air temperature, humidity, dew point, wind and gusts come from forecasts for this hour. They are not trackside observations. The manual track-temperature feature has been removed. Existing readings from older versions are retained in backups for compatibility but are no longer shown or edited.

## Rain timing and intensity

The hourly first signal is shown as an interval, such as 18:00–19:00. It is not an exact arrival time. The separate Rain timing card uses explicit native 15-minute [ICON-D2](https://open-meteo.com/en/docs/dwd-api) and [AROME](https://open-meteo.com/en/docs/meteofrance-api) products, only where the region is covered, the corresponding forecast is enabled, and recent data are supplied. It reports a 15-minute first-signal window for the chosen outlook, up to six hours, and plots the next two hours. These regional runs are from existing model families and do not add independent votes to the headline.

Open-Meteo's preceding-quarter-hour accumulation is moved to the interval beginning 15 minutes earlier. The amount is multiplied by four only to express the average rate in mm/h. Missing or negative values remain unavailable. Hourly data are never divided or interpolated to claim finer timing. Portimão, for example, is outside the selected native AROME domain; a regional run can also have no current output inside its domain. In those cases the hourly comparison remains available.

Rain charts use approximate hourly-rate guides based on [NOAA's intensity table](https://www.noaa.gov/jetstream/appendix/weather-glossary-r): light up to 2.5 mm/h, moderate above 2.5 through 7.6 mm/h, and heavy above 7.6 mm/h. These are descriptive guides, not tyre or grip limits. The default chart extends to at least 10 mm/h so a small shower does not fill the whole axis. Zoom to forecast gives more detail while retaining the guide. Hourly values are drawn as steps, not interpolated arrival predictions. An hourly average can conceal a brief heavier shower.

The provider comparison includes a short explanation of global models. [JMA's GSM](https://www.jma.go.jp/jma/en/Activities/nwp.html) covers the whole world; the agency's country does not restrict its forecast area.

## Radar window

From and To, under Playback range & map options, select the start and end of the loop. The frame slider and play button stay within that range. Full history resets it to all returned frames. Selection is clamped when older frames disappear after refresh; a single selected frame cannot play. Previous/next controls step through actual scans, and the speed selector changes playback pace.

Playback preloads the next scan and keeps the previous complete scan visible while a replacement loads. Adjacent scans cross-fade; seeking or wrapping to the beginning changes directly to the selected real frame. At most three radar tile layers are retained. Smooth transitions can be disabled, and reduced-motion settings are respected. These are visual blends, not new radar observations or motion forecasts. The timestamp always names a real scan. Tile failures keep the previous scan and its time with a visible warning. Refresh retries failed tiles even when the available frame timestamps have not changed.

[RainViewer](https://www.rainviewer.com/api/weather-maps-api.html) normally supplies around two hours of past radar at ten-minute steps. The controls cannot retrieve dates outside that history and do not turn historical radar into a forecast. Coverage gaps and tile failures remain visible.
