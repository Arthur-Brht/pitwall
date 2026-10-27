import { test, expect } from "./fixtures";

test("dashboard changes the window-level rain estimate and comparison together", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByText("8 of 8 sources", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Dashboard", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  const snapshot = page.getByLabel("Rain risk snapshot");
  await expect(snapshot.locator(".risk-probability>strong")).toHaveText("0%");
  await page.getByLabel("Dashboard forecast window").selectOption("6");
  await expect(snapshot.locator(".risk-probability>strong")).toHaveText("50%");
  await expect(
    snapshot.getByRole("heading", { name: "Elevated rain risk" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Forecast rain comparison" })
      .locator("tbody tr"),
  ).toHaveCount(8);
  expect(errors).toEqual([]);
});

test("forecast catalog selections are saved per location and extra regional forecasts can be added", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("8 of 8 sources", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Manage forecasts" }).click();
  await page
    .getByRole("checkbox", { name: "Fetch UK Met Office", exact: true })
    .uncheck();
  await page
    .getByRole("checkbox", { name: "Fetch KNMI HARMONIE", exact: true })
    .check();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(
    page.getByText("8 of 8 sources", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Forecast rain comparison" }),
  ).toContainText("KNMI HARMONIE");
  await page.reload();
  await expect(
    page.getByText("8 of 8 sources", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Manage forecasts" }).click();
  await expect(
    page.getByRole("checkbox", { name: "Fetch UK Met Office", exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Fetch KNMI HARMONIE", exact: true }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  const mobileMenu = page.getByRole("button", {
    name: "Open saved circuits",
    exact: true,
  });
  if (await mobileMenu.isVisible()) await mobileMenu.click();
  await page
    .getByRole("navigation", { name: "Saved circuits" })
    .getByRole("button", { name: /Spa-Francorchamps/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Spa-Francorchamps", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Manage forecasts" }).click();
  await expect(
    page.getByRole("checkbox", { name: "Fetch UK Met Office", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Fetch KNMI HARMONIE", exact: true }),
  ).not.toBeChecked();
});

test("manual track temperature stays distinct from forecast air temperature and survives reload", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("8 of 8 sources", { exact: false }),
  ).toBeVisible();
  await page.getByText("Add track reading", { exact: true }).click();
  await page.getByLabel("Track temperature (°C)").fill("32.5");
  await page.getByRole("button", { name: "Save reading", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Track reading saved." }),
  ).toBeVisible();
  await expect(page.getByLabel("Conditions snapshot")).toContainText("32.5°C");
  await expect(page.getByLabel("Conditions snapshot")).toContainText("Manual");
  await page.reload();
  await expect(page.getByLabel("Conditions snapshot")).toContainText("32.5°C");
  const preferences = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("pitwall-preferences") ?? "{}"),
  );
  expect(Object.values(preferences.trackReadings)).toEqual([
    { temperature: 32.5, recordedAt: expect.any(String) },
  ]);
});

test("radar start and end restrict playback and reset to the available history", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("8 of 8 sources", { exact: false }),
  ).toBeVisible();
  const from = page.getByLabel("Radar start time"),
    to = page.getByLabel("Radar end time"),
    slider = page.getByRole("slider", { name: "Radar frame", exact: true });
  await expect(from.locator("option")).toHaveCount(4);
  const values = await from
    .locator("option")
    .evaluateAll((options) =>
      options
        .map((option) => (option as HTMLOptionElement).value)
        .filter(Boolean),
    );
  await from.selectOption(values[1]);
  await to.selectOption(values[2]);
  await expect(slider).toHaveAttribute("min", "1");
  await expect(slider).toHaveAttribute("max", "2");
  await page.getByRole("button", { name: "Play radar", exact: true }).click();
  await page.clock.runFor(1000);
  await expect(slider).toHaveValue("1");
  await to.selectOption(values[1]);
  await expect(
    page.getByRole("button", { name: "Play radar", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Full history", exact: true }).click();
  await expect(slider).toHaveAttribute("min", "0");
  await expect(slider).toHaveAttribute("max", "2");
});

test("missing ensemble and model rain never become a zero-percent dry outlook", async ({
  page,
  providers,
}) => {
  providers.rain = "missing";
  await page.goto("/");
  await expect(
    page.getByText("8 of 8 sources", { exact: false }),
  ).toBeVisible();
  const snapshot = page.getByLabel("Rain risk snapshot");
  await expect(snapshot.locator(".risk-probability>strong")).toHaveText("—");
  await expect(
    snapshot.getByRole("heading", { name: "Limited rain data" }),
  ).toBeVisible();
  await expect(snapshot).toContainText("Unknown");
});
