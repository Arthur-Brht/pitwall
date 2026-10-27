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
  await page.screenshot({ path: "docs/images/overview.png" });
  // Presentation pauses give readers time to see each scene; readiness uses assertions.
  await page.waitForTimeout(2000);
  await page
    .getByRole("button", { name: "Forecast comparison", exact: true })
    .click();
  await page.getByLabel("Forecast hours displayed").selectOption("48");
  await page.screenshot({ path: "docs/images/comparison.png" });
  await page.waitForTimeout(2000);
  await createSession(page);
  await page
    .getByLabel("SESSION NAME", { exact: true })
    .fill("Example practice");
  await page
    .getByRole("combobox", { name: "Session duration", exact: true })
    .selectOption("45");
  await page.getByRole("button", { name: "Update saved session" }).click();
  await expect(
    page.getByText("Updated Example practice", { exact: false }),
  ).toBeVisible();
  await page.screenshot({ path: "docs/images/planner.png" });
  await page.waitForTimeout(2500);
  await page
    .getByRole("button", { name: "History & sources", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Forecast verification", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "docs/images/history.png" });
  await page.waitForTimeout(2000);
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.waitForTimeout(1500);
});
