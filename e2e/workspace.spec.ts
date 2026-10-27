import AxeBuilder from "@axe-core/playwright";
import { test, expect, TEST_TIME } from "./fixtures";

import { open, planner, preferences, createSession, sessions } from "./helpers";
test("all feeds load and every view navigates without runtime errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await open(page);
  for (const name of [
    "Forecast comparison",
    "Session planner",
    "History & sources",
    "Overview",
  ]) {
    const tab = page.getByRole("button", { name, exact: true });
    await tab.click();
    await expect(tab).toHaveAttribute("aria-current", "page");
  }
  expect(errors).toEqual([]);
});

test("source toggles change the comparison and survive reload", async ({
  page,
}) => {
  await open(page);
  await page
    .getByRole("button", { name: "Forecast comparison", exact: true })
    .click();
  await page
    .getByRole("checkbox", { name: "Include DWD ICON in comparison" })
    .uncheck();
  await expect(
    page.getByText("4 enabled feeds", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("4 enabled feeds", { exact: false }),
  ).toBeVisible();
});

test("sessions edit in place, export real times, delete and undo", async ({
  page,
}) => {
  await open(page);
  await createSession(page);
  const [before] = await sessions(page);
  await page
    .getByRole("combobox", { name: "Session duration", exact: true })
    .selectOption("45");
  await page.getByRole("button", { name: "Update saved session" }).click();
  const after = await sessions(page);
  expect(after).toHaveLength(1);
  expect(after[0]).toMatchObject({ id: before.id, duration: 45 });
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export calendar (.ics)" }).click();
  const download = await pending;
  const stream = await download.createReadStream();
  let calendar = "";
  for await (const chunk of stream!) calendar += chunk.toString();
  expect(calendar).toContain("DTSTART:20261026T110000Z");
  expect(calendar).toContain("DTEND:20261026T114500Z");
  await page
    .getByRole("button", { name: "Delete Release test practice" })
    .click();
  expect(await sessions(page)).toHaveLength(0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect(await sessions(page)).toHaveLength(1);
  await page.reload();
  expect(await sessions(page)).toHaveLength(1);
});

test("backup restore deduplicates and invalid imports preserve existing plans", async ({
  page,
}) => {
  await open(page);
  await createSession(page);
  await preferences(page);
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export backup", exact: true })
    .click();
  const stream = await (await pending).createReadStream();
  let backup = "";
  for await (const chunk of stream!) backup += chunk.toString();
  expect(JSON.parse(backup).format).toBe("pitwall-device-backup");
  await page.locator('input[type="file"]').setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(backup),
  });
  await expect(
    page.getByText("Backup restored: 0 sessions added.", { exact: false }),
  ).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"format":"unknown"}'),
  });
  expect(await sessions(page)).toHaveLength(1);
  await expect(
    page.getByText("Backup restored: 0 sessions added.", { exact: false }),
  ).toHaveCount(0);
});

test("provider failures preserve saved provenance and recover on refresh", async ({
  page,
  providers,
}) => {
  await open(page);
  providers.failed = true;
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(
    page.getByText("saved forecast", { exact: false }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("5 enabled feeds", { exact: false }),
  ).toBeVisible();
  providers.failed = false;
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(
    page.locator(".offline-banner").filter({ hasText: "saved forecast" }),
  ).toHaveCount(0);
});

test("history records genuine fetch identities and exports the selected metric", async ({
  page,
}) => {
  await open(page);
  await page.clock.setSystemTime(new Date(TEST_TIME.getTime() + 11 * 60000));
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.locator(".loading-banner")).toHaveCount(0);
  await page
    .getByRole("button", { name: "History & sources", exact: true })
    .click();
  await page
    .getByLabel("Forecast evolution metric")
    .selectOption("precipitation");
  await expect(page.getByLabel("Forecast evolution metric")).toHaveValue(
    "precipitation",
  );
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export history", exact: true })
    .click();
  const stream = await (await pending).createReadStream();
  let csv = "";
  for await (const chunk of stream!) csv += chunk.toString();
  expect(csv).toContain("fetched_at_utc");
  expect(csv).toContain("precipitation_mm_hour");
  expect(csv.split("\n").length).toBeGreaterThan(200);
});

