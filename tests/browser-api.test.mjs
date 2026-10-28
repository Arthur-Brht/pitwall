import { test } from "node:test";
import { DEFAULT_SOURCE_IDS } from "../web/src/lib/forecast-catalog.ts";
import { TRACKS } from "../web/src/lib/tracks.ts";
import assert from "node:assert/strict";
import { apiFetch } from "../web/src/lib/browser-api.ts";
import {
  locationKey,
  snapshotRows,
  writeCache,
} from "../web/src/lib/browser-history.ts";
import { fetchJson, ProviderError } from "../web/src/lib/providers.ts";

const sampleHour = (time, temperature, precipitation) => ({
  time,
  temperature,
  precipitation,
  wind: 0,
});
const sampleWeather = {
  location: { lat: 37.2319, lon: -8.6267, timezone: "Europe/Lisbon" },
  forecasts: [
    {
      id: "example-model",
      fetchedAt: "2026-10-26T20:00:00.000Z",
      hours: [
        sampleHour(1793044800, -2, 0),
        sampleHour(1793048400, null, null),
      ],
    },
  ],
};

test("browser snapshot identity deduplicates repeat fetches without replacing nulls or zeros", () => {
  const rows = snapshotRows(sampleWeather);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].locationKey, locationKey(37.2319, -8.6267));
  assert.equal(rows[0].temperature, -2);
  assert.equal(rows[0].precipitation, 0);
  assert.equal(rows[0].wind, 0);
  assert.equal(rows[1].temperature, null);
  assert.equal(rows[1].precipitation, null);
  assert.deepEqual(rows, snapshotRows(sampleWeather));
  assert.notEqual(rows[0].id, rows[1].id);
});

test("invalid coordinates are rejected before any upstream request", async (context) => {
  let calls = 0;
  context.mock.method(globalThis, "fetch", async () => {
    calls++;
    throw Error("must not fetch");
  });
  const result = await apiFetch(
    "/api/weather?lat=91&lon=0&timezone=Europe/Lisbon",
  );
  assert.equal(result.status, 400);
  assert.match((await result.json()).error, /Latitude/);
  assert.equal(calls, 0);
});

test("a layout without a verified outline never substitutes the nearby GP circuit", async () => {
  const absent = await apiFetch(
    "/api/geometry?lat=50.3356&lon=6.9475&trackId=nurburgring-unverified-layout",
  );
  assert.equal(absent.status, 200);
  const geometry = await absent.json();
  assert.deepEqual(geometry.coordinates, []);
  assert.match(
    geometry.message,
    /different nearby circuit has not been substituted/,
  );
  const known = await apiFetch(
    "/api/geometry?lat=50.3356&lon=6.9475&trackId=nurburgring",
  );
  const knownGeometry = await known.json();
  assert.ok(knownGeometry.coordinates.length > 0);
  const [latitude, longitude] = knownGeometry.coordinates[0][0];
  assert.ok(latitude > 49 && latitude < 51);
  assert.ok(longitude > 6 && longitude < 8);
});

test("every catalogue circuit has a local outline at its own location without an upstream request", async (context) => {
  context.mock.method(globalThis, "fetch", async () => {
    throw Error(
      "Catalogue outlines must work without a public geometry service",
    );
  });
  for (const track of TRACKS) {
    const result = await apiFetch(
      `/api/geometry?lat=${track.lat}&lon=${track.lon}&trackId=${track.id}`,
    );
    assert.equal(result.status, 200, track.id);
    const geometry = await result.json();
    assert.ok(
      geometry.coordinates.length > 0,
      `${track.name} needs an outline`,
    );
    const points = geometry.coordinates.flat();
    assert.ok(points.length > 20, `${track.name} needs a detailed outline`);
    assert.ok(
      points.every(
        ([lat, lon]) =>
          Number.isFinite(lat) &&
          Number.isFinite(lon) &&
          Math.abs(lat - track.lat) < 0.1 &&
          Math.abs(lon - track.lon) < 0.15,
      ),
      `${track.name} must not borrow a different circuit or swap coordinate order`,
    );
    assert.ok(geometry.sourceUrl.startsWith("https://"), track.id);
    assert.ok(geometry.attribution, track.id);
  }
});

test("Le Mans layouts and Nürburgring layouts retain distinct lap extents", async () => {
  const extent = async (id) => {
    const track = TRACKS.find((item) => item.id === id);
    const geometry = await (
      await apiFetch(
        `/api/geometry?lat=${track.lat}&lon=${track.lon}&trackId=${id}`,
      )
    ).json();
    const latitudes = geometry.coordinates.flat().map(([lat]) => lat);
    return Math.max(...latitudes) - Math.min(...latitudes);
  };
  assert.ok((await extent("lemans")) > 3 * (await extent("lemans-bugatti")));
  assert.ok((await extent("nordschleife")) > 3 * (await extent("nurburgring")));
});

test("an already aborted local request rejects with the browser abort contract", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    apiFetch("/api/health", { signal: controller.signal }),
    (error) => error.name === "AbortError",
  );
});

