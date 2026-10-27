import { test } from "node:test";
import assert from "node:assert/strict";
import { apiFetch } from "../web/src/lib/browser-api.ts";
import { locationKey, writeCache } from "../web/src/lib/browser-history.ts";

test("upgrading preserves an old saved forecast as explicitly stale during an outage", async (context) => {
  const fetchedAt = new Date(Date.now() - 3600000).toISOString();
  const weather = {
    location: { lat: 15, lon: 0, timezone: "UTC" },
    fetchedAt,
    forecasts: [
      {
        id: "ecmwf",
        name: "ECMWF IFS",
        family: "ecmwf",
        fetchedAt,
        hours: [
          {
            time: Math.floor(Date.now() / 3600000) * 3600,
            temperature: 15,
            precipitation: 0,
          },
        ],
      },
    ],
    statuses: [],
    notes: [],
  };
  await writeCache(
    `weather-v1:${locationKey(15, 0)}:UTC`,
    weather,
    Date.now() - 1000,
    Date.now() + 86400000,
  );
  context.mock.method(globalThis, "fetch", async () => {
    throw TypeError("simulated offline upgrade");
  });
  const result = await (
    await apiFetch("/api/weather?lat=15&lon=0&timezone=UTC&refresh=1")
  ).json();
  assert.equal(result.delivery, "stale");
  assert.equal(result.forecasts[0].fetchedAt, fetchedAt);
  assert.equal(result.ensembles.forecasts.length, 0);
});

test("source selection requests only chosen forecast products and rejects unknown sources before networking", async (context) => {
  const calls = [];
  context.mock.method(globalThis, "fetch", async (input) => {
    const url = new URL(String(input));
    calls.push(url);
    const first = Math.floor(Date.now() / 3600000) * 3600;
    return Response.json({
      hourly: {
        time: [first, first + 3600],
        temperature_2m: [15, 15],
        precipitation: [0, 0],
      },
    });
  });
  const result = await (
    await apiFetch("/api/weather?lat=16&lon=0&timezone=UTC&sources=ukmo")
  ).json();
  assert.deepEqual(
    result.forecasts.map((item) => item.id),
    ["ukmo"],
  );
  assert.deepEqual(
    calls
      .filter((url) => url.hostname === "api.open-meteo.com")
      .map((url) => url.searchParams.get("models")),
    ["ukmo_seamless"],
  );
  const before = calls.length;
  assert.equal(
    (await apiFetch("/api/weather?lat=16&lon=0&timezone=UTC&sources=foreign"))
      .status,
    400,
  );
  assert.equal(calls.length, before);
});
