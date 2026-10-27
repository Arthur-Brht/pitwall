import type { HistoryPoint, Track } from "./contracts";

export type Observation = {
  station: string;
  source: string;
  lat: number;
  lon: number;
  time: number;
  temperature: number | null;
  precipitation: number | null;
  wind: number | null;
};
export const OBSERVATION_HEADER =
  "station,source,latitude,longitude,observed_at_utc,temperature_C,precipitation_mm_hour,wind_km_h";

/** RFC-style quoted fields, including escaped quotes and newlines. Bounded local files only. */
export function parseCsv(text: string): string[][] {
  if (new TextEncoder().encode(text).length > 1048576)
    throw Error("Choose a CSV smaller than 1 MB.");
  const rows: string[][] = [];
  let row: string[] = [],
    value = "",
    quoted = false,
    closed = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          value += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else value += char;
    } else if (char === '"' && value === "" && !closed) quoted = true;
    else if (char === ",") {
      row.push(value);
      value = "";
      closed = false;
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = "";
      closed = false;
    } else {
      if (closed || char === '"') throw Error("CSV quoting is invalid.");
      value += char;
    }
  }
  if (quoted) throw Error("CSV has an unclosed quoted field.");
  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);
  if (rows.length > 10001)
    throw Error("Choose at most 10,000 observation rows.");
  return rows;
}

export function parseObservations(
  text: string,
  now = Date.now() / 1000,
): Observation[] {
  const [header, ...rows] = parseCsv(text);
  const expected = OBSERVATION_HEADER.split(",");
  if (!header || header.join(",") !== OBSERVATION_HEADER)
    throw Error(`Use these exact CSV columns: ${OBSERVATION_HEADER}`);
  if (!rows.length) throw Error("The CSV has no observations.");
  const observations: Observation[] = [];
  const seen = new Map<number, string>();
  const number = (
    raw: string,
    lower: number,
    upper: number,
    optional = false,
  ) => {
    if (!raw.trim() && optional) return null;
    if (
      !raw.trim() ||
      !Number.isFinite(Number(raw)) ||
      Number(raw) < lower ||
      Number(raw) > upper
    )
      throw Error("An observation contains an invalid value or unit.");
    return Number(raw);
  };
  for (const row of rows) {
    if (row.length !== expected.length)
      throw Error("An observation row has the wrong number of columns.");
    const [
      station,
      source,
      latitude,
      longitude,
      timestamp,
      temperature,
      rain,
      wind,
    ] = row.map((cell) => cell.trim());
    const time = Date.parse(timestamp) / 1000;
    if (!station || station.length > 120 || !source || source.length > 300)
      throw Error("Every observation needs a station name and source.");
    if (
      !/^\d{4}-\d{2}-\d{2}T\d{2}:00:00Z$/.test(timestamp) ||
      !Number.isFinite(time) ||
      new Date(time * 1000).toISOString().replace(".000Z", "Z") !== timestamp ||
      time > now
    )
      throw Error(
        "Observations must use completed UTC hour timestamps, such as 2026-10-26T12:00:00Z, and cannot be in the future.",
      );
    const point: Observation = {
      station,
      source,
      time,
      lat: number(latitude, -90, 90)!,
      lon: number(longitude, -180, 180)!,
      temperature: number(temperature, -100, 65, true),
      precipitation: number(rain, 0, 500, true),
      wind: number(wind, 0, 450, true),
    };
    if (
      point.temperature === null &&
      point.precipitation === null &&
      point.wind === null
    )
      throw Error(
        "Each observation needs at least one measured value; leave unavailable fields empty.",
      );
    const first = observations[0];
    if (point.precipitation !== null && time + 3600 > now)
      throw Error("Hourly rain observations need a completed following hour.");
    if (
      first &&
      (first.station !== station ||
        first.source !== source ||
        first.lat !== point.lat ||
        first.lon !== point.lon)
    )
      throw Error("Import one station, source and coordinate pair per CSV.");
    const identity = JSON.stringify(point);
    if (seen.has(time)) {
      if (seen.get(time) !== identity)
        throw Error("Conflicting observations exist for the same UTC hour.");
      continue;
    }
    seen.set(time, identity);
    observations.push(point);
  }
  return observations.sort((a, b) => a.time - b.time);
}

