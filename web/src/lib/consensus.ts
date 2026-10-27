import type { Forecast, Hour, ConsensusHour } from "./contracts";

export const finite = (x: unknown): x is number =>
  typeof x === "number" && Number.isFinite(x);
export function median(values: (number | null | undefined)[]): number | null {
  const v = values.filter(finite).sort((a, b) => a - b);
  return v.length
    ? (v[Math.floor((v.length - 1) / 2)] + v[Math.ceil((v.length - 1) / 2)]) / 2
    : null;
}
export function metricValues(hours: Hour[], key: keyof Hour): number[] {
  return hours.map((h) => h[key]).filter(finite);
}
function range(values: (number | null)[]): [number | null, number | null] {
  const v = values.filter(finite);
  return v.length ? [Math.min(...v), Math.max(...v)] : [null, null];
}
function circularMean(values: (number | null)[]): number | null {
  const v = values.filter(finite);
  if (!v.length) return null;
  const x = v.reduce((s, d) => s + Math.cos((d * Math.PI) / 180), 0);
  const y = v.reduce((s, d) => s + Math.sin((d * Math.PI) / 180), 0);
  return Math.hypot(x, y) < 1e-10
    ? null
    : ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
/** Equal weight per underlying model family. Related transports cannot add votes.
 * Counts refer only to families with a finite hourly precipitation value.
 * Agreement describes rain-amount votes, never forecast skill or calibrated probability.
 */
export function buildConsensus(
  forecasts: Forecast[],
  wetThreshold = 0.1,
): ConsensusHour[] {
  if (!finite(wetThreshold) || wetThreshold <= 0)
    throw new RangeError("Wet threshold must be positive.");
  const byTime = new Map<number, Map<string, Hour[]>>();
  for (const f of forecasts) {
    const seen = new Set<number>();
    for (const h of f.hours) {
      if (!finite(h.time) || seen.has(h.time)) continue;
      seen.add(h.time);
      const family = f.family || f.id;
      const atTime = byTime.get(h.time) || new Map<string, Hour[]>();
      const group = atTime.get(family) || [];
      group.push(h);
      atTime.set(family, group);
      byTime.set(h.time, atTime);
    }
  }
  return [...byTime.entries()]
    .sort(([a], [b]) => a - b)
    .map(([time, families]) => {
      const groups = [...families.values()];
      const familyMetric = (key: keyof Hour) =>
        groups.map((g) => median(g.map((h) => h[key])));
      const familyRain = familyMetric("precipitation").filter(finite);
      const count = familyRain.length;
      const wetCount = familyRain.filter((r) => r >= wetThreshold).length;
      const wetShare = count ? wetCount / count : null;
      const [rainMin, rainMax] = range(
        groups.flatMap((g) => g.map((h) => h.precipitation)),
      );
      const [tempMin, tempMax] = range(
        groups.flatMap((g) => g.map((h) => h.temperature)),
      );
      const temperature = median(familyMetric("temperature"));
      const dewpoint = median(familyMetric("dewpoint"));
      return {
        time,
        count,
        wetCount,
        wetShare,
        rainMedian: median(familyRain),
        rainMin,
        rainMax,
        temperature,
        tempMin,
        tempMax,
        dewpoint,
        wind: median(familyMetric("wind")),
        gust: range(groups.flatMap((g) => g.map((h) => h.gust)))[1],
        humidity: median(familyMetric("humidity")),
        cloud: median(familyMetric("cloud")),
        pressure: median(familyMetric("pressure")),
        visibility: median(familyMetric("visibility")),
        direction: circularMean(
          groups.map((g) => circularMean(g.map((h) => h.direction))),
        ),
        probability: median(familyMetric("probability")),
        dewpointSpread:
          finite(temperature) && finite(dewpoint)
            ? temperature - dewpoint
            : null,
        agreement:
          count === 0
            ? "unavailable"
            : count < 3
              ? "limited"
              : wetCount === 0 || wetCount === count
                ? "aligned"
                : wetShare! > 0.25 && wetShare! < 0.75
                  ? "split"
                  : "mixed",
      };
    });
}
export type RainWindow = {
  start: number;
  end: number;
  hours: number;
  meanWetShare: number;
  maxRain: number | null;
  minSources: number;
};
/** Contiguous hourly outlook, missing hours always split windows. */
export function getRainWindows(
  hours: ConsensusHour[],
  minHours = 1,
): RainWindow[] {
  const windows: RainWindow[] = [];
  let run: ConsensusHour[] = [];
  const flush = () => {
    if (run.length >= minHours)
      windows.push({
        start: run[0].time,
        end: run[run.length - 1].time + 3600,
        hours: run.length,
        meanWetShare: run.reduce((s, h) => s + h.wetShare!, 0) / run.length,
        maxRain: range(run.map((h) => h.rainMax))[1],
        minSources: Math.min(...run.map((h) => h.count)),
      });
    run = [];
  };
  for (const h of [...hours].sort((a, b) => a.time - b.time)) {
    if (
      !finite(h.wetShare) ||
      h.wetShare < 0.5 ||
      (run.length && h.time !== run[run.length - 1].time + 3600)
    )
      flush();
    if (finite(h.wetShare) && h.wetShare >= 0.5) run.push(h);
  }
  flush();
  return windows;
}
/** Session overlap is [start,end); partial-hour rain amount prorated only for a rough outlook. */
export function summarizeSession(
  hours: ConsensusHour[],
  start: number,
  end: number,
) {
  const selected = [...new Map(hours.map((h) => [h.time, h])).values()]
    .filter((h) => finite(h.time) && h.time < end && h.time + 3600 > start)
    .sort((a, b) => a.time - b.time);
  let coveredSeconds = 0,
    until = start;
  for (const hour of selected) {
    const from = Math.max(start, until, hour.time),
      to = Math.min(end, hour.time + 3600);
    if (to > from) {
      coveredSeconds += to - from;
      until = to;
    }
  }
  const wetVotes = selected.filter((h) => finite(h.wetShare));
  const voteSeconds = wetVotes.reduce(
    (sum, h) =>
      sum + Math.max(0, Math.min(end, h.time + 3600) - Math.max(start, h.time)),
    0,
  );
  const validRain = selected.filter((h) => finite(h.rainMedian));
  const rainAmount = validRain.length
    ? validRain.reduce(
        (s, h) =>
          s +
          (h.rainMedian! *
            Math.max(
              0,
              Math.min(end, h.time + 3600) - Math.max(start, h.time),
            )) /
            3600,
        0,
      )
    : null;
  return {
    hours: selected,
    coverage: end > start ? Math.min(1, coveredSeconds / (end - start)) : 0,
    meanWetShare: voteSeconds
      ? wetVotes.reduce(
          (sum, h) =>
            sum +
            h.wetShare! *
              Math.max(
                0,
                Math.min(end, h.time + 3600) - Math.max(start, h.time),
              ),
          0,
        ) / voteSeconds
      : null,
    peakRain: range(selected.map((h) => h.rainMax))[1],
    rainAmount,
    temperature: median(selected.map((h) => h.temperature)),
    peakGust: range(selected.map((h) => h.gust))[1],
    minFamilies: selected.length
      ? Math.min(...selected.map((h) => h.count))
      : 0,
    partialRainCoverage: validRain.length !== selected.length,
  };
}
