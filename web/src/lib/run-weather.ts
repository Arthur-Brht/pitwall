import type { Forecast, NearRainForecast, HistoryPoint } from "./contracts";
import type { RunFocus } from "./session-focus";
import { validRain } from "./rain-value.ts";
import { rainIntensity } from "./rain-intensity.ts";

export type RainInterval = { start: number; end: number; rate: number | null };
export type RainRow = {
  id: string;
  name: string;
  family: string;
  fetchedAt: string;
  step: number;
  native: boolean;
  intervals: RainInterval[];
};
export function forecastRows(
  forecasts: Forecast[],
  native: NearRainForecast[],
): RainRow[] {
  return [
    ...forecasts.map((f) => ({
      id: f.id,
      name: f.name,
      family: f.family,
      fetchedAt: f.fetchedAt,
      step: 3600,
      native: false,
      intervals: f.hours.map((h) => ({
        start: h.time,
        end: h.time + 3600,
        rate: validRain(h.precipitation) ? h.precipitation : null,
      })),
    })),
    ...native.map((f) => ({
      id: f.id,
      name: f.name,
      family: f.sourceId,
      fetchedAt: f.fetchedAt,
      step: 900,
      native: true,
      intervals: f.points.map((p) => ({
        start: p.time,
        end: p.time + 900,
        rate: validRain(p.precipitation) ? p.precipitation * 4 : null,
      })),
    })),
  ];
}
export const overlaps = (
  interval: { start: number; end: number },
  start: number,
  end: number,
) => interval.start < end && interval.end > start;
export function rowWindow(
  row: RainRow,
  start: number,
  end: number,
  threshold: number,
) {
  const intervals = row.intervals
    .filter((i) => overlaps(i, start, end))
    .sort((a, b) => a.start - b.start);
  let coveredTo = start;
  for (const interval of intervals) {
    if (interval.rate === null || interval.start > coveredTo) continue;
    coveredTo = Math.max(coveredTo, interval.end);
  }
  const wet = intervals.filter((i) => i.rate !== null && i.rate >= threshold);
  const first = wet[0] ?? null;
  const last = wet.at(-1) ?? null;
  // A clearing window requires contiguous known values after the last wet block.
  const clearing = last
    ? (intervals.find(
        (i) => i.start === last.end && i.rate !== null && i.rate < threshold,
      ) ?? null)
    : null;
  return {
    row,
    complete: coveredTo >= end,
    wet: !!first,
    first,
    clearing,
    peak: wet.length ? Math.max(...wet.map((i) => i.rate!)) : null,
  };
}

/** Pick an overlapping timing cluster, rather than promoting the earliest outlier. */
export function timingCluster(intervals: RainInterval[]) {
  const candidates = intervals
    .map((seed) => {
      const members = intervals.filter(
        (i) => i.start <= seed.start && i.end > seed.start,
      );
      return {
        count: members.length,
        start: Math.max(...members.map((i) => i.start)),
        end: Math.min(...members.map((i) => i.end)),
      };
    })
    .sort((a, b) => b.count - a.count || a.start - b.start);
  return candidates[0] ?? null;
}
export function runRain(rows: RainRow[], focus: RunFocus, threshold: number) {
  const summarize = (native: boolean) =>
    rows
      .filter((r) => r.native === native)
      .map((row) => ({
        ...rowWindow(row, focus.start, focus.end, threshold),
        context: rowWindow(
          row,
          focus.displayStart,
          focus.displayEnd,
          threshold,
        ),
      }));
  const hourly = summarize(false),
    regional = summarize(true);
  const reporting = hourly.filter((r) => r.wet || r.complete);
  const wet = reporting.filter((r) => r.wet);
  const contextWet = hourly.filter((r) => r.context.wet);
  const cluster = timingCluster(
    contextWet.flatMap((r) => (r.context.first ? [r.context.first] : [])),
  );
  const clearing = timingCluster(
    contextWet.flatMap((r) => (r.context.clearing ? [r.context.clearing] : [])),
  );
  const regionalWet = regional.filter((r) => r.wet);
  const peak = wet.length ? Math.max(...wet.map((r) => r.peak!)) : null;
  const conflict =
    (regionalWet.length > 0 && wet.length === 0) ||
    (wet.length > 0 &&
      regional.length > 0 &&
      regional.every((r) => r.complete && !r.wet));
  return {
    hourly,
    regional,
    reporting: reporting.length,
    wet: wet.length,
    missing: hourly.filter((r) => !r.complete).length,
    cluster,
    clearing,
    contextWet,
    regionalWet,
    peak,
    conflict,
    intensity: rainIntensity(peak),
    maxPeak:
      rows
        .map((row) => rowWindow(row, focus.start, focus.end, threshold).peak)
        .filter((v): v is number => v !== null)
        .sort((a, b) => b - a)[0] ?? null,
  };
}