export function distanceKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
) {
  const rad = (value: number) => (value * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) *
      Math.cos(rad(b.lat)) *
      Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}
export type VerificationScore = {
  provider: string;
  lead: string;
  metric: "temperature" | "precipitation" | "wind";
  count: number;
  mae: number;
  bias: number;
  rmse: number;
  wet: {
    hits: number;
    misses: number;
    falseAlarms: number;
    correctDry: number;
  } | null;
};

/** Exact valid-hour matching; never score a forecast fetched at or after its valid time. */
export function verifyForecasts(
  history: HistoryPoint[],
  observations: Observation[],
  track: Pick<Track, "lat" | "lon">,
  threshold = 0.1,
) {
  if (!Number.isFinite(threshold) || threshold <= 0)
    throw Error("Choose a positive rain threshold.");
  if (!observations.length)
    return {
      distance: null,
      scores: [] as VerificationScore[],
      matchedHours: 0,
    };
  const distance = distanceKm(track, observations[0]);
  if (distance > 25)
    throw Error(
      `This station is ${distance.toFixed(1)} km away. Use a station within 25 km; a distant station cannot validate this circuit.`,
    );
  const observed = new Map(observations.map((o) => [o.time, o]));
  const unique = new Map<string, { point: HistoryPoint; lead: string }>();
  for (const point of history) {
    const leadHours =
      (point.forecastTime * 1000 - Date.parse(point.fetchedAt)) / 3600000;
    if (
      !Number.isFinite(leadHours) ||
      leadHours <= 0 ||
      leadHours > 72 ||
      !observed.has(point.forecastTime)
    )
      continue;
    const lead =
      leadHours <= 6
        ? "0–6 h"
        : leadHours <= 24
          ? "6–24 h"
          : leadHours <= 48
            ? "24–48 h"
            : "48–72 h";
    const key = `${point.provider}|${point.forecastTime}|${lead}`;
    const old = unique.get(key);
    if (!old || Date.parse(point.fetchedAt) > Date.parse(old.point.fetchedAt))
      unique.set(key, { point, lead });
  }
  const groups = new Map<
    string,
    {
      provider: string;
      lead: string;
      metric: VerificationScore["metric"];
      pairs: [number, number][];
    }
  >();
  for (const { point, lead } of unique.values()) {
    const observation = observed.get(point.forecastTime)!;
    for (const metric of ["temperature", "precipitation", "wind"] as const) {
      const forecast = point[metric],
        actual = observation[metric];
      if (
        forecast === null ||
        actual === null ||
        !Number.isFinite(forecast) ||
        !Number.isFinite(actual)
      )
        continue;
      const key = `${point.provider}|${lead}|${metric}`;
      const group = groups.get(key) ?? {
        provider: point.provider,
        lead,
        metric,
        pairs: [],
      };
      group.pairs.push([forecast, actual]);
      groups.set(key, group);
    }
  }
  const scores: VerificationScore[] = [...groups.values()]
    .map(({ pairs, ...group }) => {
      const errors = pairs.map(([forecast, actual]) => forecast - actual);
      return {
        ...group,
        count: pairs.length,
        mae: errors.reduce((s, e) => s + Math.abs(e), 0) / errors.length,
        bias: errors.reduce((s, e) => s + e, 0) / errors.length,
        rmse: Math.sqrt(errors.reduce((s, e) => s + e * e, 0) / errors.length),
        wet:
          group.metric === "precipitation"
            ? {
                hits: pairs.filter(([f, a]) => f >= threshold && a >= threshold)
                  .length,
                misses: pairs.filter(
                  ([f, a]) => f < threshold && a >= threshold,
                ).length,
                falseAlarms: pairs.filter(
                  ([f, a]) => f >= threshold && a < threshold,
                ).length,
                correctDry: pairs.filter(
                  ([f, a]) => f < threshold && a < threshold,
                ).length,
              }
            : null,
      };
    })
    .sort(
      (a, b) =>
        a.provider.localeCompare(b.provider) ||
        a.lead.localeCompare(b.lead) ||
        a.metric.localeCompare(b.metric),
    );
  return {
    distance,
    scores,
    matchedHours: new Set(
      [...unique.values()].map(({ point }) => point.forecastTime),
    ).size,
  };
}
