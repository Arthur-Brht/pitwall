import { test } from "node:test";
import assert from "node:assert/strict";
import { indexedDB, IDBKeyRange } from "fake-indexeddb";
import {
  logWeather,
  readHistory,
  readCache,
  writeCache,
  MAX_POINTS_PER_LOCATION,
} from "../web/src/lib/browser-history.ts";

globalThis.indexedDB = indexedDB;
globalThis.IDBKeyRange = IDBKeyRange;
const sample = (lat, forecasts = 1) => ({
  location: { lat, lon: 2, timezone: "UTC" },
  forecasts: Array.from({ length: forecasts }, (_, i) => ({
    id: `fixture-${i}`,
    fetchedAt: new Date().toISOString(),
    hours: Array.from({ length: 24 }, (_, j) => ({
      time: Math.floor(Date.now() / 3600000) * 3600 + j * 3600,
      temperature: j === 0 ? null : -2,
      precipitation: 0,
      wind: 0,
    })),
  })),
});

test("IndexedDB keeps actual source/fetch/valid-time identity and deduplicates repeated snapshots", async () => {
  const weather = sample(1);
  assert.equal((await logWeather(weather)).saved, true);
  await logWeather(weather);
  const { points } = await readHistory(1, 2);
  assert.equal(points.length, 24);
  assert.equal(points[0].temperature, null);
  assert.equal(points[0].precipitation, 0);
  assert.equal(points[0].fetchedAt, weather.forecasts[0].fetchedAt);
});

test("history bounds each location and does not return snapshots older than seven days", async () => {
  const weather = sample(3, Math.ceil(MAX_POINTS_PER_LOCATION / 24) + 1);
  await logWeather(weather);
  assert.equal(
    (await readHistory(3, 2)).points.length,
    MAX_POINTS_PER_LOCATION,
  );
  const old = sample(4);
  old.forecasts[0].fetchedAt = new Date(
    Date.now() - 8 * 86400000,
  ).toISOString();
  await logWeather(old);
  assert.deepEqual((await readHistory(4, 2)).points, []);
});
test("older captures compact hourly without losing their real fetch timestamp", async () => {
  const first = sample(5);
  const base = Math.floor((Date.now() - 8 * 3600000) / 3600000) * 3600000;
  first.forecasts[0].fetchedAt = new Date(base + 10 * 60000).toISOString();
  const second = structuredClone(first);
  second.forecasts[0].fetchedAt = new Date(base + 40 * 60000).toISOString();
  await logWeather(first);
  await logWeather(second);
  const { points } = await readHistory(5, 2);
  assert.equal(points.length, 24);
  assert.ok(points.every((p) => p.fetchedAt === second.forecasts[0].fetchedAt));
});

test("expired forecasts require an explicit stale read and survive unrelated cache cleanup until retention ends", async () => {
  const now = Date.now();
  await writeCache(
    "retained-forecast",
    { originalFetch: "unchanged" },
    now - 1000,
    now + 60000,
  );
  await writeCache("unrelated", true, now + 60000);
  assert.equal(await readCache("retained-forecast"), null);
  assert.deepEqual(await readCache("retained-forecast", { allowStale: true }), {
    originalFetch: "unchanged",
  });
  await writeCache(
    "expired-forecast",
    { mustNotShow: true },
    now - 2000,
    now - 1000,
  );
  assert.equal(await readCache("expired-forecast", { allowStale: true }), null);
});
