import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeNearRain,
  NEAR_RAIN_SPECS,
  rainArrival,
  NATIVE_FORECAST_HOURS,
} from "../web/src/lib/near-rain.ts";
import {
  rainIntensity,
  rainChartMaximum,
} from "../web/src/lib/rain-intensity.ts";
const start = 1800000000;
const raw = (values) => ({
  minutely_15_units: { precipitation: "mm" },
  minutely_15: {
    time: values.map((_, i) => start + i * 900),
    precipitation: values,
  },
});

test("native quarter-hour precipitation is shifted from interval end and never divided out of an hourly total", () => {
  const forecast = normalizeNearRain(
    raw([99, 0, 0.2, null, -1, 0]),
    NEAR_RAIN_SPECS[0],
    "2027-01-01",
    start + 100,
  );
  assert.deepEqual(forecast.points, [
    { time: start, precipitation: 0 },
    { time: start + 900, precipitation: 0.2 },
    { time: start + 1800, precipitation: null },
    { time: start + 2700, precipitation: null },
    { time: start + 3600, precipitation: 0 },
  ]);
  assert.equal(forecast.stepSeconds, 900);
});
test("missing native data, unknown units and invalid times cannot become a dry refined forecast", () => {
  for (const data of [
    raw([null, null]),
    { ...raw([0, 0]), minutely_15_units: { precipitation: "inch" } },
    {
      minutely_15_units: { precipitation: "mm" },
      minutely_15: { time: [NaN, start + 999], precipitation: [1, 1] },
    },
  ])
    assert.throws(() =>
      normalizeNearRain(data, NEAR_RAIN_SPECS[0], "2027-01-01", start),
    );
});

test("available native data beyond six hours is retained up to a day without filling its missing tail", () => {
  const values = Array.from(
    { length: (NATIVE_FORECAST_HOURS + 1) * 4 + 1 },
    (_, i) => (i <= 40 ? 0.2 : null),
  );
  const result = normalizeNearRain(
    raw(values),
    NEAR_RAIN_SPECS[0],
    "2027-01-01",
    start,
  );
  assert.ok(
    result.points.some(
      (p) => p.time >= start + 8 * 3600 && p.precipitation === 0.2,
    ),
  );
  assert.ok(
    result.points.some(
      (p) => p.time >= start + 12 * 3600 && p.precipitation === null,
    ),
  );
  assert.ok(
    result.points.every(
      (p) => p.time < start + NATIVE_FORECAST_HOURS * 3600 + 900,
    ),
  );
  assert.ok(result.points.every((p) => p.time % 900 === 0));
});
test("rain timing uses interval rates, skips completed intervals, and preserves missing coverage", () => {
  const points = [
    { time: start - 900, precipitation: 4 },
    { time: start, precipitation: 0 },
    { time: start + 900, precipitation: 0.1 },
  ];
  assert.deepEqual(rainArrival(points, 900, start + 100, start + 1800, 0.1), {
    first: { start: start + 900, end: start + 1800 },
    complete: true,
  });
  assert.deepEqual(
    rainArrival(points.slice(1, 2), 900, start + 100, start + 1800, 0.1),
    { first: null, complete: false },
  );
  assert.equal(rainArrival(points, 900, start, start + 1800, 0.5).first, null);
});
test("regional bounds do not imply native quarter-hour coverage worldwide", () => {
  assert.equal(NEAR_RAIN_SPECS[0].covers(52.958, 6.525), true);
  assert.equal(NEAR_RAIN_SPECS[1].covers(40.615, -3.585), true);
  assert.equal(NEAR_RAIN_SPECS[1].covers(37.23, -8.63), false);
  for (const spec of NEAR_RAIN_SPECS) assert.equal(spec.covers(35, 139), false);
});
test("intensity guides retain absolute context at both very small and heavy rates", () => {
  assert.equal(rainIntensity(0), "No rain");
  assert.equal(rainIntensity(0.8), "Light");
  assert.equal(rainIntensity(2.5), "Light");
  assert.equal(rainIntensity(2.6), "Moderate");
  assert.equal(rainIntensity(7.6), "Moderate");
  assert.equal(rainIntensity(8), "Heavy");
  assert.equal(rainIntensity(null), "Unknown");
  assert.equal(rainChartMaximum([null, 0.8, 0], false), 10);
  assert.equal(rainChartMaximum([0.8], true), 1);
  assert.ok(rainChartMaximum([32], false) > 32);
});
