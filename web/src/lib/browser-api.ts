import type {
  Forecast,
  EnsembleResponse,
  GeometryResponse,
  RadarResponse,
  SourceStatus,
  WeatherResponse,
  NearRainResponse,
} from "./contracts";
import {
  coordinates,
  fetchJson,
  MODEL_SPECS,
  MetNorwayClient,
  OpenMeteoClient,
  ProviderError,
  timezone,
} from "./providers.ts";
import {
  locationKey,
  logWeather,
  readCache,
  readHistory,
  writeCache,
} from "./browser-history.ts";
import bundledCircuits from "./circuit-geometries.json" with { type: "json" };
import { EnsembleClient, ENSEMBLE_SPECS } from "./ensemble.ts";
import { DEFAULT_SOURCE_IDS, selectedSources } from "./forecast-catalog.ts";
import { NearRainClient, NEAR_RAIN_SPECS } from "./near-rain.ts";

const inFlight = new Map<string, Promise<unknown>>();
function once<T>(key: string, load: () => Promise<T>): Promise<T> {
  const prior = inFlight.get(key);
  if (prior) return prior as Promise<T>;
  const promise = load().finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}
const response = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
const baseAsset = (path: string) =>
  `${import.meta.env?.BASE_URL ?? "/"}${path.replace(/^\//, "")}`;

async function weatherFor(
  lat: number,
  lon: number,
  zone: string,
  refresh = false,
  sourceIds = DEFAULT_SOURCE_IDS,
): Promise<WeatherResponse> {
  const previousKey = `weather-v2:${locationKey(lat, lon)}:${zone}:${[...sourceIds].sort().join(",")}`;
  const key = previousKey.replace("weather-v2:", "weather-v3:");
  const cached = !refresh && (await readCache<WeatherResponse>(key));
  if (cached)
    return {
      ...cached,
      delivery:
        cached.delivery === "network" || !cached.delivery
          ? "cache"
          : cached.delivery,
    };
  return once(key, async () => {
    // A second check handles callers that completed IndexedDB reads at the same time.
    const prior = !refresh && (await readCache<WeatherResponse>(key));
    if (prior)
      return {
        ...prior,
        delivery:
          prior.delivery === "network" || !prior.delivery
            ? "cache"
            : prior.delivery,
      };
    const fallback =
      (await readCache<WeatherResponse>(key, { allowStale: true })) ??
      (await readCache<WeatherResponse>(previousKey, { allowStale: true })) ??
      (await readCache<WeatherResponse>(
        `weather-v1:${locationKey(lat, lon)}:${zone}`,
        { allowStale: true },
      ));
    const open = new OpenMeteoClient(),
      met = new MetNorwayClient();
    const sources = [
      ...MODEL_SPECS.map((spec) => ({
        id: spec.id,
        name: spec.name,
        load: () => open.forecast(lat, lon, spec),
      })),
      { id: "metno", name: "MET Norway", load: () => met.forecast(lat, lon) },
    ].filter((source) => sourceIds.includes(source.id));
    const [results, ensembles, nearRain] = await Promise.all([
      Promise.allSettled(sources.map((source) => source.load())),
      ensemblesFor(lat, lon, refresh),
      nearRainFor(lat, lon, sourceIds, refresh),
    ]);
    const forecasts: Forecast[] = [],
      statuses: SourceStatus[] = [];
    results.forEach((result, i) => {
      const source = sources[i];
      if (result.status === "fulfilled") {
        forecasts.push(result.value);
        statuses.push({
          id: source.id,
          name: source.name,
          status: "ok",
          fetchedAt: result.value.fetchedAt,
          message: `${result.value.hours.length} forecast hours available directly from the public provider.`,
        });
      } else {
        const message =
          result.reason instanceof ProviderError
            ? result.reason.message
            : "This source is temporarily unavailable from this browser.";
        const previous = fallback?.forecasts.find(
          (f) =>
            f.id === source.id &&
            Date.now() - Date.parse(f.fetchedAt) < 86400000 &&
            f.hours.some((h) => h.time + 3600 > Date.now() / 1000),
        );
        if (previous) forecasts.push(previous);
        statuses.push({
          id: source.id,
          name: source.name,
          status: previous ? "cached" : "error",
          fetchedAt: previous?.fetchedAt,
          message: previous
            ? `${message} Showing the last saved forecast, fetched ${previous.fetchedAt}; it has not been refreshed.`
            : message,
        });
      }
    });
    const weather: WeatherResponse = {
      fetchedAt: forecasts.length
        ? forecasts
            .map((f) => f.fetchedAt)
            .sort()
            .at(-1)!
        : new Date().toISOString(),
      checkedAt: new Date().toISOString(),
      delivery: statuses.some((s) => s.status === "cached")
        ? statuses.some((s) => s.status === "ok")
          ? "partial"
          : "stale"
        : "network",
      location: { lat, lon, timezone: zone },
      forecasts,
      statuses,
      ensembles,
      nearRain,
      notes: [
        "Forecasts come directly from the public providers. Availability and usage limits vary by source.",
        "Forecasts are model estimates at the selected coordinates, not observations of track grip or track-surface temperature.",
        "Times begin each one-hour precipitation interval. Open-Meteo preceding-hour rain totals and peak gusts are shifted to the matching interval; MET Norway next-hour amounts already use that convention.",
        "Model agreement is the share of distinct model families exceeding the selected rain threshold, not a calibrated probability. MET Norway and IFS share ECMWF ancestry and are grouped together.",
        "Automatic forecast fetches are cached for ten minutes. Refresh requests an update while respecting provider cooldowns and MET Norway Expires. Fetch time is not model initialization time.",
        "If a source cannot refresh, its last successful forecast may be retained for up to 24 hours, with its original fetch time and an explicit saved-data warning. Missing hours remain unavailable.",
        "History is actual forecast snapshots stored in this browser's IndexedDB only. It does not sync across devices and can be removed when browser data is cleared.",
        "Open-Meteo public access is for non-commercial evaluation. Review the providers' licensing and plans before commercial use.",
      ],
    };
    await writeCache(
      key,
      weather,
      Date.now() +
        (statuses.some((s) => s.status === "error" || s.status === "cached") ||
        !forecasts.length
          ? 60000
          : 600000),
      Date.now() + 86400000,
    );
    return weather;
  });
}