test("invalid circuit input is rejected and valid custom locations persist", async ({
  page,
}) => {
  await open(page);
  if (
    await page.getByRole("button", { name: "Open saved circuits" }).isVisible()
  )
    await page.getByRole("button", { name: "Open saved circuits" }).click();
  await page
    .getByRole("button", { name: "Add a circuit or location", exact: true })
    .click();
  await page.getByRole("button", { name: "Coordinates", exact: true }).click();
  await page.getByLabel("LOCATION NAME").fill("Custom paddock");
  await page.getByLabel("LATITUDE").fill("91");
  await page.getByLabel("LONGITUDE").fill("5");
  await page.getByRole("button", { name: "Add location", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("LATITUDE").fill("50.3");
  await page.getByLabel("TIMEZONE").fill("Europe/Berlin");
  await page.getByRole("button", { name: "Add location", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Custom paddock", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Custom paddock", exact: true }),
  ).toBeVisible();
});

test("corrupt saved state is preserved with a visible recovery message", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("pitwall-sessions", "invalid saved data"),
  );
  await open(page);
  await expect(
    page.getByText("Saved sessions could not be read.", { exact: false }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("pitwall-sessions")),
  ).toBe("invalid saved data");
});

test("missing forecasts remain unavailable without fake dry conditions", async ({
  page,
  providers,
}) => {
  providers.failed = true;
  await page.goto("/");
  await expect(
    page.getByRole("alert").getByText("Forecast unavailable"),
  ).toBeVisible();
  await planner(page);
  await expect(page.locator(".dry-window")).toHaveCount(0);
});

test("modal keyboard focus is contained and returns to the opener", async ({
  page,
}) => {
  await open(page);
  await preferences(page);
  const dialog = page.getByRole("dialog");
  for (let i = 0; i < 16; i++) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(
    page
      .getByRole("button", { name: "Weather preferences", exact: true })
      .last(),
  ).toBeFocused();
});

test("all views fit the viewport and have no serious accessibility violations", async ({
  page,
}, testInfo) => {
  await open(page);
  for (const name of [
    "Overview",
    "Forecast comparison",
    "Session planner",
    "History & sources",
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    await testInfo.attach(`axe-${name}`, {
      body: JSON.stringify(results.violations),
      contentType: "application/json",
    });
    expect(
      results.violations
        .filter((v) => v.impact === "critical" || v.impact === "serious")
        .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
    ).toEqual([]);
  }
});

test("observation verification scores only prior forecasts and exports station provenance", async ({
  page,
}) => {
  await open(page);
  await page.clock.setSystemTime(new Date("2026-10-26T13:00:00Z"));
  await page
    .getByRole("button", { name: "History & sources", exact: true })
    .click();
  const csv =
    "station,source,latitude,longitude,observed_at_utc,temperature_C,precipitation_mm_hour,wind_km_h\nTest measurement station,Synthetic browser-test fixture,37.2319,-8.6267,2026-10-26T11:00:00Z,16,0,10";
  await page
    .getByLabel("Import hourly observations", { exact: true })
    .setInputFiles({
      name: "test-measurements.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    });
  await expect(page.locator(".verification-panel")).toContainText(
    "1 matched valid hours",
  );
  await expect(
    page
      .getByRole("region", { name: "Forecast verification results" })
      .getByRole("row"),
  ).toHaveCount(16);
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export verification", exact: true })
    .click();
  const stream = await (await pending).createReadStream();
  let output = "";
  for await (const chunk of stream!) output += chunk.toString();
  expect(output).toContain("Test measurement station");
  expect(output).toContain("matched_hours");
  expect(output).toContain('"ecmwf","0–6 h","temperature","1","2"');
});

test("location search preserves the provider timezone and dialogs remain accessible", async ({
  page,
}) => {
  await open(page);
  if (
    await page.getByRole("button", { name: "Open saved circuits" }).isVisible()
  )
    await page.getByRole("button", { name: "Open saved circuits" }).click();
  await page
    .getByRole("button", { name: "Add a circuit or location", exact: true })
    .click();
  const searchAudit = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    searchAudit.violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => v.id),
  ).toEqual([]);
  await page
    .getByRole("textbox", { name: "Search circuits or places" })
    .fill("Test town");
  await page.getByRole("button", { name: /Test town/ }).click();
  await expect(
    page.getByRole("heading", { name: "Test town", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("pitwall-preferences")!).track.timezone,
    ),
  ).toBe("Europe/Lisbon");
  await preferences(page);
  const preferencesAudit = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    preferencesAudit.violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => v.id),
  ).toEqual([]);
});
