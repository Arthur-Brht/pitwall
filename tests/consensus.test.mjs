import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildConsensus,
  median,
  getRainWindows,
  summarizeSession,
} from "../web/src/lib/consensus.ts";
const hour = (time, rain, temperature = 15, direction = null) => ({
  time,
  precipitation: rain,
  temperature,
  probability: null,
  wind: 10,
  gust: 20,
  direction,
  humidity: 70,
  dewpoint: 12,
  cloud: 50,
  pressure: 1010,
  visibility: null,
  weatherCode: null,
});
const f = (id, family, hours) => ({ id, family, hours });
test("missing values remain absent and zero rain is valid", () => {
  assert.equal(median([null, undefined, NaN]), null);
  const [c] = buildConsensus([
    f("a", "a", [hour(0, null)]),
    f("b", "b", [hour(0, 0)]),
  ]);
  assert.equal(c.count, 1);
  assert.equal(c.rainMedian, 0);
  assert.equal(c.wetShare, 0);
  assert.equal(c.visibility, null);
  assert.equal(c.probability, null);
});
test("same underlying family cannot gain votes from a second transport", () => {
  const [c] = buildConsensus([
    f("ifs", "ecmwf", [hour(0, 1)]),
    f("met", "ecmwf", [hour(0, 1)]),
    f("gfs", "gfs", [hour(0, 0)]),
    f("icon", "icon", [hour(0, 0)]),
  ]);
  assert.equal(c.count, 3);
  assert.equal(c.wetCount, 1);
  assert.equal(c.wetShare, 1 / 3);
  assert.equal(c.agreement, "split");
});
test("compare only common valid times without index alignment or duplicate source hours", () => {
  const c = buildConsensus([
    f("a", "a", [hour(0, 0), hour(3600, 1), hour(3600, 100)]),
    f("b", "b", [hour(3600, 3)]),
  ]);
  assert.equal(c.length, 2);
  assert.equal(c[0].count, 1);
  assert.equal(c[1].count, 2);
  assert.equal(c[1].rainMedian, 2);
});
test("wind direction respects circular wrap and opposing wind is undefined", () => {
  let [c] = buildConsensus([
    f("a", "a", [hour(0, 0, 15, 350)]),
    f("b", "b", [hour(0, 0, 15, 10)]),
  ]);
  assert.ok(c.direction < 1 || c.direction > 359);
  [c] = buildConsensus([
    f("a", "a", [hour(0, 0, 15, 0)]),
    f("b", "b", [hour(0, 0, 15, 180)]),
  ]);
  assert.equal(c.direction, null);
});
test("wet threshold and limited family labels", () => {
  assert.throws(() => buildConsensus([], 0), RangeError);
  const [c] = buildConsensus([f("a", "a", [hour(0, 0.1)])], 0.1);
  assert.equal(c.wetCount, 1);
  assert.equal(c.agreement, "limited");
});
test("rain windows do not bridge missing hours", () => {
  const c = buildConsensus([
    f("a", "a", [hour(0, 1), hour(3600, 1), hour(10800, 1)]),
  ]);
  assert.deepEqual(
    getRainWindows(c).map((w) => [w.start, w.end]),
    [
      [0, 7200],
      [10800, 14400],
    ],
  );
});
test("session uses interval overlap and flags incomplete coverage", () => {
  const c = buildConsensus([f("a", "a", [hour(0, 2), hour(3600, 0)])]);
  const s = summarizeSession(c, 1800, 5400);
  assert.equal(s.coverage, 1);
  assert.equal(s.rainAmount, 1);
  assert.equal(summarizeSession(c, 0, 10800).coverage, 2 / 3);
});
test("related sources do not hide range extremes or peak gusts", () => {
  const a = hour(0, 0.2, 10);
  a.gust = 60;
  const b = hour(0, 4, 20);
  b.gust = 20;
  const [c] = buildConsensus([
    f("a", "ecmwf", [a]),
    f("b", "ecmwf", [b]),
    f("c", "gfs", [hour(0, 0, 15)]),
  ]);
  assert.equal(c.gust, 60);
  assert.equal(c.rainMax, 4);
  assert.equal(c.rainMin, 0);
  assert.equal(c.tempMin, 10);
  assert.equal(c.tempMax, 20);
  assert.equal(c.count, 2);
});

test("session family-vote means are weighted by the actual overlap duration", () => {
  const c = buildConsensus([f("a", "a", [hour(0, 0), hour(3600, 1)])]);
  assert.equal(summarizeSession(c, 1800, 7200).meanWetShare, 2 / 3);
  assert.equal(summarizeSession([c[0], c[0]], 0, 7200).coverage, 0.5);
});
