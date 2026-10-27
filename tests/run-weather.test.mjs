import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_FOCUS,
  customBounds,
  resolveFocus,
  validFocus,
} from "../web/src/lib/session-focus.ts";
import {
  forecastChanges,
  forecastRows,
  rowWindow,
  runRain,
  timingCluster,
} from "../web/src/lib/run-weather.ts";
const start = Date.parse("2026-10-26T09:20:00Z") / 1000;
const hour = Math.floor(start / 3600) * 3600;
const track = {
  id: "spa",
  name: "Spa",
  country: "Belgium",
  lat: 50.4,
  lon: 5.9,
  timezone: "Europe/Brussels",
};
const forecast = (id, values) => ({
  id,
  name: id,
  family: id,
  fetchedAt: "2026-10-26T09:20:00Z",
  hours: values.map((precipitation, i) => ({
    time: hour + i * 3600,
    precipitation,
  })),
});
const focus = (start, end, before = 900, after = 900) => ({
  start,
  end,
  displayStart: start - before,
  displayEnd: end + after,
  kind: "session",
});

test("no-session focus starts now, not at the start of the hour", () => {
  const value = resolveFocus(track, [], start);
  assert.equal(value.start, start);
  assert.equal(value.end, start + 10800);
  assert.equal(value.displayStart, start);
});
test("automatic focus chooses a current or next local session within 24 h", () => {
  const session = {
    id: "s1",
    trackId: "spa",
    name: "Practice",
    date: "2026-10-26",
    time: "10:15",
    duration: 30,
  };
  const value = resolveFocus(
    track,
    [{ ...session, id: "other", trackId: "other" }, session],
    start,
  );
  assert.equal(value.sessionId, "s1");
  assert.equal(value.start, hour + 900);
  assert.equal(value.displayStart, hour);
  assert.equal(value.displayEnd, hour + 3600);
  assert.equal(
    resolveFocus(track, [{ ...session, date: "2026-10-28" }], start).kind,
    "now",
  );
});
test("custom runs cross midnight in circuit time and reject ambiguous DST", () => {
  const run = customBounds("2026-10-26", "23:45", "00:15", track.timezone);
  assert.equal(run.end - run.start, 1800);
  assert.equal(
    customBounds("2026-10-25", "02:30", "03:30", track.timezone),
    null,
  );
  assert.equal(customBounds("", "23:30", "00:30", track.timezone), null);
  assert.equal(
    customBounds("2026-10-26", "10:00", "10:00", track.timezone),
    null,
  );
});
test("focus preferences validate supported buffers and preserve default compatibility", () => {
  assert.ok(validFocus(DEFAULT_FOCUS));
  assert.equal(validFocus({ ...DEFAULT_FOCUS, before: -15 }), false);
  assert.equal(
    validFocus({
      ...DEFAULT_FOCUS,
      mode: "custom",
      date: "wrong",
      startTime: "23:00",
      endTime: "00:30",
    }),
    false,
  );
});
test("rain inside a buffer does not become rain during the run; boundaries are half-open", () => {
  const rows = forecastRows([forecast("a", [1, 0, 1])], []);
  const result = runRain(rows, focus(hour + 3600, hour + 7200), 0.1);
  assert.equal(result.wet, 0);
  assert.equal(result.reporting, 1);
  assert.equal(result.contextWet.length, 1);
});
test("missing or negative rain cannot be a complete dry vote", () => {
  for (const value of [null, -1]) {
    const row = forecastRows([forecast("a", [0, value, 0])], [])[0];
    const result = rowWindow(row, hour + 1000, hour + 5000, 0.1);
    assert.equal(result.complete, false);
    assert.equal(result.wet, false);
  }
});
test("the largest overlapping timing group wins over an isolated early signal", () => {
  const cluster = timingCluster([
    { start: hour, end: hour + 900, rate: 1 },
    ...[1, 2, 3].map(() => ({
      start: hour + 7200,
      end: hour + 10800,
      rate: 1,
    })),
  ]);
  assert.equal(cluster.count, 3);
  assert.equal(cluster.start, hour + 7200);
});
test("native timing survives hourly outages, converts rates and does not manufacture clearing", () => {
  const rows = forecastRows(
    [],
    [
      {
        id: "native",
        name: "Regional",
        sourceId: "icon",
        fetchedAt: "2026-10-26T09:20:00Z",
        points: [
          { time: hour + 900, precipitation: 0.2 },
          { time: hour + 1800, precipitation: null },
          { time: hour + 2700, precipitation: 0 },
        ],
      },
    ],
  );
  const result = runRain(rows, focus(hour + 1000, hour + 2800, 0, 0), 0.1);
  assert.equal(result.regionalWet.length, 1);
  assert.equal(result.maxPeak, 0.8);
  assert.equal(result.regionalWet[0].complete, false);
  assert.equal(result.regionalWet[0].clearing, null);
});
test("later rain gaps do not hide a later return of rain as a clearing", () => {
  const row = forecastRows([forecast("a", [1, 0, 2])], [])[0];
  assert.equal(rowWindow(row, hour, hour + 10800, 0.1).clearing, null);
});
test("forecast change compares identical complete valid hours, never missing values or fetch time alone", () => {
  const current = forecast("a", [0, 1, 0]);
  const history = [0, 1, 2].map((i) => ({
    provider: "a",
    forecastTime: hour + i * 3600,
    precipitation: 0,
    fetchedAt: "2026-10-26T09:00:00Z",
  }));
  const value = forecastChanges(
    [current],
    history,
    hour + 3600,
    hour + 7200,
    0.1,
  );
  assert.equal(value.compared, 1);
  assert.equal(value.changes[0].kind, "wet");
  assert.equal(
    forecastChanges(
      [current],
      history.filter((p) => p.forecastTime !== hour + 3600),
      hour + 3600,
      hour + 7200,
      0.1,
    ),
    null,
  );
  assert.equal(
    forecastChanges(
      [current],
      history.map((p) => ({ ...p, precipitation: null })),
      hour + 3600,
      hour + 7200,
      0.1,
    ),
    null,
  );
  assert.equal(
    forecastChanges(
      [current],
      history.map((p) => ({ ...p, fetchedAt: current.fetchedAt })),
      hour + 3600,
      hour + 7200,
      0.1,
    ),
    null,
  );
});
