import type { NearRainForecast } from "./contracts";
import { JsonAPIClient, ProviderError, finite } from "./providers.ts";

// Explicit native domains avoid returning interpolated global hourly output as
// apparent quarter-hour timing. Outside these conservative European bounds the
// app keeps its hourly forecasts. The provider can still reject a domain edge.
export const NEAR_RAIN_SPECS = [
  {
    id: "icon-d2-15",
    sourceId: "icon",
    name: "DWD ICON-D2",
    model: "dwd_icon_d2_15min",
    covers: (lat: number, lon: number) =>
      lat >= 43 && lat <= 56 && lon >= -4 && lon <= 20,
  },
  {
    id: "arome-hd-15",
    sourceId: "meteofrance",
    name: "Météo-France AROME HD",
    model: "meteofrance_arome_france_hd_15min",
    covers: (lat: number, lon: number) =>
      lat >= 37.5 && lat <= 55.4 && lon >= -12 && lon <= 16,
  },
];
export type NearRainSpec = (typeof NEAR_RAIN_SPECS)[number];

export function normalizeNearRain(
  data: any,
  spec: NearRainSpec,
  fetchedAt: string,
  now = Date.now() / 1000,
): NearRainForecast {
  const values = data?.minutely_15;
  if (
    !Array.isArray(values?.time) ||
    data?.minutely_15_units?.precipitation !== "mm"
  )
    throw new ProviderError(
      "invalid_response",
      "15-minute rain data is unavailable.",
    );
  const points = values.time
    .flatMap((end: unknown, index: number) => {
      if (
        typeof end !== "number" ||
        !Number.isFinite(end) ||
        end % 900 ||
        end <= now ||
        end > now + 6 * 3600 + 900
      )
        return [];
      const amount = finite(values.precipitation?.[index]);
      return [
        {
          time: end - 900,
          precipitation: amount !== null && amount >= 0 ? amount : null,
        },
      ];
    })
    .sort((a: { time: number }, b: { time: number }) => a.time - b.time);
  if (
    !points.some(
      (point: { precipitation: number | null }) => point.precipitation !== null,
    )
  )
    throw new ProviderError(
      "invalid_response",
      "This regional model has no recent 15-minute rain data here.",
    );
  return {
    id: spec.id,
    sourceId: spec.sourceId,
    name: spec.name,
    fetchedAt,
    stepSeconds: 900,
    points,
  };
}

export class NearRainClient extends JsonAPIClient {
  constructor() {
    super("https://api.open-meteo.com/");
  }
  async forecast(lat: number, lon: number, spec: NearRainSpec) {
    const data = await this.get("/v1/forecast", {
      latitude: String(lat),
      longitude: String(lon),
      models: spec.model,
      minutely_15: "precipitation",
      forecast_minutely_15: "25",
      timeformat: "unixtime",
      timezone: "GMT",
      precipitation_unit: "mm",
    });
    return normalizeNearRain(data, spec, new Date().toISOString());
  }
}

/** Report an interval, never an invented exact minute inside a model step. */
export function rainArrival(
  points: { time: number; precipitation: number | null }[],
  step: number,
  start: number,
  end: number,
  threshold: number,
) {
  const expected = Math.ceil((end - Math.floor(start / step) * step) / step);
  const slots = points.filter(
    (point) => point.time + step > start && point.time < end,
  );
  const wet = slots.find(
    (point) =>
      point.precipitation !== null &&
      (point.precipitation * 3600) / step >= threshold,
  );
  const complete =
    new Set(
      slots
        .filter((point) => point.precipitation !== null)
        .map((point) => point.time),
    ).size === expected;
  return {
    first: wet ? { start: wet.time, end: wet.time + step } : null,
    complete,
  };
}
