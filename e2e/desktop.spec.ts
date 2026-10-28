import { _electron } from "@playwright/test";
import type { ElectronApplication } from "@playwright/test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test as browserTest, expect, TEST_TIME } from "./fixtures";
import { createSession, sessions, preferences } from "./helpers";

const test = browserTest.extend<{
  desktopApp: ElectronApplication;
  temporary: string;
}>({
  temporary: async ({ browserName: _browserName }, provide) => {
    const directory = await mkdtemp(path.join(tmpdir(), "pitwall-electron-"));
    try {
      await provide(directory);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
  desktopApp: async ({ temporary }, provide) => {
    const application = await _electron.launch({
      args: [process.cwd(), "--pitwall-test"],
      env: {
        ...process.env,
        PITWALL_TEST_PROFILE: path.join(temporary, "profile"),
        PITWALL_TEST_PORT: "4175",
        PITWALL_TEST_HOLD: "1",
      },
    });
    try {
      await application.firstWindow();
      await provide(application);
    } finally {
      await application.close();
    }
  },
  context: async ({ desktopApp }, provide) => {
    await provide(desktopApp.context());
  },
  page: async ({ desktopApp, providers: _providers }, provide) => {
    const page = await desktopApp.firstWindow();
    await page.clock.install({ time: TEST_TIME });
    await provide(page);
  },
});

test("desktop loads all feeds, preserves plans, exports and restores a real backup", async ({
  page,
  desktopApp,
  temporary,
}) => {
  const startedAt = Date.now();
  const responses: { source: string; status: number; elapsedMs: number }[] = [];
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (
      [
        "api.open-meteo.com",
        "ensemble-api.open-meteo.com",
        "api.met.no",
      ].includes(url.hostname)
    )
      responses.push({
        source: `${url.hostname}:${url.searchParams.get("models") ?? "locationforecast"}`,
        status: response.status(),
        elapsedMs: Date.now() - startedAt,
      });
  });
  await page.goto("http://localhost:4175/");
  try {
    // The full batch includes paced hourly, regional and ensemble calls. A hidden
    // Electron window can throttle their timers on macOS; keep a bounded wait
    // while still requiring all eight sources, without retries or live services.
    await expect(
      page.getByText("8 of 8 sources", { exact: false }),
    ).toBeVisible({ timeout: 20000 });
    console.info("All eight desktop sources ready", {
      elapsedMs: Date.now() - startedAt,
      responses,
    });
  } catch (error) {
    console.error("Desktop source readiness failed", {
      elapsedMs: Date.now() - startedAt,
      responses,
      page: await page.locator("body").innerText(),
    });
    throw error;
  }
  expect(
    await page.evaluate(() => ({
      require: typeof (window as unknown as { require?: unknown }).require,
      process: typeof (window as unknown as { process?: unknown }).process,
    })),
  ).toEqual({ require: "undefined", process: "undefined" });
  await expect(
    page.getByRole("button", { name: "Use Pitwall as an app" }),
  ).toHaveCount(0);
  const nextTheme =
    (await page.locator("html").getAttribute("data-theme")) === "dark"
      ? "light"
      : "dark";
  await page
    .getByRole("button", { name: `Switch to ${nextTheme} mode` })
    .click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", nextTheme);
  for (const name of ["Models", "History", "Dashboard"])
    await page.getByRole("button", { name, exact: true }).click();
  await createSession(page);
  await page.reload();
  expect(await sessions(page)).toHaveLength(1);
  await preferences(page);
  const destination = path.join(temporary, "backup.json");
  await desktopApp.evaluate(({ session }, destination) => {
    session.defaultSession.once("will-download", (_event, item) =>
      item.setSavePath(destination),
    );
  }, destination);
  await page
    .getByRole("button", { name: "Export backup", exact: true })
    .click();
  await expect
    .poll(() => readFile(destination, "utf8").catch(() => ""))
    .toContain("pitwall-device-backup");
  const backup = await readFile(destination, "utf8");
  expect(JSON.parse(backup).format).toBe("pitwall-device-backup");
  await page.locator('input[type="file"]').setInputFiles(destination);
  await expect(
    page.getByText("Backup restored: 0 sessions added.", { exact: false }),
  ).toBeVisible();
});
