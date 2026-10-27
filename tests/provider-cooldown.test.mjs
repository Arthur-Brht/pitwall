import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchJson, ProviderError } from "../web/src/lib/providers.ts";

test("Open-Meteo forecast and ensemble endpoints share a provider cooldown", async (context) => {
  let calls = 0;
  context.mock.method(globalThis, "fetch", async () => {
    calls++;
    return new Response("{}", {
      status: 429,
      headers: { "Retry-After": "60" },
    });
  });
  await assert.rejects(
    fetchJson("https://api.open-meteo.com/v1/forecast?quota-test=1"),
    (error) => error instanceof ProviderError && error.code === "rate_limit",
  );
  await assert.rejects(
    fetchJson("https://ensemble-api.open-meteo.com/v1/ensemble?quota-test=1"),
    (error) => error instanceof ProviderError && error.code === "rate_limit",
  );
  assert.equal(calls, 1);
});

test("a provider cooldown applies to other URLs on that service without retrying", async (context) => {
  let calls = 0;
  context.mock.method(globalThis, "fetch", async () => {
    calls++;
    return new Response("{}", {
      status: 429,
      headers: { "Retry-After": "60" },
    });
  });
  await assert.rejects(
    fetchJson("https://weather-quota.invalid/model-a"),
    (error) => error instanceof ProviderError && error.code === "rate_limit",
  );
  await assert.rejects(
    fetchJson("https://weather-quota.invalid/model-b"),
    (error) => error instanceof ProviderError && error.code === "rate_limit",
  );
  assert.equal(calls, 1);
});
