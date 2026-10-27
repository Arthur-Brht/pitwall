import { test } from "node:test";
import assert from "node:assert/strict";
import {
  coordinateTrack,
  searchTrack,
  validTrack,
} from "../web/src/lib/tracks.ts";

test("custom locations with different timezones cannot silently reuse a session identity", () => {
  const first = coordinateTrack("Paddock", 50, 5, "Europe/Paris");
  const otherClock = coordinateTrack("Other clock", 50, 5, "UTC", [first]);
  assert.notEqual(first.id, otherClock.id);
  assert.equal(first.timezone, "Europe/Paris");
});
test("location search never invents UTC when a provider omits the timezone", () => {
  const place = {
    name: "Test place",
    latitude: 50,
    longitude: 5,
    country: "Belgium",
  };
  assert.equal(searchTrack(place), null);
  assert.equal(searchTrack({ ...place, timezone: "Not/AZone" }), null);
  assert.equal(
    searchTrack({ ...place, timezone: "Europe/Brussels" }).timezone,
    "Europe/Brussels",
  );
});
test("malformed optional track fields cannot pass backup or browser hydration validation", () => {
  const track = coordinateTrack("Paddock", 50, 5, "UTC");
  assert.equal(validTrack({ ...track, lengthKm: "invalid" }), false);
  assert.equal(validTrack({ ...track, custom: "yes" }), false);
  assert.equal(validTrack({ ...track, name: " " }), false);
  assert.equal(validTrack({ ...track, id: "" }), false);
});
test("a matching legacy custom location keeps its identity and saved plans", () => {
  const legacy = {
    ...coordinateTrack("Paddock", 50, 5, "Europe/Paris"),
    id: "custom-legacy",
  };
  assert.equal(
    coordinateTrack("Same point", 50, 5, "Europe/Paris", [legacy]),
    legacy,
  );
  assert.throws(() => coordinateTrack("Invalid", 91, 5, "UTC"), /coordinates/);
  assert.throws(() => coordinateTrack("Invalid", 50, 5, "Not/AZone"));
});
