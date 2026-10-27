import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createBackup,
  mergeBackup,
  parseBackup,
  validSession,
} from "../web/src/lib/device-state.ts";
import { csvEscape, sessionsCalendar } from "../web/src/lib/exports.ts";
import { TRACKS } from "../web/src/lib/tracks.ts";

const track = TRACKS.find((t) => t.id === "spa");
const preferences = {
  favorites: [track],
  track,
  disabled: ["metno"],
  threshold: 0.2,
  gustLimit: 40,
};
const session = {
  id: "session-one",
  name: "Practice",
  trackId: track.id,
  date: "2026-10-27",
  time: "10:30",
  duration: 45,
  track,
};

test("device backup round trips real plan fields, coordinates, thresholds and disabled sources", () => {
  const backup = parseBackup(
    JSON.stringify(createBackup(preferences, [session])),
  );
  assert.deepEqual(backup.preferences, preferences);
  assert.deepEqual(backup.sessions, [session]);
});

test("run choices and sidebar state survive a validated backup without losing other circuits on merge", () => {
  const selection = {
    mode: "custom",
    date: "2026-10-27",
    startTime: "14:00",
    endTime: "14:30",
    before: 15,
    after: 30,
  };
  const saved = {
    ...preferences,
    sidebarOpen: true,
    focusSelections: { spa: selection },
  };
  const backup = parseBackup(JSON.stringify(createBackup(saved, [session])));
  assert.deepEqual(backup.preferences, saved);
  const merged = mergeBackup(
    {
      ...preferences,
      focusSelections: { other: { mode: "now", before: 0, after: 0 } },
    },
    [],
    backup,
    () => "new-id",
  );
  assert.deepEqual(merged.preferences.focusSelections.spa, selection);
  assert.equal(merged.preferences.focusSelections.other.mode, "now");
  assert.throws(
    () =>
      parseBackup(
        JSON.stringify(
          createBackup(
            {
              ...saved,
              focusSelections: { spa: { ...selection, before: -15 } },
            },
            [],
          ),
        ),
      ),
    /session focus/,
  );
});

test("bad backup formats and invalid sessions are rejected before import", () => {
  for (const text of [
    "broken",
    "null",
    '{"format":"other","version":1}',
    JSON.stringify({ ...createBackup(preferences, [session]), version: 2 }),
  ]) {
    assert.throws(() => parseBackup(text));
  }
  for (const invalid of [
    null,
    { ...session, name: "" },
    { ...session, duration: 0 },
    { ...session, date: "2026-02-30" },
    { ...session, time: "24:00" },
  ]) {
    assert.equal(validSession(invalid), false);
    assert.throws(() =>
      parseBackup(JSON.stringify(createBackup(preferences, [invalid]))),
    );
  }
  assert.throws(() => parseBackup(" ".repeat(1048577)), /smaller than 1 MB/);
});

test("backup import refuses an ambiguous circuit-local DST session", () => {
  assert.throws(
    () =>
      parseBackup(
        JSON.stringify(
          createBackup(preferences, [
            { ...session, date: "2026-10-25", time: "02:30" },
          ]),
        ),
      ),
    /local time/,
  );
});

test("merge preserves existing sessions, deduplicates repeat imports and resolves ID collisions", () => {
  const changed = { ...session, time: "14:00" };
  const merged = mergeBackup(
    preferences,
    [session],
    createBackup(preferences, [session, changed]),
    () => "new-id",
  );
  assert.deepEqual(merged.sessions[0], session);
  assert.equal(merged.sessions[1].id, "new-id");
  assert.equal(merged.added, 1);
  assert.equal(
    mergeBackup(
      merged.preferences,
      merged.sessions,
      createBackup(preferences, [changed]),
      () => "unused",
    ).added,
    0,
  );
});

test("a saved custom session retains its coordinates after its circuit is unfavorited", () => {
  const custom = {
    id: "custom-test",
    name: "Test circuit",
    country: "Test",
    lat: 1,
    lon: 2,
    timezone: "Asia/Singapore",
    custom: true,
  };
  const plan = { ...session, trackId: custom.id, track: custom };
  const parsed = parseBackup(JSON.stringify(createBackup(preferences, [plan])));
  assert.equal(parsed.sessions[0].track.timezone, custom.timezone);
  assert.match(
    sessionsCalendar(parsed.sessions, []),
    /DTSTART:20261027T023000Z/,
  );
});

test("a backup cannot silently move an existing custom circuit to different coordinates", () => {
  const custom = { ...track, id: "custom-conflict", custom: true };
  const current = { ...preferences, track: custom, favorites: [custom] };
  const imported = {
    ...current,
    track: { ...custom, lat: custom.lat + 1 },
    favorites: [{ ...custom, lat: custom.lat + 1 }],
  };
  assert.throws(
    () => mergeBackup(current, [], createBackup(imported, []), () => "unused"),
    /conflicting coordinates/,
  );
});

test("calendar export uses circuit timezone, real duration and escaped event text", () => {
  const calendar = sessionsCalendar(
    [{ ...session, name: "Race, one;\nLOCATION:other" }],
    [track],
    0,
  );
  assert.match(calendar, /DTSTART:20261027T093000Z\r\n/);
  assert.match(calendar, /DTEND:20261027T101500Z\r\n/);
  assert.match(calendar, /Race\\, one\\;\\nLOCATION:other/);
  assert.equal((calendar.match(/^LOCATION:/gm) ?? []).length, 1);
  assert.throws(
    () =>
      sessionsCalendar(
        [{ ...session, track: undefined, trackId: "missing" }],
        [],
      ),
    /unavailable/,
  );
});

test("calendar content is folded by UTF-8 bytes without corrupting names", () => {
  const accented = { ...track, name: "Épreuve très longue ".repeat(8) };
  const calendar = sessionsCalendar([{ ...session, track: accented }], [], 0);
  for (const line of calendar.trimEnd().split("\r\n"))
    assert.ok(new TextEncoder().encode(line).length <= 75);
  assert.ok(calendar.replaceAll("\r\n ", "").includes(accented.name));
});

test("CSV neutralizes text formulas without changing numerical negatives, zero or missing values", () => {
  assert.equal(
    csvEscape(' =HYPERLINK("example")'),
    '"\' =HYPERLINK(""example"")"',
  );
  assert.equal(csvEscape(-2), '"-2"');
  assert.equal(csvEscape(0), '"0"');
  assert.equal(csvEscape(null), '""');
});