async function nearRainFor(
  lat: number,
  lon: number,
  sourceIds: string[],
  refresh: boolean,
): Promise<NearRainResponse> {
  const specs = NEAR_RAIN_SPECS.filter(
    (spec) => sourceIds.includes(spec.sourceId) && spec.covers(lat, lon),
  );
  if (!specs.length) return { forecasts: [], statuses: [] };
  const key = `near-rain-v1:${locationKey(lat, lon)}:${specs.map((spec) => spec.id).join(",")}`;
  const saved = !refresh && (await readCache<NearRainResponse>(key));
  if (saved) return saved;
  return once(key, async () => {
    const client = new NearRainClient();
    const results = await Promise.allSettled(
      specs.map((spec) => client.forecast(lat, lon, spec)),
    );
    const result: NearRainResponse = { forecasts: [], statuses: [] };
    results.forEach((value, index) => {
      const spec = specs[index];
      if (value.status === "fulfilled") {
        result.forecasts.push(value.value);
        result.statuses.push({
          id: spec.id,
          name: spec.name,
          status: "ok",
          fetchedAt: value.value.fetchedAt,
          message: "Native 15-minute forecast available.",
        });
      } else
        result.statuses.push({
          id: spec.id,
          name: spec.name,
          status: "error",
          message:
            value.reason instanceof Error
              ? value.reason.message
              : "15-minute data unavailable.",
        });
    });
    await writeCache(
      key,
      result,
      Date.now() + (result.forecasts.length === specs.length ? 600000 : 60000),
    );
    return result;
  });
}

async function ensemblesFor(
  lat: number,
  lon: number,
  refresh: boolean,
): Promise<EnsembleResponse> {
  const key = `ensemble-v1:${locationKey(lat, lon)}`;
  const cached = !refresh && (await readCache<EnsembleResponse>(key));
  if (cached) return cached;
  return once(key, async () => {
    const client = new EnsembleClient();
    const results = await Promise.allSettled(
      ENSEMBLE_SPECS.map((spec) => client.forecast(lat, lon, spec)),
    );
    const value: EnsembleResponse = { forecasts: [], statuses: [] };
    results.forEach((result, index) => {
      const spec = ENSEMBLE_SPECS[index];
      if (result.status === "fulfilled") {
        value.forecasts.push(result.value);
        value.statuses.push({
          id: spec.id,
          name: spec.name,
          status: "ok",
          fetchedAt: result.value.fetchedAt,
          message: `${result.value.memberCount} ensemble members available.`,
        });
      } else
        value.statuses.push({
          id: spec.id,
          name: spec.name,
          status: "error",
          message:
            result.reason instanceof Error
              ? result.reason.message
              : "Ensemble unavailable.",
        });
    });
    await writeCache(
      key,
      value,
      Date.now() +
        (value.forecasts.length === ENSEMBLE_SPECS.length ? 600000 : 60000),
    );
    return value;
  });
}

