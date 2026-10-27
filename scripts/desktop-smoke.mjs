import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const mac = process.platform === "darwin";
const packaged = !process.argv.includes("--development");
const binary = packaged
  ? path.join(
      root,
      "release",
      mac
        ? "mac-universal/Pitwall.app/Contents/MacOS/Pitwall"
        : "win-unpacked/Pitwall.exe",
    )
  : (await import("electron")).default;
await access(binary);
const temporary = await mkdtemp(path.join(tmpdir(), "pitwall-desktop-"));
try {
  for (const reopen of [false, true]) {
    const output = path.join(
      temporary,
      reopen ? "reopened.json" : "first.json",
    );
    const args = [...(packaged ? [] : [root]), "--pitwall-test"];
    await new Promise((resolve, reject) => {
      const child = spawn(binary, args, {
        windowsHide: true,
        env: {
          ...process.env,
          PITWALL_TEST_PROFILE: path.join(temporary, "profile"),
          PITWALL_TEST_PORT: "4175",
          PITWALL_SMOKE_OUTPUT: output,
          PITWALL_SMOKE_REOPEN: reopen ? "1" : "0",
        },
        stdio: "pipe",
      });
      let log = "";
      child.stderr.on("data", (data) => {
        log = (log + data).slice(-4000);
      });
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error("Desktop launch timed out. " + log));
      }, 45000);
      child.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once("exit", (code) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else reject(new Error(`Desktop exited ${code}. ${log}`));
      });
    });
    const report = JSON.parse(await readFile(output, "utf8"));
    assert.equal(report.packaged, packaged);
    assert.equal(report.rendered, true);
    assert.equal(report.nodeUnavailable, true);
    assert.equal(report.sandbox, true);
    assert.equal(report.persisted, true);
    assert.equal(report.indexedDB, true);
    console.log(
      JSON.stringify({ launch: reopen ? "reopen" : "first", ...report }),
    );
  }
} finally {
  // This unique temporary directory was created above, never a user's profile.
  await rm(temporary, { recursive: true, force: true });
}
