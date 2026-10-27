import { test } from "node:test";
import assert from "node:assert/strict";
import { rainOutlook } from "../web/src/lib/rain-outlook.ts";
import { normalizeEnsemble, ENSEMBLE_SPECS } from "../web/src/lib/ensemble.ts";
import { radarWindow } from "../web/src/lib/radar-window.ts";
import {
  parsePreferences,
  createBackup,
  parseBackup,
} from "../web/src/lib/device-state.ts";
import { TRACKS } from "../web/src/lib/tracks.ts";
const start = 1800000000;
test("a wet ensemble outlier cannot disappear behind two dry ensemble systems", () => {
  const make = (id, rain) => ({
    id,
    name: id,
    family: id,
    memberCount: 2,
    fetchedAt: "2027-01-15T08:00:00Z",
    hours: [{ time: start, members: [rain, rain] }],
  });
  const dryModels = ["a", "b", "c"].map((id) => ({
    id,
    family: id,
    hours: [{ time: start, precipitation: 0 }],
  }));
  const result = rainOutlook(
    dryModels,
    [make("a", 0), make("b", 0), make("c", 1)],
    start,
    start + 3600,
  );
  assert.equal(result.probability, 0);
  assert.equal(result.probabilityMax, 100);
  assert.equal(result.risk, "possible");
});
const forecast = (id, family, amounts) => ({
  id,
  family,
  hours: amounts.map((precipitation, index) => ({
    time: start + index * 3600,
    precipitation,
  })),
});
const ensemble = (id, family, rows) => ({
  id,
  name: id,
  family,
  memberCount: rows[0].length,
  fetchedAt: "2027-01-15T08:00:00Z",
  hours: rows.map((members, index) => ({
    time: start + index * 3600,
    members,
  })),
});

test("window probability checks each member across time instead of adding hourly chances", () => {
  const sample = ensemble("gfs", "gfs", [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
  ]);
  const result = rainOutlook([], [sample], start, start + 7200);
  assert.equal(result.probability, 50);
  assert.equal(result.estimates[0].wetMembers, 2);
  assert.equal(result.estimates[0].validMembers, 4);
  assert.equal(rainOutlook([], [sample], start, start + 3600).probability, 25);
});
test("families receive equal weight regardless of ensemble size and duplicate transports", () => {
  const result = rainOutlook(
    [],
    [
      ensemble("a", "ecmwf", [[1, 1, 0, 0]]),
      ensemble("duplicate", "ecmwf", [[1, 1, 0, 0]]),
      ensemble("b", "gfs", [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0]]),
    ],
    start,
    start + 3600,
  );
  assert.equal(result.ensembleSystems, 2);
  assert.equal(result.probability, 25);
  assert.equal(result.probabilityMin, 0);
  assert.equal(result.probabilityMax, 50);
});
test("incomplete members and missing hours cannot be presented as dry votes", () => {
  const result = rainOutlook(
    [forecast("one", "ecmwf", [0, null])],
    [
      ensemble("eps", "ecmwf", [
        [0, 0, 0, 0],
        [0, null, null, null],
      ]),
    ],
    start,
    start + 7200,
  );
  assert.equal(result.probability, null);
  assert.equal(result.drySources, 0);
  assert.equal(result.reportingFamilies, 0);
  assert.equal(result.risk, "limited");
  assert.equal(result.incompleteSources, 1);
});
test("all-dry complete model runs retain a rain possibility when ensembles disagree", () => {
  const sources = [
    forecast("a", "a", [0]),
    forecast("b", "b", [0]),
    forecast("c", "c", [0]),
  ];
  const result = rainOutlook(
    sources,
    [ensemble("eps", "ecmwf", [[1, 0, 0, 0]])],
    start,
    start + 3600,
  );
  assert.equal(result.risk, "possible");
  assert.equal(result.wetSources, 0);
  assert.equal(result.probability, 25);
});
test("related forecasts count separately as sources but only once as a family", () => {
  const result = rainOutlook(
    [
      forecast("ifs", "ecmwf", [0]),
      forecast("met", "ecmwf", [1]),
      forecast("icon", "icon", [0]),
      forecast("it", "icon", [0]),
      forecast("gfs", "gfs", [0]),
    ],
    [],
    start,
    start + 3600,
  );
  assert.equal(result.wetSources, 1);
  assert.equal(result.drySources, 4);
  assert.equal(result.wetFamilies, 1);
  assert.equal(result.reportingFamilies, 3);
  assert.equal(result.risk, "possible");
  assert.equal(result.firstRain, start);
});
test("changing the rain threshold updates both estimates and source agreement", () => {
  const sample = ensemble("eps", "gfs", [[0.2, 0.3, 0.6, 0]]);
  const result = rainOutlook(
    [forecast("gfs", "gfs", [0.2])],
    [sample],
    start,
    start + 3600,
    0.5,
  );
  assert.equal(result.probability, 25);
  assert.equal(result.wetSources, 0);
  assert.throws(() => rainOutlook([], [], start, start + 3600, 0), RangeError);
  assert.throws(
    () => rainOutlook([], [], start + 60, start + 3600),
    RangeError,
  );
});
test("ensemble rain is aligned from preceding-hour totals and malformed members stay missing", () => {
  const normalized = normalizeEnsemble(
    {
      hourly: {
        time: [start, start + 3600, start + 7200],
        precipitation: [99, 0, 2],
        precipitation_member01: [99, -1, 1],
      },
    },
    ENSEMBLE_SPECS[0],
    "2027-01-01",
    start,
  );
  assert.deepEqual(normalized.hours[0].members, [0, null]);
  assert.deepEqual(normalized.hours[1].members, [2, 1]);
  assert.deepEqual(normalized.hours[2].members, [null, null]);
  assert.throws(() =>
    normalizeEnsemble(
      { hourly: { time: [start], precipitation: [0] } },
      ENSEMBLE_SPECS[0],
      "2027-01-01",
      start,
    ),
  );
});
test("radar playback bounds clamp to available history after refresh", () => {
  const frames = [0, 600, 1200, 1800].map((time) => ({ time }));
  assert.deepEqual(radarWindow(frames, null, null), { start: 0, end: 3 });
  assert.deepEqual(radarWindow(frames, 600, 1200), { start: 1, end: 2 });
  assert.deepEqual(radarWindow(frames, 0, 600), { start: 0, end: 1 });
  assert.deepEqual(radarWindow(frames.slice(2), 0, 600), { start: 0, end: 0 });
  assert.deepEqual(radarWindow([], null, null), { start: 0, end: 0 });
});
test("per-location source choices and manual track readings survive device backups", () => {
  const preferences = {
    favorites: [TRACKS[0]],
    track: TRACKS[0],
    disabled: ["ukmo"],
    threshold: 0.1,
    gustLimit: 40,
    sourceSelections: { "37.2319,-8.6267": ["ecmwf", "ukmo", "knmi"] },
    trackReadings: {
      "37.2319,-8.6267": {
        temperature: 32.5,
        recordedAt: "2026-10-27T16:00:00Z",
      },
    },
  };
  assert.deepEqual(
    parseBackup(JSON.stringify(createBackup(preferences, []))).preferences,
    preferences,
  );
  assert.throws(() =>
    parsePreferences({
      ...preferences,
      sourceSelections: { x: ["foreign-api"] },
    }),
  );
  assert.throws(() =>
    parsePreferences({
      ...preferences,
      trackReadings: { x: { temperature: 1000, recordedAt: "bad" } },
    }),
  );
});
