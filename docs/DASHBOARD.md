# Rain dashboard

The opening screen focuses on one circuit and one run. Open the circuit name or menu to choose the circuit, a saved session, or a date and start/end time. Times use the circuit's timezone. The drawer remembers whether it is open, and each circuit remembers its run selection and buffers.

By default Pitwall uses a current or next saved session starting within 24 hours. Without one, it starts at the current minute and looks three hours ahead. Choosing a saved session explicitly keeps that session selected. Custom times can cross midnight; an end earlier than the start means the following day. Ambiguous or skipped daylight-saving times are rejected rather than silently choosing an offset.

## The run and its buffers

The default buffers are 15 minutes before and after, adjustable separately to 0, 5, 10, 15, 30 or 60 minutes. A 14:00–14:30 run therefore displays 13:45–14:45. Buffers extend the forecast timeline and default Models view. The rain agreement, temperature and wind summaries still describe the actual run. Rain confined to a buffer is not counted as rain during the run. Without a session, the next-three-hours view starts now and has no extra buffers.

## Rain timing and agreement

**Who forecasts what** adds a readable outlook under each source: the actual rain periods that overlap your run, interval-average intensity, next known dry interval, and (for hourly feeds) that source's air temperature, wind and gusts. Separate showers stay separate; gaps never become dry votes. Times retain the source's original interval, even for a short run. A dry interval is not a claim that the track dries. Rain confined to a buffer is stated explicitly. Fetch times identify when Pitwall retrieved the data, not when an agency issued a new model run. Saved cached rows remain labelled.

Each hourly source reports its original hourly blocks. Native regional forecasts use real 15-minute intervals where available. Pitwall requests up to 24 hours automatically; the actual horizon depends on the product and the data returned (AROME can end earlier than ICON-D2). Missing later intervals stay missing. The rows share one axis and mark the run and now. Selecting a block reveals the original full interval and amount. A small note says when only hourly timing is available for the displayed window. The interface does not split an hourly accumulation into apparent quarter-hour or minute-by-minute observations.

The hourly source count includes a source if it shows qualifying rain or has complete rain coverage of the run. Missing hours, invalid negative values and unavailable requests never become dry votes. Regional rows are listed separately and do not inflate that hourly count. Counts are forecasts, not independent opinions: several share model ancestry.

For the first hourly signal, Pitwall finds the largest group of overlapping first wet intervals in the displayed window. An isolated earlier source does not take over that timing group; its row remains visible. The number of forecasts supporting the group is shown. Regional timing appears in a separate short line, including a warning when it contradicts the hourly outlook. When rain during the run is reported only by regional forecasts, those forecasts supply the main arrival and clearing fields, explicitly labelled regional. The headline retains that shower warning even during an hourly outage. Hourly and regional votes remain separate.

A clearing signal follows each source's last wet interval in the displayed window through contiguous known wet intervals to its next known dry interval. It looks up to six hours beyond the displayed window without changing your buffers or the timeline. It cannot bridge a missing value or missing timestamp. If a stop is outside the timeline, that is stated beside it, with a date when needed. The main clearing group shows its supporting count out of all wet forecasts of that type, and how many have no confirmed stop. Sources clearing later remain in that denominator. No stop time is invented when data end or rain continues. A dry interval can be a temporary pause; clearing means rain stopping in those forecasts, not a dry surface or recovered grip.

The rain threshold is configurable in preferences, in mm/h. Intensity uses interval-average rate: light up to 2.5 mm/h, moderate up to 7.6 mm/h and heavy above that. A 15-minute amount is multiplied by four for the shared rate scale, with its original accumulation available on the block. An interval average can hide a heavier short shower.

## Ensemble estimate

The secondary percentage comes from ECMWF, GFS and ICON ensembles through [Open-Meteo's Ensemble API](https://open-meteo.com/en/docs/ensemble-api). It estimates whether at least the selected hourly threshold occurs in any whole hour of that window; it does not add hourly percentages or assume successive hours are independent.

Because these are hourly amounts, a partial-hour run uses the surrounding whole hours, displayed explicitly beside the estimate. For a 14:15–14:45 run the percentage covers 14:00–15:00 and can include rain outside the run. It is never presented as an exact probability for those 30 minutes. The hourly agreement count and ensemble estimate therefore have different, explicit meanings.

A member must have valid nonnegative rain in every required hour. An ensemble needs at least two complete members and 80% of its members complete to contribute. Families receive equal weight irrespective of ensemble size. The median family estimate and the full family estimate range are displayed. Zero does not mean rain is impossible. This is not an independently calibrated track-level probability.

## What changed

The change line appears only when genuine earlier saved hourly captures for the same sources cover all the same valid hours as the selected run. It can report newly wet/dry sources, earlier/later first wet hours or a change in intensity category. A later fetch timestamp alone is not described as a new model run. The line names its comparison time or time range and the number of comparable hourly sources. Native quarter-hour evolution is not claimed because the existing history stores hourly values.

## Temperature, wind and detail

Air temperature and wind are ranges across available forecasts overlapping the actual run. Gusts show the highest reported value. The animated compass names both where the wind comes **from** and where the air moves **towards**; north stays at the top, like the circuit map. It follows the providers' meteorological convention ([MET Norway's arrow examples](https://api.met.no/weatherapi/locationforecast/2.0/documentation)). The animation illustrates direction, not measured particles, gust evolution or a spatial wind field around the track.

The direction summary uses a circular mean of valid directions paired with wind of at least 1 km/h. It suppresses the arrow when directions spread more than 60 degrees from that mean or resultant strength falls below 0.75: these are presentation rules, not a calibrated confidence score. Calm means all available wind samples are below 1 km/h; missing directions stay unavailable. A turning wind can therefore have no whole-run arrow while its real hourly samples show different directions below the radar. The hourly view does not interpolate between samples. Source counts identify available speed and direction feeds separately. Use the single pause button to stop the decorative motion; the system's reduced-motion preference also stops it.

Humidity, other current conditions, charts and methods remain behind the detail disclosure. Missing values remain unavailable. Regional quarter-hour rows supply rain only; hourly wind or temperature are never attributed to those products.

The radar is recent observed rain, independent of the future run window. Its full available two-hour history remains the default playback range. Scans are ten minutes apart; cross-fading smooths their presentation without adding observations. Internet access, provider limits and radar coverage remain external constraints.
