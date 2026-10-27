import { mkdir } from "node:fs/promises";
import { test, expect } from "./fixtures";
import { open, chooseCircuit, setRun, createSession } from "./helpers";

// Synthetic weather is confined to isolated documentation fixtures, never shipped as a demo feed.
test("capture the illustrated workflow", async ({ page, providers }) => {
  providers.liveMap = true;
  await mkdir("docs/images", { recursive: true });
  await open(page);
  await chooseCircuit(page, "Spa-Francorchamps");
  await setRun(page, "2026-10-26", "13:45", "14:45");
  await expect(page.getByLabel("Rain risk snapshot")).toContainText(
    "14:00–15:00",
  );
  await page.screenshot({ path: "docs/images/run-sidebar.png" });
  await page
    .getByRole("button", { name: "Close circuit and session sidebar" })
    .click();
  await page.waitForFunction(() =>
    [
      ...document.querySelectorAll<HTMLImageElement>(
        ".base-map-tiles .leaflet-tile",
      ),
    ].some((image) => image.complete && image.naturalWidth > 0),
  );
  await page.screenshot({ path: "docs/images/dashboard.png" });
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.screenshot({ path: "docs/images/dashboard-dark.png" });
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await page.getByText("Playback range & map options", { exact: true }).click();
  await page
    .locator(".map-panel")
    .screenshot({ path: "docs/images/radar-window.png" });
  await page.getByText("Playback range & map options", { exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "docs/images/dashboard-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.getByRole("button", { name: "Models", exact: true }).click();
  await page.screenshot({ path: "docs/images/comparison.png" });
  await createSession(page);
  await page
    .getByLabel("Session name", { exact: true })
    .fill("Example practice");
  await page
    .getByRole("combobox", { name: "Session duration", exact: true })
    .selectOption("45");
  await page.getByRole("button", { name: "Update session" }).click();
  await page.screenshot({ path: "docs/images/planner.png" });
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Forecast verification", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "docs/images/history.png" });
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
});