export function runConditions(
  forecasts: Forecast[],
  start: number,
  end: number,
) {
  const hours = forecasts.flatMap((f) =>
    f.hours.filter((h) =>
      overlaps({ start: h.time, end: h.time + 3600 }, start, end),
    ),
  );
  const range = (key: "temperature" | "wind" | "gust" | "humidity") => {
    const values = hours
      .map((h) => h[key])
      .filter((v): v is number => v !== null && Number.isFinite(v));
    return values.length
      ? { min: Math.min(...values), max: Math.max(...values) }
      : null;
  };
  const directions = hours
    .map((h) => h.direction)
    .filter((v): v is number => v !== null && Number.isFinite(v));
  const x = directions.reduce(
    (sum, d) => sum + Math.cos((d * Math.PI) / 180),
    0,
  );
  const y = directions.reduce(
    (sum, d) => sum + Math.sin((d * Math.PI) / 180),
    0,
  );
  const direction =
    directions.length && Math.hypot(x, y) / directions.length >= 0.3
      ? ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
      : null;
  return {
    temperature: range("temperature"),
    wind: range("wind"),
    gust: range("gust"),
    humidity: range("humidity"),
    direction,
  };
}

/** Compare identical valid hours for the same source, never different run windows or partial dry votes. */
export function forecastChanges(
  forecasts: Forecast[],
  history: HistoryPoint[],
  start: number,
  end: number,
  threshold: number,
) {
  const changes: {
    name: string;
    kind: "wet" | "dry" | "earlier" | "later" | "heavier" | "lighter";
    since: number;
  }[] = [];
  let compared = 0;
  const dates: number[] = [];
  for (const forecast of forecasts) {
    const current = rowWindow(
      forecastRows([forecast], [])[0],
      start,
      end,
      threshold,
    );
    if (!current.complete) continue;
    const times = forecast.hours
      .filter((h) =>
        overlaps({ start: h.time, end: h.time + 3600 }, start, end),
      )
      .map((h) => h.time);
    const captures = [
      ...new Set(
        history
          .filter(
            (h) =>
              h.provider === forecast.id &&
              Date.parse(h.fetchedAt) < Date.parse(forecast.fetchedAt),
          )
          .map((h) => h.fetchedAt),
      ),
    ]
      .sort()
      .reverse();
    const prior = captures
      .map((fetch) => ({
        fetch,
        points: history.filter(
          (h) =>
            h.provider === forecast.id &&
            h.fetchedAt === fetch &&
            times.includes(h.forecastTime),
        ),
      }))
      .find((c) =>
        times.every((t) =>
          c.points.some(
            (p) => p.forecastTime === t && validRain(p.precipitation),
          ),
        ),
      );
    if (!prior) continue;
    compared++;
    const since = Date.parse(prior.fetch) / 1000;
    dates.push(since);
    const oldWet = prior.points
      .filter(
        (p) => validRain(p.precipitation) && p.precipitation! >= threshold,
      )
      .sort((a, b) => a.forecastTime - b.forecastTime);
    const oldPeak = oldWet.length
      ? Math.max(...oldWet.map((p) => p.precipitation!))
      : null;
    const kind =
      current.wet && !oldWet.length
        ? "wet"
        : !current.wet && oldWet.length
          ? "dry"
          : current.first &&
              oldWet.length &&
              current.first.start < oldWet[0].forecastTime
            ? "earlier"
            : current.first &&
                oldWet.length &&
                current.first.start > oldWet[0].forecastTime
              ? "later"
              : current.peak !== null &&
                  oldPeak !== null &&
                  rainIntensity(current.peak) !== rainIntensity(oldPeak)
                ? current.peak > oldPeak
                  ? "heavier"
                  : "lighter"
                : null;
    if (kind) changes.push({ name: forecast.name, kind, since });
  }
  return compared
    ? {
        compared,
        changes,
        since: Math.min(...dates),
        until: Math.max(...dates),
      }
    : null;
}
