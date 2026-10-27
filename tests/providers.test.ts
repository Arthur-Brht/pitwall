import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  coordinates,
  finite,
  MODEL_SPECS,
  normalizeMetNorway,
  normalizeOpenMeteo,
  timezone,
} from "../web/src/lib/providers.ts";

describe("coordinates and missing values", () => {
  it("rejects empty, nonfinite and out-of-bounds coordinates", () => {
    for (const input of [
      "",
      "lat=&lon=",
      "lat=NaN&lon=1",
      "lat=0&lon=181",
      "lat=91&lon=0",
    ])
      assert.throws(() => coordinates(new URLSearchParams(input)), RangeError);
  });
  it("preserves zero and negative values while leaving unknown data null", () => {
    assert.equal(finite(0), 0);
    assert.equal(finite(-2), -2);
    for (const v of [null, undefined, "", NaN, Infinity])
      assert.equal(finite(v), null);
  });
  it("validates IANA zones", () => {
    assert.equal(timezone("Europe/Lisbon"), "Europe/Lisbon");
    assert.throws(() => timezone("Europe/NotAPlace"), RangeError);
  });
});

describe("rain interval alignment", () => {
  const t = 1800000000; // divisible by 3600
  it("shifts Open-Meteo preceding-hour rain to the interval beginning at time", () => {
    const f = normalizeOpenMeteo(
      {
        hourly: {
          time: [t, t + 3600, t + 7200],
          temperature_2m: [15, 16, 17],
          precipitation: [99, 0, 2],
          wind_gusts_10m: [100, 20, 30],
        },
      },
      MODEL_SPECS[0],
      "2027-01-01",
      t,
    );
    assert.equal(f.hours[0].time, t);
    assert.equal(f.hours[0].precipitation, 0);
    assert.equal(f.hours[1].precipitation, 2);
    assert.equal(f.hours[2].precipitation, null);
    assert.equal(f.hours[0].gust, 20);
    assert.equal(f.hours[1].gust, 30);
    assert.equal(f.hours[2].gust, null);
    assert.equal(f.hours[0].temperature, 15);
    assert.equal(f.hours[0].probability, null);
  });
  it("does not fabricate hourly rain from MET Norway six-hour totals", () => {
    const f = normalizeMetNorway(
      {
        properties: {
          timeseries: [
            {
              time: new Date(t * 1000).toISOString(),
              data: {
                instant: {
                  details: {
                    air_temperature: 10,
                    wind_speed: 5,
                    relative_humidity: 80,
                  },
                },
                next_6_hours: { details: { precipitation_amount: 12 } },
              },
            },
            {
              time: new Date((t + 3600) * 1000).toISOString(),
              data: {
                instant: { details: {} },
                next_1_hours: { details: { precipitation_amount: 0 } },
              },
            },
          ],
        },
      },
      "2027-01-01",
      t,
    );
    assert.equal(f.hours[0].precipitation, null);
    assert.equal(f.hours[0].wind, 18);
    assert.equal(f.hours[1].precipitation, 0);
    assert.equal(f.family, "ecmwf");
    assert.equal(f.hours[1].temperature, null);
  });
});
