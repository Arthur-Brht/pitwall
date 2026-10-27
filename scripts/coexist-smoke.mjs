import { spawn } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";

if (
  process.env.CI !== "true" ||
  !process.env.GITHUB_ACTIONS ||
  !process.env.RUNNER_TEMP
)
  throw Error(
    "Production coexistence checks belong on a disposable GitHub runner.",
  );
const identity = JSON.parse(
  await readFile(
    new URL("../desktop/app-identity.json", import.meta.url),
    "utf8",
  ),
);
const mac = process.platform === "darwin";
const baseline = process.argv[2];
const preview =
  process.argv[3] ??
  path.resolve(
    "release",
    mac
      ? `mac-universal/${identity.name}.app/Contents/MacOS/${identity.name}`
      : `win-unpacked/${identity.name}.exe`,
  );
if (!baseline) throw Error("Pass the reference application's executable.");
const appData = mac
  ? path.join(os.homedir(), "Library/Application Support")
  : process.env.APPDATA;
const apps = [
  {
    binary: baseline,
    port: 4183,
    profile: "Pitwall 2.3 Preview",
    marker: "baseline-only",
  },
  {
    binary: preview,
    port: identity.port,
    profile: identity.profile,
    marker: "preview-only",
  },
];
assert.notEqual(apps[0].port, apps[1].port);
assert.notEqual(apps[0].profile, apps[1].profile);
const children = [];
async function running(app) {
  const response = await fetch(
    `http://127.0.0.1:${app.port}/__pitwall_health`,
    { signal: AbortSignal.timeout(1000) },
  );
  return response.ok;
}
for (const app of apps) {
  await access(app.binary);
  if (await running(app).catch(() => false))
    throw Error(`Reference test address ${app.port} is already occupied.`);
}
const logs = [];
try {
  // No test flag, port override or profile override: exercise packaged defaults.
  for (const app of apps) {
    const env = { ...process.env };
    for (const key of Object.keys(env))
      if (key.startsWith("PITWALL_TEST_") || key.startsWith("PITWALL_SMOKE_"))
        delete env[key];
    const child = spawn(app.binary, [], {
      windowsHide: true,
      env,
      stdio: "pipe",
    });
    child.on("error", (error) => logs.push(error.message));
    child.stderr.on("data", (bytes) => {
      if (logs.length < 20) logs.push(String(bytes).slice(-500));
    });
    children.push(child);
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      if (child.exitCode !== null) break;
      if (await running(app).catch(() => false)) {
        ready = true;
        break;
      }
      await delay(500);
    }
    assert.ok(
      ready,
      `Production app ${app.profile} did not open: ${logs.join(" ")}`,
    );
    const profile = path.join(appData, app.profile);
    await access(profile);
    await writeFile(path.join(profile, "coexistence-check.txt"), app.marker, {
      flag: "wx",
    });
  }
  for (const app of apps) {
    assert.ok(
      await running(app),
      "Both applications must serve their own address simultaneously.",
    );
    assert.equal(
      await readFile(
        path.join(appData, app.profile, "coexistence-check.txt"),
        "utf8",
      ),
      app.marker,
    );
  }
  console.log(
    JSON.stringify({
      productionDefaults: true,
      simultaneousApps: true,
      distinctProfiles: true,
      ports: apps.map((app) => app.port),
      profiles: apps.map((app) => app.profile),
    }),
  );
} finally {
  for (const child of children) if (child.exitCode === null) child.kill();
  await Promise.all(
    children.map(async (child) => {
      for (let i = 0; i < 20 && child.exitCode === null; i++) await delay(250);
      if (child.exitCode === null) child.kill("SIGKILL");
    }),
  );
}
