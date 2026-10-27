import { test } from "node:test";
import assert from "node:assert/strict";
import {
  OBSERVATION_HEADER,
  parseCsv,
  parseObservations,
  verifyForecasts,
} from "../web/src/lib/verification.ts";
const time = Date.parse("2026-10-26T12:00:00Z") / 1000;
const track = { lat: 50.3356, lon: 6.9475 };
const csv = (
  row = "Nürburg,DWD,50.3602,6.8697,2026-10-26T12:00:00Z,10,0.4,12",
) => OBSERVATION_HEADER + "\r\n" + row;
const point = (values = {}) => ({
  provider: "icon",
  forecastTime: time,
  fetchedAt: "2026-10-26T10:00:00Z",
  temperature: 12,
  precipitation: 0,
  wind: 9,
  ...values,
});
test("observation CSV preserves missing values, zero and measured station identity", () => {
  const [value] = parseObservations(
    csv("Station,Station operator,50.3,6.9,2026-10-26T12:00:00Z,,0,0"),
    time + 3600,
  );
  assert.equal(value.temperature, null);
  assert.equal(value.precipitation, 0);
  assert.equal(value.wind, 0);
  assert.deepEqual(parseCsv('a,b\r\n"A, B","escaped ""quote"""'), [
    ["a", "b"],
    ["A, B", 'escaped "quote"'],
  ]);
});
test("invalid, future, duplicate-conflicting and mixed-station observations are rejected", () => {
  assert.throws(() => parseObservations(csv(), time - 1), /future/);
  assert.throws(
    () => parseObservations(csv().replace("12:00:00", "12:30:00"), time + 3600),
    /UTC hour/,
  );
  assert.throws(
    () => parseObservations(csv().replace(",0.4,", ",-999,"), time + 3600),
    /invalid/,
  );
  assert.throws(
    () =>
      parseObservations(
        csv() + "\nOther,DWD,50.3,6.9,2026-10-26T13:00:00Z,10,0,12",
        time + 7200,
      ),
    /one station/,
  );
  assert.throws(
    () =>
      parseObservations(
        csv() + "\nNürburg,DWD,50.3602,6.8697,2026-10-26T12:00:00Z,20,0.4,12",
        time + 3600,
      ),
    /Conflicting/,
  );
  assert.throws(() => parseCsv('a,"unfinished'), /unclosed/);
});
test("verification excludes retrospective fetches and deduplicates each valid hour per lead band", () => {
  const observations = parseObservations(csv(), time + 3600);
  const result = verifyForecasts(
    [
      point(),
      point({ temperature: 11, fetchedAt: "2026-10-26T11:00:00Z" }),
      point({ temperature: 50, fetchedAt: "2026-10-26T12:01:00Z" }),
    ],
    observations,
    track,
  );
  const temperature = result.scores.find((s) => s.metric === "temperature");
  assert.equal(result.matchedHours, 1);
  assert.equal(temperature.count, 1);
  assert.equal(temperature.mae, 1);
  assert.equal(temperature.bias, 1);
  assert.equal(temperature.rmse, 1);
  assert.deepEqual(
    result.scores.find((s) => s.metric === "precipitation").wet,
    { hits: 0, misses: 1, falseAlarms: 0, correctDry: 0 },
  );
});
test("unmatched times, distant stations and missing evidence cannot produce reassuring scores", () => {
  const observations = parseObservations(csv(), time + 3600);
  assert.throws(
    () => verifyForecasts([point()], observations, { lat: 37.2, lon: -8.6 }),
    /25 km/,
  );
  assert.equal(
    verifyForecasts([point({ forecastTime: time + 3600 })], observations, track)
      .scores.length,
    0,
  );
  assert.equal(
    verifyForecasts(
      [point({ temperature: null, precipitation: null, wind: null })],
      observations,
      track,
    ).scores.length,
    0,
  );
});