const namedOutlines: Record<string, string> = {
  portimao: "pt-2008",
  nogaro: "nogaro",
  spa: "be-1925",
  "paul-ricard": "fr-1969",
  nurburgring: "de-1927",
  barcelona: "es-1991",
  silverstone: "gb-1948",
  monza: "it-1922",
  imola: "it-1953",
  "magny-cours": "fr-1960",
  "dijon-prenois": "dijon-prenois",
  jarama: "jarama",
  lemans: "lemans",
  "lemans-bugatti": "lemans-bugatti",
  nordschleife: "nordschleife",
  estoril: "estoril",
  jerez: "jerez",
  alcaniz: "alcaniz",
};
async function geometryFor(params: URLSearchParams): Promise<GeometryResponse> {
  const { lat, lon } = coordinates(params),
    trackId = params.get("trackId")?.trim() ?? "";
  const bundled = trackId
    ? bundledCircuits.find((item) => item.id === namedOutlines[trackId])
    : bundledCircuits
        .map((item) => ({
          item,
          distance: Math.hypot(
            (item.center.lat - lat) * 111320,
            (item.center.lon - lon) * 111320 * Math.cos((lat * Math.PI) / 180),
          ),
        }))
        .filter((x) => x.distance < 2500)
        .sort((a, b) => a.distance - b.distance)[0]?.item;
  if (bundled) {
    const item = bundled as typeof bundled & {
      source?: string;
      licenseUrl?: string;
    };
    const source = item.source ?? "F1 Circuits / Tomislav Bacinger";
    return {
      coordinates: item.coordinates as [number, number][][],
      source,
      attribution: item.attribution,
      fetchedAt: item.downloadedAt,
      ...{
        sourceUrl: item.sourceUrl,
        licenseUrl:
          item.licenseUrl ?? baseAsset("circuits/LICENSE-f1-circuits.txt"),
      },
      message: `${trackId ? "Selected circuit" : "Nearby mapped circuit"}: ${item.name}. Downloaded ${item.downloadedAt.slice(0, 10)}; download date is not a guarantee of current layout. Source: ${source}. Outline is not a surveyed track boundary.`,
    };
  }
  if (trackId)
    return {
      coordinates: [],
      source: "No verified outline",
      attribution: "",
      fetchedAt: new Date().toISOString(),
      message:
        "No verified outline is bundled for this selected circuit layout. Its coordinates are shown; a different nearby circuit has not been substituted.",
    };
  const key = `geometry-v1:${locationKey(lat, lon)}`;
  const cached = await readCache<GeometryResponse>(key);
  if (cached) return cached;
  return once(key, async () => {
    const query = `[out:json][timeout:4];way["highway"="raceway"]["area"!="yes"](around:6000,${lat},${lon});out geom;`;
    try {
      const raw = await fetchJson(
        "https://overpass-api.de/api/interpreter",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ data: query }).toString(),
        },
        6000,
      );
      if (!Array.isArray(raw?.elements))
        throw new ProviderError(
          "invalid_response",
          "No usable circuit geometry was supplied.",
        );
      const lines: [number, number][][] = raw.elements
        .map((way: any) =>
          (way.geometry ?? [])
            .filter(
              (point: any) =>
                Number.isFinite(point.lat) && Number.isFinite(point.lon),
            )
            .map((point: any) => [point.lat, point.lon]),
        )
        .filter((line: unknown[]) => line.length > 1);
      const geometry: GeometryResponse = {
        coordinates: lines,
        source: "OpenStreetMap / Overpass",
        attribution: "© OpenStreetMap contributors · ODbL",
        fetchedAt: new Date().toISOString(),
        message: lines.length
          ? "Mapped raceway centerlines within 6 km of these custom coordinates. Nearby kart tracks and alternate layouts may also appear; this is not a surveyed boundary."
          : "No mapped raceway centerline was found within 6 km. The selected point is shown without an invented outline.",
      };
      await writeCache(key, geometry, Date.now() + 86400000);
      return geometry;
    } catch {
      const absent: GeometryResponse = {
        coordinates: [],
        source: "OpenStreetMap / Overpass unavailable",
        attribution: "© OpenStreetMap contributors",
        fetchedAt: new Date().toISOString(),
        message:
          "Circuit geometry could not be loaded from the public service in this browser. The selected coordinates remain visible without an invented outline.",
      };
      await writeCache(key, absent, Date.now() + 300000);
      return absent;
    }
  });
}

