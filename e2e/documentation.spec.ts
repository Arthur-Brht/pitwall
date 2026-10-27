import { mkdir } from "node:fs/promises";
import { test, expect } from "./fixtures";
import { open, createSession } from "./helpers";

// Reproducible documentation captures use the same isolated synthetic fixtures
// as the regression suite. No production demo mode or seeded data is shipped.
test("capture the illustrated workflow", async ({ page, providers }) => {
  providers.liveMap = true;
  await mkdir("docs/images", { recursive: true });
  await open(page);
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll<HTMLImageElement>(".leaflet-tile")].length >
        0 &&
      [...document.querySelectorAll<HTMLImageElement>(".leaflet-tile")].every(
        (image) => image.complete && image.naturalWidth > 0,
      ),
  );
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Saved circuits" })
    .getByRole("button", { name: /Spa-Francorchamps/ })
    .click();
  await expect(page.getByLabel("15-minute rain timing")).toContainText(
    "10:30–10:45",
  );
  await page.getByLabel("Dashboard forecast window").selectOption("6");
  await expect(page.locator(".risk-probability>strong")).toHaveText("50%");
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
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "docs/images/dashboard-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.screenshot({ path: "docs/images/overview.png" });
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({ path: "docs/images/overview-dark.png" });
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  // Presentation pauses give readers time to see each scene; readiness uses assertions.
  await page.waitForTimeout(2000);
  await page.getByRole("button", { name: "Models", exact: true }).click();
  await page.getByLabel("Forecast hours displayed").selectOption("48");
  await page.screenshot({ path: "docs/images/comparison.png" });
  await page.waitForTimeout(2000);
  await createSession(page);
  await page
    .getByLabel("Session name", { exact: true })
    .fill("Example practice");
  await page
    .getByRole("combobox", { name: "Session duration", exact: true })
    .selectOption("45");
  await page.getByRole("button", { name: "Update session" }).click();
  await expect(
    page.getByText("Updated Example practice", { exact: false }),
  ).toBeVisible();
  await page.screenshot({ path: "docs/images/planner.png" });
  await page.waitForTimeout(2500);
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Forecast verification", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "docs/images/history.png" });
  await page.waitForTimeout(2000);
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.waitForTimeout(1500);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Open saved circuits" }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "docs/images/overview-mobile.png" });
});
