import { test as base, expect } from "@playwright/test";

// Synthetic provider responses are confined to this test fixture. The shipped
// application has no demo mode, seeded weather, or test-only API endpoints.
export const TEST_TIME = new Date("2026-10-26T09:20:00Z");
const start = Math.floor(TEST_TIME.getTime() / 3600000) * 3600;
const times = Array.from({ length: 97 }, (_, i) => start + i * 3600);
const values = (value: number) => times.map(() => value);
const tile =
  '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"></svg>';

export const test = base.extend<{
  providers: {
    failed: boolean;
    liveMap: boolean;
    rain: "normal" | "missing" | "partial";
  };
}>({
  providers: async ({ context }, provide) => {
    const state: {
      failed: boolean;
      liveMap: boolean;
      rain: "normal" | "missing" | "partial";
    } = { failed: false, liveMap: false, rain: "normal" };
    const precipitation = (i: number, wet: number) =>
      state.rain === "missing" || (state.rain === "partial" && i >= 8)
        ? null
        : state.rain === "partial"
          ? 0
          : i >= 5 && i <= 8
            ? wet
            : 0;
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.hostname === "localhost" || url.hostname === "127.0.0.1")
        return route.continue();
      const json = (data: unknown) => route.fulfill({ json: data });
      if (state.liveMap && url.hostname === "tile.openstreetmap.org")
        return route.continue();
      if (url.hostname === "api.open-meteo.com") {
        if (state.failed)
          return route.fulfill({
            status: 503,
            json: { error: "Synthetic test provider outage" },
          });
        return json({
          hourly: {
            time: times,
            temperature_2m: values(18),
            relative_humidity_2m: values(65),
            dew_point_2m: values(11),
            precipitation: times.map((_, i) => precipitation(i, 0.7)),
            cloud_cover: values(35),
            wind_speed_10m: values(12),
            wind_gusts_10m: values(23),
            wind_direction_10m: values(230),
            pressure_msl: values(1015),
            weather_code: values(2),
            visibility: values(15000),
          },
        });
      }
      if (url.hostname === "api.met.no") {
        if (state.failed)
          return route.fulfill({
            status: 503,
            json: { error: "Synthetic test provider outage" },
          });
        return json({
          properties: {
            timeseries: times.map((time, i) => ({
              time: new Date(time * 1000).toISOString(),
              data: {
                instant: {
                  details: {
                    air_temperature: 17,
                    relative_humidity: 70,
                    wind_speed: 3,
                    wind_from_direction: 220,
                    cloud_area_fraction: 40,
                    air_pressure_at_sea_level: 1014,
                  },
                },
                next_1_hours: {
                  details: { precipitation_amount: precipitation(i, 0.6) },
                },
              },
            })),
          },
        });
      }
      if (url.hostname === "geocoding-api.open-meteo.com")
        return json({
          results: [
            {
              id: 123,
              name: "Test town",
              country: "Portugal",
              latitude: 37.2,
              longitude: -8.6,
              timezone: "Europe/Lisbon",
            },
          ],
        });
      if (url.hostname === "api.rainviewer.com")
        return json({
          host: "https://tilecache.rainviewer.com",
          generated: start + 900,
          radar: {
            past: [0, 600, 1200].map((offset) => ({
              time: start - 1200 + offset,
              path: `/v2/radar/test-${offset}`,
            })),
          },
        });
      if (
        url.hostname.endsWith("rainviewer.com") ||
        url.hostname === "tile.openstreetmap.org"
      )
        return route.fulfill({ body: tile, contentType: "image/svg+xml" });
      if (url.hostname.includes("overpass")) return json({ elements: [] });
      // Tests never depend on a public weather/map service or silently contact a new one.
      throw new Error(`Unmocked external request: ${url.hostname}`);
    });
    await provide(state);
  },
  page: async ({ page, providers: _providers }, provide) => {
    await page.clock.install({ time: TEST_TIME });
    await provide(page);
  },
});
export { expect };
