import type { Forecast, Hour } from "./contracts";
import { overlaps } from "./run-weather.ts";

const valid = (value: number | null) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;
export const downwind = (from: number) => (from + 180) % 360;

/** Directions are meteorological FROM bearings. Never animate an opposing average. */
export function windOutlook(forecasts: Forecast[], start: number, end: number) {
  const rows = forecasts.map((forecast) => ({
    forecast,
    hours: forecast.hours.filter((hour) =>
      overlaps({ start: hour.time, end: hour.time + 3600 }, start, end),
    ),
  }));
  const samples = rows.flatMap((row) => row.hours);
  const speeds = samples.map((h) => h.wind).filter(valid) as number[];
  const gusts = samples.map((h) => h.gust).filter(valid) as number[];
  const moving = samples.filter((h) => valid(h.wind) && h.wind! >= 1);
  const directions = moving
    .map((h) => h.direction)
    .filter((d): d is number => valid(d) && d! <= 360);
  const x = directions.reduce(
    (sum, d) => sum + Math.sin((d * Math.PI) / 180),
    0,
  );
  const y = directions.reduce(
    (sum, d) => sum + Math.cos((d * Math.PI) / 180),
    0,
  );
  const mean = ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360;
  const spread = directions.length
    ? Math.max(
        ...directions.map((d) => Math.abs(((d - mean + 540) % 360) - 180)),
      )
    : null;
  const kind = !speeds.length
    ? "unavailable"
    : !moving.length
      ? "calm"
      : !directions.length
        ? "unavailable"
        : spread! > 60 || Math.hypot(x, y) / directions.length < 0.75
          ? "variable"
          : "directional";
  return {
    kind,
    direction: kind === "directional" ? mean : null,
    towards: kind === "directional" ? downwind(mean) : null,
    speed: speeds.length
      ? { min: Math.min(...speeds), max: Math.max(...speeds) }
      : null,
    gust: gusts.length ? Math.max(...gusts) : null,
    sources: rows.filter((row) => row.hours.some((h) => valid(h.wind))).length,
    directionSources: rows.filter((row) =>
      row.hours.some(
        (h) =>
          valid(h.wind) &&
          h.wind! >= 1 &&
          valid(h.direction) &&
          h.direction! <= 360,
      ),
    ).length,
    // A real hourly sample only: missing hours are never filled or interpolated.
    hours: [...new Set(samples.map((h) => h.time))].sort((a, b) => a - b),
  };
}
export type WindOutlook = ReturnType<typeof windOutlook>;

export function windHours(forecasts: Forecast[], start: number, end: number) {
  const times = [
    ...new Set(
      forecasts.flatMap((f) =>
        f.hours
          .filter((h: Hour) =>
            overlaps({ start: h.time, end: h.time + 3600 }, start, end),
          )
          .map((h) => h.time),
      ),
    ),
  ].sort((a, b) => a - b);
  return times.map((time) => ({
    time,
    ...windOutlook(forecasts, time, time + 3600),
  }));
}
