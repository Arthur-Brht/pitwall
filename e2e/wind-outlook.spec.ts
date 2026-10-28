import { test, expect } from "./fixtures";
import { open, setRun, chooseCircuit } from "./helpers";

test("animated wind points downwind, can pause, and respects reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await open(page);
  const summary = page.getByLabel("Conditions snapshot");
  await expect(summary).toContainText("From SW");
  await expect(summary).toContainText("Blowing towards NE");
  const stream = summary.locator(".wind-stream");
  await expect(stream).toHaveCSS("animation-name", "wind-flow");
  const angle = Number(
    await summary
      .locator("[data-wind-towards]")
      .getAttribute("data-wind-towards"),
  );
  expect(angle).toBeGreaterThan(40);
  expect(angle).toBeLessThan(60);
  await page
    .getByRole("button", { name: "Pause wind animation", exact: true })
    .click();
  await expect(stream).toHaveCSS("animation-play-state", "paused");
  await page
    .getByRole("button", { name: "Animate wind direction", exact: true })
    .click();
  await expect(stream).toHaveCSS("animation-play-state", "running");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(stream).toHaveCSS("animation-name", "none");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("a turning wind has separate hourly arrows and no misleading whole-run average", async ({
  page,
  providers,
}) => {
  providers.wind = "turning";
  await open(page);
  await expect(page.getByLabel("Conditions snapshot")).toContainText(
    "Direction varies",
  );
  await expect(
    page.getByLabel("Conditions snapshot").locator(".wind-arrow"),
  ).toHaveCount(0);
  const hours = page.getByLabel("Wind through your run");
  await expect(hours).toContainText("From SW");
  await expect(hours).toContainText("From NE");
  await expect(hours).toContainText("separate from the radar");
});

for (const mode of ["missing", "calm"] as const)
  test(`${mode} wind does not animate a fake north arrow`, async ({
    page,
    providers,
  }) => {
    providers.wind = mode;
    await open(page);
    const summary = page.getByLabel("Conditions snapshot");
    await expect(summary).toContainText(
      mode === "missing" ? "Direction unavailable" : "Calm",
    );
    await expect(summary.locator(".wind-arrow")).toHaveCount(0);
  });

test("every source explains its rain periods, wind and fetch time without clicking a bar", async ({
  page,
}) => {
  await open(page);
  await chooseCircuit(page, "Spa-Francorchamps");
  await setRun(page, "2026-10-26", "14:15", "14:45");
  await page
    .getByRole("button", { name: "Close circuit and session sidebar" })
    .click();
  const rows = page.getByLabel("Forecast rain comparison");
  await expect(rows).toContainText("Who forecasts what");
  const ecmwf = rows.getByLabel("ECMWF IFS forecast for your run", {
    exact: true,
  });
  await expect(ecmwf).toContainText("Rain 14:00–15:00.");
  await expect(ecmwf).toContainText("Wind 12 km/h from SW");
  await expect(ecmwf).toContainText("fetched");
  const met = rows.getByLabel("MET Norway forecast for your run", {
    exact: true,
  });
  await expect(met).toContainText("No rain during your run.");
  await expect(met).toContainText("Wind 11 km/h from SW");
  const native = rows.getByLabel("DWD ICON-D2 forecast for your run", {
    exact: true,
  });
  await expect(native).toContainText("15 min · regional");
  await expect(native.locator(".timeline-conditions")).toHaveCount(0);
});
