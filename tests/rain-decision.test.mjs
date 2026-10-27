import { test } from "node:test";
import assert from "node:assert/strict";
import { enabledNearRain, rainDecision } from "../web/src/lib/rain-decision.ts";
import { rainOutlook } from "../web/src/lib/rain-outlook.ts";
import {
  normalizeMetNorway,
  normalizeOpenMeteo,
  MODEL_SPECS,
} from "../web/src/lib/providers.ts";
import { buildConsensus } from "../web/src/lib/consensus.ts";
import {
  sessionSources,
  getDryWindows,
} from "../web/src/lib/session-planner.ts";
const t = 1800000000;
const hourly = (rain = 0) =>
  ["a", "b", "c"].map((id) => ({
    id,
    family: id,
    hours: [0, 1, 2].map((i) => ({
      time: t + i * 3600,
      precipitation: rain,
      temperature: -2,
      gust: 10,
    })),
  }));
const native = (rain = 0.2) => ({
  id: "icon-d2-15",
  sourceId: "icon",
  points: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => ({
    time: t + i * 900,
    precipitation: i === 2 ? rain : 0,
  })),
});
test("native timing is selected independently of a failed hourly sibling and respects exclusions", () => {
  assert.equal(enabledNearRain([native()], ["icon"], []).length, 1);
  assert.equal(enabledNearRain([native()], ["gfs"], []).length, 0);
  assert.equal(enabledNearRain([native()], ["icon"], ["icon"]).length, 0);
  const d = rainDecision([], [], [native()], t + 100, 3, 0.1);
  assert.deepEqual(d.onset, { start: t + 1800, end: t + 2700 });
  assert.equal(d.native, true);
  assert.equal(d.outlook.probability, null);
  assert.equal(d.risk, "possible");
});
test("a finer rain window takes precedence with an explicit conflict rather than an invented minute", () => {
  const rows = hourly().map((f) => ({
    ...f,
    hours: f.hours.map((h, i) => ({ ...h, precipitation: i === 2 ? 1 : 0 })),
  }));
  const d = rainDecision(rows, [], [native()], t + 100, 3, 0.1);
  assert.equal(d.outlook.firstRain, t + 7200);
  assert.equal(d.onset.start, t + 1800);
  assert.equal(d.conflict, true);
  assert.equal(d.intensity, "Light");
});
test("complete dry native data does not borrow a contradictory hourly onset as finer timing", () => {
  const d = rainDecision(hourly(1), [], [native(0)], t + 100, 3, 0.1);
  assert.equal(d.conflict, true);
  assert.equal(d.onset, null);
  assert.equal(d.outlook.wetSources, 3);
});
test("hourly-only onset retains its full interval and windows explicitly include the current hour", () => {
  const d = rainDecision(hourly(1), [], [], t + 1200, 3, 0.1);
  assert.deepEqual(d.onset, { start: t, end: t + 3600 });
  assert.equal(d.outlook.end, t + 10800);
  assert.equal(d.native, false);
});
test("negative hourly rain is missing evidence, while negative temperatures and zero rain remain valid", () => {
  const rows = hourly(-1);
  const outlook = rainOutlook(rows, [], t, t + 3600);
  assert.equal(outlook.drySources, 0);
  assert.equal(outlook.incompleteSources, 3);
  assert.equal(outlook.risk, "limited");
  const [consensus] = buildConsensus(rows);
  assert.equal(consensus.rainMedian, null);
  assert.equal(consensus.wetShare, null);
  assert.equal(consensus.temperature, -2);
  assert.equal(sessionSources(rows, t, t + 3600)[0].rainCoverage, 0);
  assert.deepEqual(getDryWindows(rows, t, 0.1, 40), []);
  assert.equal(rainOutlook(hourly(0), [], t, t + 3600).drySources, 3);
});
test("both hourly provider boundaries reject negative rain without suppressing cold air", () => {
  const a = normalizeOpenMeteo(
    {
      hourly: {
        time: [t, t + 3600],
        temperature_2m: [-2, -1],
        precipitation: [0, -1],
      },
    },
    MODEL_SPECS[0],
    "2027",
    t,
  );
  assert.equal(a.hours[0].precipitation, null);
  assert.equal(a.hours[0].temperature, -2);
  const b = normalizeMetNorway(
    {
      properties: {
        timeseries: [
          {
            time: new Date(t * 1000).toISOString(),
            data: {
              instant: { details: { air_temperature: -2 } },
              next_1_hours: { details: { precipitation_amount: -1 } },
            },
          },
        ],
      },
    },
    "2027",
    t,
  );
  assert.equal(b.hours[0].precipitation, null);
  assert.equal(b.hours[0].temperature, -2);
});
test("the agreement sentence describes dry forecasts as dry, never zero agreeing", () => {
  assert.match(
    rainDecision(hourly(), [], [], t, 3, 0.1).agreement,
    /None of 3 reporting hourly forecasts show rain/,
  );
  assert.match(rainDecision([], [], [], t, 3, 0.1).agreement, /unavailable/);
});