test("provider Retry-After stops immediate repeated requests to a rate-limited URL", async (context) => {
  const url = "https://example.invalid/pitwall-rate-limit-test";
  let calls = 0;
  context.mock.method(globalThis, "fetch", async () => {
    calls++;
    return new Response("{}", {
      status: 429,
      headers: { "Retry-After": "60" },
    });
  });
  await assert.rejects(
    fetchJson(url),
    (error) => error instanceof ProviderError && error.code === "rate_limit",
  );
  await assert.rejects(
    fetchJson(url),
    (error) => error instanceof ProviderError && error.code === "rate_limit",
  );
  assert.equal(calls, 1);
});

const savedWeather = (lat, age = 20 * 60000) => {
  const fetchedAt = new Date(Date.now() - age).toISOString();
  return {
    fetchedAt,
    delivery: "network",
    location: { lat, lon: 0, timezone: "UTC" },
    statuses: [],
    notes: [],
    forecasts: [
      {
        id: "ecmwf",
        name: "ECMWF IFS",
        family: "ecmwf",
        fetchedAt,
        hours: [sampleHour(Math.floor(Date.now() / 3600000) * 3600, 15, 0)],
      },
    ],
  };
};

test("failed refresh retains a saved forecast with its original timestamp and explicit stale status", async (context) => {
  const weather = savedWeather(11);
  await writeCache(
    `weather-v3:${locationKey(11, 0)}:UTC:${[...DEFAULT_SOURCE_IDS].sort().join(",")}`,
    weather,
    Date.now() - 1000,
    Date.now() + 86400000,
  );
  context.mock.method(globalThis, "fetch", async () => {
    throw TypeError("simulated offline provider");
  });
  const response = await apiFetch(
    "/api/weather?lat=11&lon=0&timezone=UTC&refresh=1",
  );
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.delivery, "stale");
  assert.equal(result.forecasts[0].fetchedAt, weather.fetchedAt);
  assert.equal(result.fetchedAt, weather.fetchedAt);
  assert.equal(result.statuses.find((s) => s.id === "ecmwf").status, "cached");
  assert.match(
    result.statuses.find((s) => s.id === "ecmwf").message,
    /has not been refreshed/,
  );
  assert.equal(result.forecasts[0].hours[0].precipitation, 0);
});

test("manual refresh bypasses the application cache without turning failed requests into fresh data", async (context) => {
  const weather = savedWeather(12, 60000);
  await writeCache(
    `weather-v4:${locationKey(12, 0)}:UTC:${[...DEFAULT_SOURCE_IDS].sort().join(",")}`,
    weather,
    Date.now() + 600000,
    Date.now() + 86400000,
  );
  let calls = 0;
  context.mock.method(globalThis, "fetch", async () => {
    calls++;
    throw TypeError("simulated outage");
  });
  const cached = await (
    await apiFetch("/api/weather?lat=12&lon=0&timezone=UTC")
  ).json();
  assert.equal(cached.delivery, "cache");
  assert.equal(calls, 0);
  const refreshed = await (
    await apiFetch("/api/weather?lat=12&lon=0&timezone=UTC&refresh=1")
  ).json();
  assert.equal(calls, DEFAULT_SOURCE_IDS.length + 3);
  assert.equal(refreshed.delivery, "stale");
  assert.equal(refreshed.fetchedAt, weather.fetchedAt);
});

test("partial source failure preserves a previous source while adding the newly fetched model", async (context) => {
  const weather = savedWeather(13);
  await writeCache(
    `weather-v3:${locationKey(13, 0)}:UTC:${[...DEFAULT_SOURCE_IDS].sort().join(",")}`,
    weather,
    Date.now() - 1000,
    Date.now() + 86400000,
  );
  context.mock.method(globalThis, "fetch", async (input) => {
    const url = new URL(String(input));
    if (url.searchParams.get("models") !== "gfs_seamless")
      throw TypeError("simulated single-source response");
    const first = Math.floor(Date.now() / 3600000) * 3600;
    return Response.json({
      hourly: {
        time: [first, first + 3600],
        temperature_2m: [16, 17],
        precipitation: [0, 0],
      },
    });
  });
  const response = await apiFetch(
    "/api/weather?lat=13&lon=0&timezone=UTC&refresh=1",
  );
  const result = await response.json();
  assert.equal(result.delivery, "partial");
  assert.deepEqual(
    result.forecasts.map((f) => f.id),
    ["ecmwf", "gfs"],
  );
  assert.equal(result.statuses.find((s) => s.id === "gfs").status, "ok");
  assert.equal(result.statuses.find((s) => s.id === "ecmwf").status, "cached");
});

test("a forecast fetched more than 24 hours ago is not reused after an outage", async (context) => {
  const weather = savedWeather(14, 25 * 3600000);
  await writeCache(
    `weather-v3:${locationKey(14, 0)}:UTC:${[...DEFAULT_SOURCE_IDS].sort().join(",")}`,
    weather,
    Date.now() - 1000,
    Date.now() + 86400000,
  );
  context.mock.method(globalThis, "fetch", async () => {
    throw TypeError("simulated outage");
  });
  const response = await apiFetch(
    "/api/weather?lat=14&lon=0&timezone=UTC&refresh=1",
  );
  assert.equal(response.status, 503);
  assert.deepEqual((await response.json()).forecasts, []);
});
