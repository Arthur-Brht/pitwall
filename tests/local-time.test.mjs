import { test } from "node:test";
import assert from "node:assert/strict";
import { localEpoch } from "../web/src/lib/local-time.ts";
test("circuit local times convert independently of browser timezone", () => {
  assert.equal(
    localEpoch("2026-10-27", "10:00", "Europe/Paris"),
    Date.parse("2026-10-27T09:00:00Z") / 1000,
  );
  assert.equal(
    localEpoch("2026-10-27", "10:00", "Europe/Lisbon"),
    Date.parse("2026-10-27T10:00:00Z") / 1000,
  );
  assert.equal(
    localEpoch("2026-07-27", "10:00", "Europe/Lisbon"),
    Date.parse("2026-07-27T09:00:00Z") / 1000,
  );
});
test("cleared, invalid calendar dates and unknown zones cannot produce a session", () => {
  for (const [date, time, tz] of [
    ["2026-10-27", "", "Europe/Paris"],
    ["", "10:00", "Europe/Paris"],
    ["2026-02-30", "10:00", "Europe/Paris"],
    ["2026-10-27", "25:00", "UTC"],
    ["2026-10-27", "10:00", "Europe/Unknown"],
  ])
    assert.ok(Number.isNaN(localEpoch(date, time, tz)));
});
test("nonexistent and repeated daylight saving times require explicit different time", () => {
  assert.ok(Number.isNaN(localEpoch("2026-03-29", "02:30", "Europe/Madrid")));
  assert.ok(Number.isNaN(localEpoch("2026-10-25", "02:30", "Europe/Madrid")));
  assert.ok(
    Number.isNaN(localEpoch("2026-11-01", "01:30", "America/New_York")),
  );
  assert.ok(
    Number.isFinite(localEpoch("2026-10-25", "03:30", "Europe/Madrid")),
  );
});
