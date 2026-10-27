import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { verifyForecasts } from "../web/src/lib/verification.ts";

const data = JSON.parse(
  await readFile(
    new URL("../docs/validation/pilot-2026-10-27.json", import.meta.url),
    "utf8",
  ),
);
const result = verifyForecasts(data.history, data.observations, data.track);
assert.equal(result.matchedHours, data.provenance.matchedHours);
assert.ok(Math.abs(result.distance - data.provenance.distance) < 1e-9);
assert.deepEqual(result.scores, data.provenance.scores);
console.log(
  `Reproduced ${result.matchedHours} measured UTC hours; station distance ${result.distance.toFixed(2)} km.`,
);
console.table(
  result.scores.map((s) => ({
    source: s.provider,
    lead: s.lead,
    field: s.metric,
    hours: s.count,
    MAE: +s.mae.toFixed(2),
    bias: +s.bias.toFixed(2),
  })),
);
console.log(data.provenance.purpose);
console.log(data.provenance.method);
