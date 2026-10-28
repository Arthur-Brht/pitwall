import type { EnsembleForecast, Forecast, NearRainForecast } from "./contracts";
import { rainOutlook } from "./rain-outlook.ts";
import { rainArrival, NATIVE_FORECAST_HOURS } from "./near-rain.ts";
import { rainIntensity } from "./rain-intensity.ts";
import { validRain } from "./rain-value.ts";

export function enabledNearRain(
  forecasts: NearRainForecast[],
  selected: string[],
  disabled: string[],
) {
  return forecasts.filter(
    (f) => selected.includes(f.sourceId) && !disabled.includes(f.sourceId),
  );
}

/** Keep hourly probability and native regional timing separate; never invent minutes. */
export function rainDecision(
  forecasts: Forecast[],
  ensembles: EnsembleForecast[],
  native: NearRainForecast[],
  now: number,
  hours: number,
  threshold: number,
) {
  const start = Math.floor(now / 3600) * 3600,
    end = start + hours * 3600;
  const outlook = rainOutlook(forecasts, ensembles, start, end, threshold);
  const nativeEnd = Math.min(end, now + NATIVE_FORECAST_HOURS * 3600);
  const arrivals = native.map((f) => ({
    forecast: f,
    ...rainArrival(f.points, 900, now, nativeEnd, threshold),
  }));
  const firstNative =
    arrivals
      .flatMap((a) => (a.first ? [a.first] : []))
      .sort((a, b) => a.start - b.start)[0] ?? null;
  const hourly =
    outlook.firstRain === null
      ? null
      : { start: outlook.firstRain, end: outlook.firstRain + 3600 };
  const nativeDry =
    arrivals.length > 0 && arrivals.every((a) => a.complete && !a.first);
  const conflict =
    !!(
      firstNative &&
      (!hourly ||
        firstNative.end <= hourly.start ||
        hourly.end <= firstNative.start)
    ) || !!(nativeDry && hourly && hourly.start < nativeEnd);
  const onset =
    firstNative ??
    (nativeDry && hourly && hourly.start < nativeEnd ? null : hourly);
  const rates = firstNative
    ? native.flatMap((f) =>
        f.points
          .filter(
            (p) => p.time === firstNative.start && validRain(p.precipitation),
          )
          .map((p) => p.precipitation! * 4),
      )
    : hourly
      ? forecasts.flatMap((f) =>
          f.hours
            .filter(
              (h) => h.time === hourly.start && validRain(h.precipitation),
            )
            .map((h) => h.precipitation!),
        )
      : [];
  const intensity = rainIntensity(rates.length ? Math.max(...rates) : null);
  const total = outlook.wetSources + outlook.drySources;
  const agreement = !total
    ? "Hourly rain data is unavailable."
    : outlook.wetSources === total
      ? `All ${total} reporting hourly forecasts show rain.`
      : !outlook.wetSources
        ? `None of ${total} reporting hourly forecasts show rain.`
        : `${outlook.wetSources} of ${total} reporting hourly forecasts show rain.`;
  const basis = firstNative
    ? "First available 15-minute regional signal."
    : nativeDry && hourly && hourly.start < nativeEnd
      ? "Regional forecasts stay dry near term; hourly forecasts show rain."
      : hourly
        ? "First hourly signal; finer timing is unavailable for this rain window."
        : !total || outlook.incompleteSources
          ? "Some rain data is missing."
          : "Models can still miss local showers.";
  return {
    outlook,
    onset,
    intensity,
    conflict,
    agreement,
    basis,
    native: !!firstNative,
    risk:
      firstNative && (outlook.risk === "low" || outlook.risk === "limited")
        ? "possible"
        : outlook.risk,
  };
}
