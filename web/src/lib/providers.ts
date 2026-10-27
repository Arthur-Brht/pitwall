import type { Forecast, Hour } from "./contracts";
import { readCache, writeCache } from "./browser-history.ts";

export class ProviderError extends Error {
  constructor(
    public readonly code:
      | "timeout"
      | "network"
      | "auth"
      | "rate_limit"
      | "upstream"
      | "invalid_response",
    message: string,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export const finite = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
export function coordinates(params: URLSearchParams) {
  const la = params.get("lat"),
    lo = params.get("lon");
  if (!la?.trim() || !lo?.trim())
    throw new RangeError("Both latitude and longitude are required.");
  const lat = Number(la),
    lon = Number(lo);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  )
    throw new RangeError(
      "Latitude must be between −90 and 90; longitude between −180 and 180.",
    );
  return {
    lat: Math.round(lat * 10000) / 10000,
    lon: Math.round(lon * 10000) / 10000,
  };
}
export function timezone(value: string | null): string {
  if (!value || value === "auto") return "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return value;
  } catch {
    throw new RangeError("Use a valid IANA time zone, such as Europe/Lisbon.");
  }
}

export class JsonAPIClient {
  constructor(
    protected readonly baseUrl: string,
    private readonly timeoutMs = 10000,
  ) {}
  protected async get(
    path: string,
    params: Record<string, string> = {},
    onResponse?: (response: Response) => void,
  ): Promise<any> {
    const url = new URL(path, this.baseUrl);
    url.search = new URLSearchParams(params).toString();
    return fetchJson(url.toString(), {}, this.timeoutMs, onResponse);
  }
  toString() {
    return `JsonAPIClient(${new URL(this.baseUrl).hostname})`;
  }
}

const rateLimitedUntil = new Map<string, number>();

export async function fetchJson(
  url: string,
  init: RequestInit = {},
  timeout = 10000,
  onResponse?: (response: Response) => void,
): Promise<any> {
  const blockedUntil = rateLimitedUntil.get(url);
  if (
    (blockedUntil && blockedUntil > Date.now()) ||
    (await readCache<boolean>(`ratelimit:${url}`))
  )
    throw new ProviderError(
      "rate_limit",
      "The provider asked this browser to wait before requesting more data. Try again later.",
    );
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        ...init.headers,
      },
      signal: controller.signal,
      mode: "cors",
      credentials: "omit",
      referrerPolicy: "strict-origin-when-cross-origin",
    });
    if (response.status === 401 || response.status === 403)
      throw new ProviderError(
        "auth",
        "The provider rejected this browser request. Other forecast sources can still load.",
      );
    if (response.status === 429) {
      const retry = response.headers.get("retry-after");
      const seconds = retry ? Number(retry) : NaN;
      const until = Number.isFinite(seconds)
        ? Date.now() + seconds * 1000
        : Date.parse(retry ?? "");
      const retryAt = Number.isFinite(until)
        ? Math.max(Date.now() + 1000, until)
        : Date.now() + 600000;
      rateLimitedUntil.set(url, retryAt);
      await writeCache(`ratelimit:${url}`, true, retryAt);
      throw new ProviderError(
        "rate_limit",
        "The provider rate limit was reached. Try again later.",
      );
    }
    if (!response.ok)
      throw new ProviderError(
        "upstream",
        `The provider returned HTTP ${response.status}.`,
      );
    onResponse?.(response);
    try {
      return await response.json();
    } catch {
      throw new ProviderError(
        "invalid_response",
        "The provider returned unreadable weather data.",
      );
    }
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if (controller.signal.aborted)
      throw new ProviderError(
        "timeout",
        "The provider did not respond before the timeout.",
      );
    throw new ProviderError(
      "network",
      "The provider could not be reached from this browser, possibly because of connectivity or CORS restrictions. Other sources can still load.",
    );
  } finally {
    clearTimeout(timer);
  }
}

