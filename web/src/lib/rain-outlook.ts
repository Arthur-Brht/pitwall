import type { EnsembleForecast, Forecast } from "./contracts";
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b),
    middle = Math.floor(sorted.length / 2);
  return sorted.length
    ? sorted.length % 2
      ? sorted[middle]
      : (sorted[middle - 1] + sorted[middle]) / 2
    : null;
};

/** Hour-aligned windows. An incomplete member cannot silently become a dry vote. */
export function rainOutlook(
  forecasts: Forecast[],
  ensembles: EnsembleForecast[],
  start: number,
  end: number,
  threshold = 0.1,
) {
  if (
    !finite(start) ||
    !finite(end) ||
    end <= start ||
    start % 3600 ||
    end % 3600 ||
    !finite(threshold) ||
    threshold <= 0
  )
    throw new RangeError(
      "Choose a valid hourly rain window and positive threshold.",
    );
  const times: number[] = [];
  for (let time = start; time < end; time += 3600) times.push(time);
  const rows = forecasts.map((forecast) => {
    const byTime = new Map(forecast.hours.map((hour) => [hour.time, hour]));
    const hours = times.map((time) => byTime.get(time));
    const covered = hours.filter((hour) => finite(hour?.precipitation));
    const wet = hours.filter(
      (hour) =>
        finite(hour?.precipitation) && hour!.precipitation! >= threshold,
    );
    return {
      forecast,
      coveredHours: covered.length,
      expectedHours: times.length,
      complete: covered.length === times.length,
      wet: wet.length > 0,
      firstRain: wet[0]?.time ?? null,
      maxRain: covered.length
        ? Math.max(...covered.map((hour) => hour!.precipitation!))
        : null,
      totalRain:
        covered.length === times.length
          ? covered.reduce((sum, hour) => sum + hour!.precipitation!, 0)
          : null,
    };
  });
  const families = new Map<string, typeof rows>();
  for (const row of rows) {
    const family = row.forecast.family || row.forecast.id;
    families.set(family, [...(families.get(family) ?? []), row]);
  }
  const familyVotes = [...families.values()].map((group) =>
    group.some((row) => row.wet)
      ? "wet"
      : group.some((row) => row.complete)
        ? "dry"
        : "unknown",
  );
  const estimates = ensembles.map((forecast) => {
    const byTime = new Map(
      forecast.hours.map((hour) => [hour.time, hour.members]),
    );
    let valid = 0,
      wet = 0;
    for (let member = 0; member < forecast.memberCount; member++) {
      const values = times.map((time) => byTime.get(time)?.[member]);
      if (values.every(finite)) {
        valid++;
        if (values.some((value) => value! >= threshold)) wet++;
      }
    }
    return {
      id: forecast.id,
      name: forecast.name,
      family: forecast.family,
      validMembers: valid,
      totalMembers: forecast.memberCount,
      wetMembers: wet,
      probability:
        valid >= Math.max(2, Math.ceil(forecast.memberCount * 0.8))
          ? (wet / valid) * 100
          : null,
      fetchedAt: forecast.fetchedAt,
    };
  });
  const byFamily = new Map<string, number[]>();
  for (const estimate of estimates)
    if (estimate.probability !== null)
      byFamily.set(estimate.family, [
        ...(byFamily.get(estimate.family) ?? []),
        estimate.probability,
      ]);
  const probabilities = [...byFamily.values()].map((values) => median(values)!);
  const probability = median(probabilities);
  const wetFamilies = familyVotes.filter((vote) => vote === "wet").length;
  const reportingFamilies = familyVotes.filter(
    (vote) => vote !== "unknown",
  ).length;
  const wetSources = rows.filter((row) => row.wet).length;
  const drySources = rows.filter((row) => row.complete && !row.wet).length;
  const incompleteSources = rows.filter((row) => !row.complete).length;
  const risk: "limited" | "elevated" | "possible" | "low" =
    probability === null && reportingFamilies < 3
      ? "limited"
      : (probability ?? 0) >= 60 ||
          (reportingFamilies >= 3 && wetFamilies / reportingFamilies >= 0.5)
        ? "elevated"
        : (probabilities.length ? Math.max(...probabilities) : 0) >= 20 ||
            wetFamilies > 0
          ? "possible"
          : "low";
  return {
    start,
    end,
    rows,
    estimates,
    probability,
    probabilityMin: probabilities.length ? Math.min(...probabilities) : null,
    probabilityMax: probabilities.length ? Math.max(...probabilities) : null,
    ensembleSystems: probabilities.length,
    wetSources,
    drySources,
    incompleteSources,
    wetFamilies,
    reportingFamilies,
    risk,
    firstRain:
      rows
        .map((row) => row.firstRain)
        .filter(finite)
        .sort((a, b) => a - b)[0] ?? null,
    maxRain: rows.some((row) => row.maxRain !== null)
      ? Math.max(...rows.map((row) => row.maxRain ?? 0))
      : null,
  };
}
