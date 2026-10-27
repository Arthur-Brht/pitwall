import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { externalLink, isAppPage, isAppDownload } from "../desktop/policy.mjs";
import { startDesktopServer } from "../desktop/server.mjs";

test("desktop external links admit only documented HTTPS destinations", () => {
  assert.ok(externalLink("https://open-meteo.com/en/docs"));
  assert.ok(externalLink("https://github.com/Arthur-Brht/pitwall-/releases"));
  for (const url of [
    "file:///etc/passwd",
    "javascript:alert(1)",
    "https://example.com",
    "https://open-meteo.com.evil.test",
    "https://user:pass@open-meteo.com",
    "https://github.com/Arthur-Brht/pitwall-evil",
    "http://open-meteo.com",
    "https://open-meteo.com:444",
  ])
    assert.equal(externalLink(url), null, url);
});

test("desktop navigation and downloads stay bound to the actual app origin", () => {
  const origin = "http://localhost:4173";
  assert.ok(isAppPage(origin + "/#planner", origin));
  assert.ok(isAppDownload("blob:" + origin + "/unique", origin));
  assert.ok(isAppDownload(origin + "/THIRD_PARTY_NOTICES.txt", origin));
  assert.equal(isAppPage(origin + "/foreign-page", origin), false);
  for (const url of [
    "blob:http://localhost:4174/id",
    "file:///tmp/file",
    "https://example.com/file",
    "blob:https://example.com/id",
    origin + "/.env",
  ])
    assert.equal(isAppDownload(url, origin), false, url);
});

test("desktop serves its bundle and refuses an occupied port without reusing another app", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "pitwall-bundle-"));
  await writeFile(
    path.join(directory, "index.html"),
    "<title>Bundled Pitwall</title>",
  );
  const running = await startDesktopServer(directory, 0);
  try {
    assert.match(await (await fetch(running.origin)).text(), /Bundled Pitwall/);
    await assert.rejects(
      startDesktopServer(directory, Number(new URL(running.origin).port)),
      { code: "EADDRINUSE" },
    );
    assert.equal((await fetch(running.origin)).status, 200);
  } finally {
    await running.close();
    await rm(directory, { recursive: true, force: true });
  }
});