type ModelSpec = {
  id: string;
  name: string;
  model: string;
  provider: string;
  family: string;
  color: string;
  resolution: string;
};
export const MODEL_SPECS: ModelSpec[] = [
  {
    id: "ecmwf",
    name: "ECMWF IFS",
    model: "ecmwf_ifs025",
    provider: "ECMWF",
    family: "ecmwf",
    color: "#c8f36b",
    resolution: "0.25° (~25 km)",
  },
  {
    id: "icon",
    name: "DWD ICON",
    model: "icon_seamless",
    provider: "Deutscher Wetterdienst",
    family: "icon",
    color: "#70c5fa",
    resolution: "Seamless: ~2–11 km, region dependent",
  },
  {
    id: "gfs",
    name: "NOAA GFS",
    model: "gfs_seamless",
    provider: "NOAA / NCEP",
    family: "gfs",
    color: "#c1a0ff",
    resolution: "Seamless: ~3–25 km, region dependent",
  },
  {
    id: "meteofrance",
    name: "Météo-France",
    model: "meteofrance_seamless",
    provider: "Météo-France",
    family: "meteofrance",
    color: "#ffb36d",
    resolution: "AROME / ARPEGE: ~1–25 km, region dependent",
  },
];
const HOURLY =
  "temperature_2m,relative_humidity_2m,dew_point_2m,precipitation,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl,weather_code,visibility";

export function normalizeOpenMeteo(
  data: any,
  spec: ModelSpec,
  fetchedAt: string,
  now = Date.now() / 1000,
): Forecast {
  if (!Array.isArray(data?.hourly?.time))
    throw new ProviderError(
      "invalid_response",
      "No hourly forecast was supplied.",
    );
  const h = data.hourly;
  const amountByEnd = new Map<number, number | null>(
    h.time.map((t: number, i: number) => [t, finite(h.precipitation?.[i])]),
  );
  const gustByEnd = new Map<number, number | null>(
    h.time.map((t: number, i: number) => [t, finite(h.wind_gusts_10m?.[i])]),
  );
  const floor = Math.floor(now / 3600) * 3600;
  const hours: Hour[] = h.time
    .map((time: unknown, i: number): Hour | null => {
      const t = finite(time);
      if (t === null || t < floor || t >= floor + 72 * 3600) return null;
      return {
        time: t,
        temperature: finite(h.temperature_2m?.[i]),
        precipitation: amountByEnd.get(t + 3600) ?? null,
        probability: null,
        wind: finite(h.wind_speed_10m?.[i]),
        gust: gustByEnd.get(t + 3600) ?? null,
        direction: finite(h.wind_direction_10m?.[i]),
        humidity: finite(h.relative_humidity_2m?.[i]),
        dewpoint: finite(h.dew_point_2m?.[i]),
        cloud: finite(h.cloud_cover?.[i]),
        pressure: finite(h.pressure_msl?.[i]),
        visibility: finite(h.visibility?.[i]),
        weatherCode: finite(h.weather_code?.[i]),
      };
    })
    .filter((x: Hour | null): x is Hour => x !== null);
  if (!hours.length)
    throw new ProviderError(
      "invalid_response",
      "The provider supplied no forecast within the next 72 hours.",
    );
  return {
    ...spec,
    transport: "Open-Meteo",
    fetchedAt,
    hours,
    kind: "model",
    caveat:
      "Hourly output can be interpolated from coarser model steps. Grid resolution varies by location. Rain amounts and preceding-hour peak gusts are aligned to the hour beginning at the displayed time. Air temperature is not track-surface temperature.",
  };
}

export class OpenMeteoClient extends JsonAPIClient {
  constructor() {
    super("https://api.open-meteo.com/");
  }
  async forecast(lat: number, lon: number, spec: ModelSpec): Promise<Forecast> {
    const data = await this.get("/v1/forecast", {
      latitude: String(lat),
      longitude: String(lon),
      hourly: HOURLY,
      models: spec.model,
      forecast_days: "4",
      timeformat: "unixtime",
      timezone: "GMT",
      wind_speed_unit: "kmh",
      precipitation_unit: "mm",
    });
    return normalizeOpenMeteo(data, spec, new Date().toISOString());
  }
}

