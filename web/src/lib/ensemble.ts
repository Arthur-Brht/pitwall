import type { EnsembleForecast } from "./contracts";
import { finite, JsonAPIClient, ProviderError } from "./providers.ts";

export const ENSEMBLE_SPECS = [
  {
    id: "ecmwf-eps",
    name: "ECMWF ensemble",
    model: "ecmwf_ifs025",
    family: "ecmwf",
  },
  { id: "gfs-eps", name: "GFS ensemble", model: "gfs_seamless", family: "gfs" },
  {
    id: "icon-eps",
    name: "ICON ensemble",
    model: "icon_seamless",
    family: "icon",
  },
];
export type EnsembleSpec = (typeof ENSEMBLE_SPECS)[number];

export function normalizeEnsemble(
  data: any,
  spec: EnsembleSpec,
  fetchedAt: string,
  now = Date.now() / 1000,
): EnsembleForecast {
  const hourly = data?.hourly;
  if (!Array.isArray(hourly?.time))
    throw new ProviderError(
      "invalid_response",
      "No ensemble forecast was supplied.",
    );
  const keys = Object.keys(hourly)
    .filter((key) => /^precipitation(?:_member\d+)?$/.test(key))
    .sort();
  if (keys.length < 2)
    throw new ProviderError(
      "invalid_response",
      "Multiple ensemble members are required for a rain estimate.",
    );
  const byEnd = new Map<number, (number | null)[]>();
  hourly.time.forEach((time: unknown, index: number) => {
    const t = finite(time);
    if (t !== null)
      byEnd.set(
        t,
        keys.map((key) => {
          const value = finite(hourly[key]?.[index]);
          return value !== null && value >= 0 ? value : null;
        }),
      );
  });
  const floor = Math.floor(now / 3600) * 3600;
  const hours = [...byEnd.keys()]
    .filter((time) => time >= floor && time < floor + 72 * 3600)
    .sort((a, b) => a - b)
    .map((time) => ({
      time,
      members: byEnd.get(time + 3600) ?? keys.map(() => null),
    }));
  if (!hours.some((hour) => hour.members.some((value) => value !== null)))
    throw new ProviderError(
      "invalid_response",
      "No ensemble rain data are available for this location.",
    );
  return {
    id: spec.id,
    name: spec.name,
    family: spec.family,
    fetchedAt,
    memberCount: keys.length,
    hours,
  };
}

export class EnsembleClient extends JsonAPIClient {
  constructor() {
    super("https://ensemble-api.open-meteo.com/");
  }
  async forecast(lat: number, lon: number, spec: EnsembleSpec) {
    const data = await this.get("/v1/ensemble", {
      latitude: String(lat),
      longitude: String(lon),
      models: spec.model,
      hourly: "precipitation",
      forecast_days: "4",
      timeformat: "unixtime",
      timezone: "GMT",
      precipitation_unit: "mm",
    });
    return normalizeEnsemble(data, spec, new Date().toISOString());
  }
}
