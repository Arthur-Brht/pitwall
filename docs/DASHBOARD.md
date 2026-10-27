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

Air temperature, humidity, dew point, wind and gusts come from forecasts for this hour. They are not trackside observations. Track temperature stays unavailable until you enter a thermometer reading. Manual readings carry the circuit-local date and time, remain separate from weather estimates, and are labelled older after one hour. They are saved per location and included in device backups.

## Radar window

From and To select the start and end of the playback loop. The frame slider and play button stay within that range. Full history resets it to all returned frames. Selection is clamped when older frames disappear after refresh; a single selected frame cannot play.

[RainViewer](https://www.rainviewer.com/api/weather-maps-api.html) normally supplies around two hours of past radar at ten-minute steps. The controls cannot retrieve dates outside that history and do not turn historical radar into a forecast. Coverage gaps and tile failures remain visible.