function dewpointFromRH(temp: number | null, rh: number | null) {
  if (temp === null || rh === null || rh <= 0 || rh > 100) return null;
  const gamma = Math.log(rh / 100) + (17.625 * temp) / (243.04 + temp);
  return Math.round(((243.04 * gamma) / (17.625 - gamma)) * 10) / 10;
}
export function normalizeMetNorway(
  data: any,
  fetchedAt: string,
  now = Date.now() / 1000,
): Forecast {
  if (!Array.isArray(data?.properties?.timeseries))
    throw new ProviderError(
      "invalid_response",
      "No MET Norway time series was supplied.",
    );
  const floor = Math.floor(now / 3600) * 3600;
  const hours: Hour[] = data.properties.timeseries
    .map((entry: any): Hour | null => {
      const time = Date.parse(entry.time) / 1000;
      if (
        !Number.isFinite(time) ||
        time < floor ||
        time >= floor + 72 * 3600 ||
        time % 3600 !== 0
      )
        return null;
      const v = entry.data?.instant?.details ?? {},
        next = entry.data?.next_1_hours?.details;
      const temp = finite(v.air_temperature),
        rh = finite(v.relative_humidity);
      // Do not divide next_6_hours precipitation by six: that invents hourly timing.
      return {
        time,
        temperature: temp,
        precipitation: finite(next?.precipitation_amount),
        probability: finite(next?.probability_of_precipitation),
        wind:
          finite(v.wind_speed) === null
            ? null
            : Math.round(v.wind_speed * 36) / 10,
        gust:
          finite(v.wind_speed_of_gust) === null
            ? null
            : Math.round(v.wind_speed_of_gust * 36) / 10,
        direction: finite(v.wind_from_direction),
        humidity: rh,
        dewpoint: finite(v.dew_point_temperature) ?? dewpointFromRH(temp, rh),
        cloud: finite(v.cloud_area_fraction),
        pressure: finite(v.air_pressure_at_sea_level),
        visibility: null,
        weatherCode: null,
      };
    })
    .filter((x: Hour | null): x is Hour => x !== null);
  if (!hours.length)
    throw new ProviderError(
      "invalid_response",
      "MET Norway supplied no usable forecast hours.",
    );
  return {
    id: "metno",
    name: "MET Norway",
    provider: "Norwegian Meteorological Institute",
    transport: "MET Norway Locationforecast",
    family: "ecmwf",
    color: "#eb81b4",
    resolution: "Global ECMWF / higher-resolution Nordic blend",
    fetchedAt,
    hours,
    kind: "provider",
    caveat:
      "Global forecast depends on ECMWF; grouped with IFS for consensus to avoid a second independent vote. Nordic forecasts may use regional models. Missing one-hour precipitation stays unavailable, even where a six-hour total exists. Dew point is derived from temperature and humidity when absent.",
  };
}
export class MetNorwayClient extends JsonAPIClient {
  constructor() {
    super("https://api.met.no/");
  }
  async forecast(lat: number, lon: number) {
    const key = `metno:${lat.toFixed(4)},${lon.toFixed(4)}`;
    const prior = await readCache<Forecast>(key);
    if (prior) return prior;
    let expires = Date.now() + 600000;
    const data = await this.get(
      "/weatherapi/locationforecast/2.0/compact",
      { lat: lat.toFixed(4), lon: lon.toFixed(4) },
      (response) => {
        const value = Date.parse(response.headers.get("expires") ?? "");
        if (Number.isFinite(value)) expires = Math.max(Date.now(), value);
      },
    );
    const forecast = normalizeMetNorway(data, new Date().toISOString());
    await writeCache(key, forecast, expires);
    return forecast;
  }
}
