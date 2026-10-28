import { test } from "node:test";
import assert from "node:assert/strict";
import {
  windOutlook,
  windHours,
  downwind,
} from "../web/src/lib/wind-outlook.ts";
const start = Date.parse("2026-10-26T09:00:00Z") / 1000;
const forecast = (id, values) => ({
  id,
  hours: values.map(([direction, wind = 12, gust = 23], i) => ({
    time: start + i * 3600,
    direction,
    wind,
    gust,
  })),
});
test("north and east winds move south and west, not back towards their source", () => {
  assert.equal(downwind(0), 180);
  assert.equal(downwind(90), 270);
  assert.equal(downwind(230), 50);
  const wind = windOutlook([forecast("a", [[0]])], start, start + 3600);
  assert.equal(wind.kind, "directional");
  assert.equal(wind.direction, 0);
  assert.equal(wind.towards, 180);
});
test("directions wrap around north without inventing south", () => {
  const wind = windOutlook(
    [forecast("a", [[350]]), forecast("b", [[10]])],
    start,
    start + 3600,
  );
  assert.equal(wind.kind, "directional");
  assert.ok(wind.direction < 1 || wind.direction > 359);
});
test("opposing sources and a large turn within the run suppress a misleading animated average", () => {
  for (const forecasts of [
    [forecast("a", [[0]]), forecast("b", [[180]])],
    [forecast("a", [[0], [180]])],
  ]) {
    const wind = windOutlook(forecasts, start, start + 7200);
    assert.equal(wind.kind, "variable");
    assert.equal(wind.direction, null);
    assert.equal(wind.towards, null);
  }
});
test("calm, missing, negative and invalid directions do not become a north wind", () => {
  assert.equal(
    windOutlook([forecast("a", [[270, 0]])], start, start + 3600).kind,
    "calm",
  );
  for (const value of [null, NaN, -1, 361]) {
    const wind = windOutlook([forecast("a", [[value]])], start, start + 3600);
    assert.equal(wind.kind, "unavailable");
    assert.equal(wind.direction, null);
  }
  assert.equal(
    windOutlook([forecast("a", [[10, -3]])], start, start + 3600).speed,
    null,
  );
});
test("only actual run hours supply wind and hourly changes stay distinct", () => {
  const forecasts = [
    forecast("a", [
      [90, 12],
      [270, 30],
      [0, 50],
    ]),
  ];
  const wind = windOutlook(forecasts, start + 900, start + 3600);
  assert.deepEqual(wind.speed, { min: 12, max: 12 });
  assert.equal(wind.direction, 90);
  const hours = windHours(forecasts, start + 900, start + 7200);
  assert.deepEqual(
    hours.map((h) => h.direction),
    [90, 270],
  );
  assert.deepEqual(
    hours.map((h) => h.time),
    [start, start + 3600],
  );
});
