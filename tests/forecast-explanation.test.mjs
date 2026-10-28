import { test } from "node:test";
import assert from "node:assert/strict";
import {
  forecastExplanation,
  intervalText,
} from "../web/src/lib/forecast-explanation.ts";
import { forecastRows } from "../web/src/lib/run-weather.ts";
const start = Date.parse("2026-10-26T09:00:00Z") / 1000;
const focus = (from, to) => ({
  start: start + from,
  end: start + to,
  displayStart: start + from - 900,
  displayEnd: start + to + 900,
  kind: "session",
});
const row = (values) =>
  forecastRows(
    [
      {
        id: "test",
        name: "Test",
        family: "test",
        fetchedAt: "2026-10-26T09:00:00Z",
        hours: values.map((precipitation, i) => ({
          time: start + i * 3600,
          precipitation,
        })),
      },
    ],
    [],
  )[0];
const describe = (values, window = focus(0, 7200)) =>
  forecastExplanation(row(values), window, 0.1, "UTC");
test("per-source text keeps original hourly intervals for a short run", () => {
  const value = describe([1, 0], focus(900, 1800));
  assert.equal(value.text, "Rain 09:00–10:00.");
  assert.match(
    value.detail,
    /Next dry interval 10:00–11:00 \(after your run\)/,
  );
});
test("separate showers and missing intervals never become one continuous wet period", () => {
  for (const values of [
    [1, 0, 2, 0],
    [1, null, 2, 0],
  ]) {
    const value = describe(values, focus(0, 10800));
    assert.equal(value.text, "Rain 09:00–10:00; 11:00–12:00.");
    if (values[1] === null) assert.match(value.detail, /gaps in this run/);
  }
});
test("missing rain never becomes a dry row or an invented stop", () => {
  assert.equal(describe([null, null]).state, "missing");
  assert.match(describe([0, null]).text, /gaps remain/);
  assert.match(
    describe([1, null, 0], focus(0, 3600)).detail,
    /No confirmed stop/,
  );
});
test("trace amounts below the threshold are not described as zero rain", () => {
  assert.equal(describe([0.05, 0.03]).text, "Rain stays below 0.10 mm/h.");
});
test("a buffer-only shower stays outside the run's account", () => {
  const value = describe([1, 0, 1], focus(3600, 7200));
  assert.equal(value.state, "dry");
  assert.equal(value.text, "No rain during your run.");
  assert.match(value.detail, /outside the run/);
});
test("native text keeps quarter-hour periods and real midnight dates", () => {
  const native = forecastRows(
    [],
    [
      {
        id: "native",
        name: "Regional",
        sourceId: "icon",
        fetchedAt: "2026-10-26T09:00:00Z",
        points: [
          { time: start, precipitation: 0.2 },
          { time: start + 900, precipitation: 0 },
        ],
      },
    ],
  )[0];
  assert.equal(
    forecastExplanation(native, focus(0, 900), 0.1, "UTC").text,
    "Rain 09:00–09:15.",
  );
  const midnight = Date.parse("2026-10-26T23:00:00Z") / 1000;
  assert.match(
    intervalText(midnight, midnight + 3600, "UTC", midnight),
    /23:00–00:00 \(\+1 day\)/,
  );
  assert.match(
    intervalText(midnight + 3600, midnight + 7200, "UTC", midnight),
    /Tue 27 Oct/,
  );
});