async function radarFor(): Promise<RadarResponse> {
  const key = "rainviewer-v1";
  const cached = await readCache<RadarResponse>(key);
  if (cached) return cached;
  return once(key, async () => {
    const raw = await fetchJson(
      "https://api.rainviewer.com/public/weather-maps.json",
    );
    const host = new URL(raw.host);
    if (
      host.protocol !== "https:" ||
      !(
        host.hostname === "rainviewer.com" ||
        host.hostname.endsWith(".rainviewer.com")
      )
    )
      throw new ProviderError(
        "invalid_response",
        "Unexpected radar tile provider.",
      );
    const frames = (Array.isArray(raw.radar?.past) ? raw.radar.past : [])
      .filter(
        (frame: any) =>
          typeof frame.time === "number" &&
          Number.isFinite(frame.time) &&
          typeof frame.path === "string" &&
          /^\/v2\/radar\/[A-Za-z0-9_-]+$/.test(frame.path),
      )
      .map((frame: any) => ({
        time: frame.time as number,
        path: frame.path as string,
      }))
      .sort((a: { time: number }, b: { time: number }) => a.time - b.time);
    if (!frames.length)
      throw new ProviderError(
        "invalid_response",
        "No recent radar frames are currently available.",
      );
    const radar: RadarResponse = {
      host: host.origin,
      generated: Number(raw.generated) || frames.at(-1)!.time,
      frames,
      coverageUrl: `${host.origin}/v2/coverage/0/256/{z}/{x}/{y}/0/0_0.png`,
      note: "Past RainViewer radar composites only, typically two hours at ten-minute steps. Composite generation time can differ from radar observation time. Native zoom is seven; enlargement does not add corner-level detail. Transparent pixels can mean missing coverage; inspect the coverage mask.",
    };
    await writeCache(key, radar, Date.now() + 120000);
    return radar;
  });
}

async function searchFor(params: URLSearchParams) {
  const q = params.get("q")?.trim() ?? "";
  if (
    q.length < 2 ||
    q.length > 100 ||
    [...q].some((char) => char.charCodeAt(0) < 32)
  )
    throw new RangeError("Enter a place name between 2 and 100 characters.");
  const key = `search-v1:${q.toLocaleLowerCase()}`;
  const prior = await readCache<unknown>(key);
  if (prior) return prior;
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.search = new URLSearchParams({
    name: q,
    count: "8",
    language: "en",
    format: "json",
  }).toString();
  const raw = await fetchJson(url.toString());
  const results = {
    results: (Array.isArray(raw.results) ? raw.results : []).map(
      (place: any) => ({
        id:
          place.id == null
            ? `place-${place.latitude}-${place.longitude}`
            : String(place.id),
        name: place.name,
        country: place.country ?? place.country_code ?? "",
        latitude: place.latitude,
        longitude: place.longitude,
        timezone: place.timezone ?? "",
        admin1: place.admin1 ?? "",
      }),
    ),
  };
  await writeCache(key, results, Date.now() + 3600000);
  return results;
}

async function dispatch(path: string, init?: RequestInit): Promise<Response> {
  if (!path.startsWith("/api/"))
    return response({ error: "Unknown app data request." }, 404);
  if (init?.method && init.method.toUpperCase() !== "GET")
    return response({ error: "Only read requests are supported." }, 405);
  const url = new URL(path, "https://pitwall.invalid");
  try {
    switch (url.pathname) {
      case "/api/weather": {
        const { lat, lon } = coordinates(url.searchParams),
          zone = timezone(url.searchParams.get("timezone"));
        const weather = await weatherFor(
          lat,
          lon,
          zone,
          url.searchParams.get("refresh") === "1",
          selectedSources(url.searchParams.get("sources")),
        );
        const storage = await logWeather(weather);
        return response(
          {
            ...weather,
            storage,
            ...(weather.forecasts.length
              ? {}
              : {
                  error:
                    "No forecast provider could be reached from this browser. Check the connection and source status, then try again later.",
                }),
          },
          weather.forecasts.length ? 200 : 503,
        );
      }
      case "/api/radar":
        return response(await radarFor());
      case "/api/geometry":
        return response(await geometryFor(url.searchParams));
      case "/api/search":
        return response(await searchFor(url.searchParams));
      case "/api/history": {
        const { lat, lon } = coordinates(url.searchParams);
        return response(await readHistory(lat, lon));
      }
      case "/api/health":
        return response({
          status: "ok",
          mode: "browser-direct",
          service: "Pitwall — Race Weather",
          time: new Date().toISOString(),
          note: "App health does not imply upstream weather providers are reachable.",
        });
      default:
        return response({ error: "Unknown app data request." }, 404);
    }
  } catch (error) {
    return response(
      {
        error:
          error instanceof RangeError || error instanceof ProviderError
            ? error.message
            : "This data source is temporarily unavailable from this browser.",
      },
      error instanceof RangeError ? 400 : 502,
    );
  }
}

/** Browser-local dispatch. Upstream calls go directly to the public provider APIs. */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const signal = init?.signal;
  if (signal?.aborted)
    return Promise.reject(
      new DOMException("The request was aborted.", "AbortError"),
    );
  const work = dispatch(path, init);
  if (!signal) return work;
  return new Promise((resolve, reject) => {
    const abort = () =>
      reject(new DOMException("The request was aborted.", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    work
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", abort));
  });
}
