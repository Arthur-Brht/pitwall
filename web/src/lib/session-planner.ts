import type { Forecast, Hour } from "./contracts";
import { finite } from "./consensus.ts";
import { validRain } from "./rain-value.ts";

const maximum = (values: (number | null)[]) => {
  const available = values.filter(finite);
  return available.length ? Math.max(...available) : null;
};
const minimum = (values: (number | null)[]) => {
  const available = values.filter(finite);
  return available.length ? Math.min(...available) : null;
};

export function overlappingHours(
  hours: Hour[],
  start: number,
  end: number,
): Hour[] {
  if (!finite(start) || !finite(end) || end <= start) return [];
  const unique = new Map<number, Hour>();
  for (const hour of hours) {
    if (
      finite(hour.time) &&
      hour.time < end &&
      hour.time + 3600 > start &&
      !unique.has(hour.time)
    ) {
      unique.set(hour.time, hour);
    }
  }
  return [...unique.values()].sort((a, b) => a.time - b.time);
}

/** Union of reported intervals: duplicates cannot fill a missing hour. */
export function intervalCoverage(
  hours: { time: number }[],
  start: number,
  end: number,
): number {
  if (!finite(start) || !finite(end) || end <= start) return 0;
  let covered = 0,
    until = start;
  for (const hour of [...hours]
    .filter((h) => finite(h.time))
    .sort((a, b) => a.time - b.time)) {
    const from = Math.max(start, until, hour.time);
    const to = Math.min(end, hour.time + 3600);
    if (to > from) {
      covered += to - from;
      until = to;
    }
  }
  return Math.min(1, covered / (end - start));
}

export function sessionSources(
  forecasts: Forecast[],
  start: number,
  end: number,
  threshold = 0.1,
) {
  return forecasts.map((forecast) => {
    const hours = overlappingHours(forecast.hours, start, end);
    const rain = hours.filter((h) => validRain(h.precipitation));
    const gusts = hours.filter((h) => finite(h.gust));
    return {
      id: forecast.id,
      name: forecast.name,
      color: forecast.color,
      family: forecast.family || forecast.id,
      fetchedAt: forecast.fetchedAt,
      hours,
      rainCoverage: intervalCoverage(rain, start, end),
      gustCoverage: intervalCoverage(gusts, start, end),
      rainEstimate: rain.length
        ? rain.reduce(
            (sum, h) =>
              sum +
              (h.precipitation! *
                Math.max(
                  0,
                  Math.min(end, h.time + 3600) - Math.max(start, h.time),
                )) /
                3600,
            0,
          )
        : null,
      peakRain: maximum(rain.map((h) => h.precipitation)),
      peakGust: maximum(gusts.map((h) => h.gust)),
      minTemperature: minimum(hours.map((h) => h.temperature)),
      maxTemperature: maximum(hours.map((h) => h.temperature)),
      wetIntervals: rain.filter((h) => h.precipitation! >= threshold).length,
    };
  });
}

export type DryWindow = {
  start: number;
  end: number;
  peakGust: number;
  minGustSources: number;
  sourceCount: number;
  familyCount: number;
};

/** Every enabled source must report dry rain, including related/dissenting feeds.
 * Gusts require two reporting families; missing gust sources stay disclosed.
 */
export function getDryWindows(
  forecasts: Forecast[],
  now: number,
  threshold: number,
  gustLimit: number,
  durationMinutes = 60,
): DryWindow[] {
  if (
    ![now, threshold, gustLimit, durationMinutes].every(finite) ||
    threshold <= 0 ||
    gustLimit <= 0 ||
    durationMinutes <= 0
  )
    return [];
  const familyCount = new Set(forecasts.map((f) => f.family || f.id)).size;
  if (familyCount < 2) return [];
  const sources = forecasts.map((f) => ({
    family: f.family || f.id,
    hours: new Map(
      overlappingHours(f.hours, now, now + 72 * 3600).map((h) => [h.time, h]),
    ),
  }));
  const times = [...new Set(sources.flatMap((s) => [...s.hours.keys()]))].sort(
    (a, b) => a - b,
  );
  const windows: DryWindow[] = [];
  let run: { time: number; gust: number; gustSources: number }[] = [];
  const flush = () => {
    if (run.length) {
      const start = Math.ceil(Math.max(now, run[0].time) / 900) * 900;
      const end = run.at(-1)!.time + 3600;
      if (end - start >= durationMinutes * 60)
        windows.push({
          start,
          end,
          peakGust: Math.max(...run.map((h) => h.gust)),
          minGustSources: Math.min(...run.map((h) => h.gustSources)),
          sourceCount: forecasts.length,
          familyCount,
        });
    }
    run = [];
  };
  for (const time of times) {
    const rows = sources.map((source) => ({
      family: source.family,
      hour: source.hours.get(time),
    }));
    const gusts = rows.filter((r) => finite(r.hour?.gust));
    const peak = maximum(gusts.map((r) => r.hour!.gust));
    const qualifies =
      rows.every(
        (r) =>
          validRain(r.hour?.precipitation) &&
          r.hour!.precipitation! < threshold,
      ) &&
      new Set(gusts.map((r) => r.family)).size >= 2 &&
      peak !== null &&
      peak < gustLimit;
    if (!qualifies || (run.length && run.at(-1)!.time + 3600 !== time)) flush();
    if (qualifies) run.push({ time, gust: peak!, gustSources: gusts.length });
  }
  flush();
  return windows;
}
