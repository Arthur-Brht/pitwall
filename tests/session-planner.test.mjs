import { test } from "node:test";
import assert from "node:assert/strict";
import { buildConsensus } from "../web/src/lib/consensus.ts";
import {
  getDryWindows,
  intervalCoverage,
  sessionSources,
} from "../web/src/lib/session-planner.ts";

// Synthetic fixtures exercise interval math; these are not weather observations.
const hour = (time, precipitation = 0, gust = 20) => ({
  time,
  precipitation,
  gust,
  temperature: 15,
  wind: 10,
});
const forecast = (id, family, hours) => ({
  id,
  name: id,
  family,
  hours,
  color: "#ffffff",
  fetchedAt: "2026-10-26T20:00:00Z",
});
const dry = (id, family = id) =>
  forecast(id, family, [hour(0), hour(3600), hour(7200)]);

test("session source totals prorate the actual overlap and retain reported extrema", () => {
  const [source] = sessionSources(
    [forecast("a", "a", [hour(0, 2, 60), hour(3600, 4, 30)])],
    1800,
    5400,
  );
  assert.equal(source.rainEstimate, 3);
  assert.equal(source.rainCoverage, 1);
  assert.equal(source.gustCoverage, 1);
  assert.equal(source.peakRain, 4);
  assert.equal(source.peakGust, 60);
  assert.equal(source.wetIntervals, 2);
});

test("missing rain and gusts stay missing and reduce per-field session coverage", () => {
  const [source] = sessionSources(
    [forecast("a", "a", [hour(0, 2, null), hour(3600, null, null)])],
    0,
    7200,
  );
  assert.equal(source.rainEstimate, 2);
  assert.equal(source.rainCoverage, 0.5);
  assert.equal(source.gustCoverage, 0);
  assert.equal(source.peakGust, null);
  assert.equal(sessionSources([dry("a")], NaN, 3600)[0].rainEstimate, null);
});

test("duplicate and overlapping intervals cannot conceal a coverage gap", () => {
  assert.equal(intervalCoverage([{ time: 0 }, { time: 0 }], 0, 7200), 0.5);
  assert.equal(intervalCoverage([{ time: 0 }, { time: 1800 }], 0, 7200), 0.75);
  const [source] = sessionSources(
    [forecast("a", "a", [hour(0, 2), hour(0, 100)])],
    0,
    7200,
  );
  assert.equal(source.rainCoverage, 0.5);
  assert.equal(source.rainEstimate, 2);
});

test("a related wet source cannot disappear inside a model-dry family median", () => {
  const sources = [
    dry("ifs", "ecmwf"),
    forecast("met", "ecmwf", [
      hour(0, 0.15),
      hour(3600, 0.15),
      hour(7200, 0.15),
    ]),
    dry("gfs"),
    dry("icon"),
  ];
  assert.equal(buildConsensus(sources, 0.1)[0].wetShare, 0);
  assert.deepEqual(getDryWindows(sources, 0, 0.1, 40), []);
});

test("dry windows require every enabled rain source and split at missing hours", () => {
  const missing = forecast("b", "b", [hour(0), hour(7200)]);
  const windows = getDryWindows([dry("a"), missing], 0, 0.1, 40);
  assert.deepEqual(
    windows.map((w) => [w.start, w.end]),
    [
      [0, 3600],
      [7200, 10800],
    ],
  );
});

test("dry windows clip elapsed time, round up to a quarter hour and fit the planned duration", () => {
  const sources = [dry("a"), dry("b")];
  const [window] = getDryWindows(sources, 1801, 0.1, 40, 60);
  assert.equal(window.start, 2700);
  assert.equal(window.end, 10800);
  assert.deepEqual(getDryWindows(sources, 1801, 0.1, 40, 180), []);
});

test("gust evidence needs two distinct families and discloses missing gust sources", () => {
  const missing = forecast("met", "ecmwf", [
    hour(0, 0, null),
    hour(3600, 0, null),
    hour(7200, 0, null),
  ]);
  const [window] = getDryWindows(
    [dry("ifs", "ecmwf"), dry("gfs"), missing],
    0,
    0.1,
    40,
  );
  assert.equal(window.sourceCount, 3);
  assert.equal(window.minGustSources, 2);
  assert.equal(window.familyCount, 2);
  assert.deepEqual(
    getDryWindows(
      [
        dry("ifs", "ecmwf"),
        dry("met", "ecmwf"),
        forecast("gfs", "gfs", [hour(0, 0, null)]),
      ],
      0,
      0.1,
      40,
    ),
    [],
  );
});

test("a gust at the review limit or invalid planner parameters cannot qualify", () => {
  assert.deepEqual(
    getDryWindows([dry("a"), forecast("b", "b", [hour(0, 0, 40)])], 0, 0.1, 40),
    [],
  );
  assert.deepEqual(getDryWindows([dry("a"), dry("b")], 0, 0, 40), []);
});
