import { test } from "node:test";
import assert from "node:assert/strict";
import { RadarPlayback } from "../web/src/lib/radar-playback.ts";

function setup() {
  const layers = new Map(),
    displays = [];
  const player = new RadarPlayback(
    (index) => {
      const item = { opacity: 0, removed: false, resolve: null };
      const ready = new Promise((resolve) => (item.resolve = resolve));
      layers.set(index, item);
      return {
        layer: {
          setOpacity: (value) => (item.opacity = value),
          remove: () => (item.removed = true),
        },
        ready: () => ready,
      };
    },
    (value) => displays.push(value),
    () => {},
  );
  return { player, layers, displays };
}
test("a pending or failed scan keeps the complete previous scan and timestamp", async () => {
  const { player, layers, displays } = setup();
  const first = player.show(1000);
  layers.get(1000).resolve(true);
  await first;
  const next = player.show(1600);
  assert.equal(layers.get(1000).opacity, 0.65);
  assert.equal(layers.get(1600).opacity, 0);
  assert.deepEqual(displays, [1000]);
  layers.get(1600).resolve(false);
  assert.equal(await next, false);
  assert.equal(layers.get(1000).opacity, 0.65);
  player.destroy();
});
test("seeking cancels obsolete loads and the layer cache stays bounded", async () => {
  const { player, layers, displays } = setup();
  const obsolete = player.show(1000);
  const latest = player.show(1600);
  layers.get(1600).resolve(true);
  await latest;
  layers.get(1000).resolve(true);
  assert.equal(await obsolete, false);
  assert.deepEqual(displays, [1600]);
  for (const index of [2200, 2800, 3400, 4000]) {
    const shown = player.show(index);
    layers.get(index).resolve(true);
    await shown;
  }
  assert.ok([...layers.values()].filter((item) => !item.removed).length <= 3);
  player.setOpacity(0.3);
  assert.equal(layers.get(4000).opacity, 0.3);
  player.destroy();
  assert.ok([...layers.values()].every((item) => item.removed));
});
test("cross-fading preserves total opacity while timestamps stay at real scans", async (context) => {
  const callbacks = new Map();
  let id = 0;
  const priorRaf = globalThis.requestAnimationFrame,
    priorCancel = globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame = (callback) => {
    callbacks.set(++id, callback);
    return id;
  };
  globalThis.cancelAnimationFrame = (handle) => callbacks.delete(handle);
  context.after(() => {
    globalThis.requestAnimationFrame = priorRaf;
    globalThis.cancelAnimationFrame = priorCancel;
  });
  const advance = (time) => {
    const pending = [...callbacks.values()];
    callbacks.clear();
    for (const callback of pending) callback(time);
  };
  const { player, layers, displays } = setup();
  const first = player.show(1000);
  layers.get(1000).resolve(true);
  await first;
  const next = player.show(1600, 100);
  layers.get(1600).resolve(true);
  await Promise.resolve();
  advance(0);
  advance(50);
  assert.equal(layers.get(1000).opacity, 0.325);
  assert.equal(layers.get(1600).opacity, 0.325);
  assert.deepEqual(displays, [1000, 1600]);
  advance(100);
  await next;
  assert.equal(layers.get(1000).opacity, 0);
  assert.equal(layers.get(1600).opacity, 0.65);
  player.destroy();
});
