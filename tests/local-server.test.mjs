import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createAppServer } from "../scripts/start.mjs";
import { createServer, request as httpRequest } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

async function withServer(t) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "pitwall-test-"));
  const root = path.join(temporary, "dist");
  await mkdir(root);
  await writeFile(path.join(root, "index.html"), "<title>Pitwall</title>");
  await writeFile(path.join(root, "app.js"), "export const ok=true;");
  await writeFile(path.join(temporary, "private.txt"), "must not be exposed");
  const app = createAppServer(root);
  await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => app.close(resolve));
    await rm(temporary, { recursive: true, force: true });
  });
  return `http://127.0.0.1:${app.address().port}`;
}
test("local app serves built files with correct content types and HEAD support", async (t) => {
  const base = await withServer(t);
  const page = await fetch(base + "/");
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Pitwall/);
  const script = await fetch(base + "/app.js");
  assert.match(script.headers.get("content-type"), /javascript/);
  const head = await fetch(base + "/app.js", { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
});
test("repository files and encoded traversal stay outside the local app", async (t) => {
  const base = await withServer(t);
  assert.equal((await fetch(base + "/%2e%2e%2fprivate.txt")).status, 403);
  assert.equal((await fetch(base + "/private.txt")).status, 404);
  assert.equal((await fetch(base + "/.env")).status, 404);
});
test("local server rejects foreign hostnames and prevents embedding or arbitrary scripts", async (t) => {
  const base = await withServer(t);
  const status = await new Promise((resolve, reject) => {
    const request = httpRequest(
      base,
      { headers: { host: "foreign.example" } },
      (response) => {
        response.resume();
        resolve(response.statusCode);
      },
    );
    request.on("error", reject);
    request.end();
  });
  assert.equal(status, 403);
  const page = await fetch(base);
  assert.equal(page.headers.get("x-frame-options"), "DENY");
  assert.match(
    page.headers.get("content-security-policy"),
    /script-src 'self'/,
  );
  assert.match(page.headers.get("permissions-policy"), /geolocation=\(\)/);
});
test("local app supports navigation fallback and rejects unexpected writes", async (t) => {
  const base = await withServer(t);
  assert.equal((await fetch(base + "/session/planner")).status, 200);
  assert.equal(
    (await fetch(base + "/", { method: "POST", body: "unused" })).status,
    405,
  );
  assert.deepEqual(await (await fetch(base + "/__pitwall_health")).json(), {
    app: "pitwall",
    mode: "localhost",
  });
});

test("launching Pitwall twice reuses the verified loopback app without changing ports", async (t) => {
  const base = await withServer(t);
  const port = new URL(base).port;
  const { stdout } = await promisify(execFile)(
    process.execPath,
    [
      fileURLToPath(new URL("../scripts/start.mjs", import.meta.url)),
      "--port",
      port,
    ],
    { timeout: 5000 },
  );
  assert.match(stdout, /Pitwall is already running/);
  assert.ok(stdout.includes(`http://localhost:${port}/`));
  assert.equal((await fetch(base + "/")).status, 200);
});

test("the launcher leaves another application on the requested port untouched", async (t) => {
  const other = createServer((_request, response) => {
    response.setHeader("Content-Type", "application/json");
    response.end('{"app":"other"}');
  });
  await new Promise((resolve) => other.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => other.close(resolve)));
  const port = other.address().port;
  await assert.rejects(
    promisify(execFile)(
      process.execPath,
      [
        fileURLToPath(new URL("../scripts/start.mjs", import.meta.url)),
        "--port",
        String(port),
      ],
      { timeout: 5000 },
    ),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /another application/);
      return true;
    },
  );
  assert.deepEqual(await (await fetch(`http://127.0.0.1:${port}/`)).json(), {
    app: "other",
  });
});
