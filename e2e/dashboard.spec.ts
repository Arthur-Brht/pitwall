import { test, expect, TEST_TIME } from "./fixtures";

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
    snapshot.getByRole("heading", { name: /Light rain possible/ }),
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

test("the conditions snapshot keeps air, humidity and wind without the retired track-temperature form", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("8 of 8 sources", { exact: false }),
  ).toBeVisible();
  await expect(page.getByLabel("Conditions snapshot")).toContainText(
    "Air temperature",
  );
  await expect(page.getByLabel("Conditions snapshot")).toContainText(
    "Humidity",
  );
  await expect(page.getByLabel("Conditions snapshot")).toContainText("Wind");
  await expect(
    page.getByText("Track temperature", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Add track reading", { exact: true }),
  ).toHaveCount(0);
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
  await page.getByText("Playback range & map options", { exact: true }).click();
  await expect(from.locator("option")).toHaveCount(14);
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
  await page.clock.runFor(450);
  await expect(slider).toHaveValue("1");
  await to.selectOption(values[1]);
  await expect(
    page.getByRole("button", { name: "Play radar", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Full history", exact: true }).click();
  await expect(slider).toHaveAttribute("min", "0");
  await expect(slider).toHaveAttribute("max", "12");
});

test("native quarter-hour timing gives a rain window and leaves hourly fallback explicit", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("8 of 8 sources", { exact: false }),
  ).toBeVisible();
  await expect(page.getByLabel("15-minute rain timing")).toContainText(
    "15-minute regional data is unavailable here",
  );
  const menu = page.getByRole("button", {
    name: "Open saved circuits",
    exact: true,
  });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("navigation", { name: "Saved circuits" })
    .getByRole("button", { name: /Spa-Francorchamps/ })
    .click();
  await expect(page.getByLabel("Rain risk snapshot")).toContainText(
    "10:30–10:45",
  );
  await expect(page.getByLabel("15-minute rain timing")).toContainText(
    "DWD ICON-D2",
  );
  await expect(page.getByLabel("15-minute rain timing")).toContainText(
    "Météo-France AROME",
  );
  await expect(page.getByLabel("Rain risk snapshot")).not.toContainText(
    "This hour",
  );
});

test("radar keeps a complete displayed scan while a replacement loads and uses a taller map", async ({
  page,
}) => {
  let release: (() => void) | undefined;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/v2/radar/test-6600/**", async (route) => {
    await held;
    await route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="blue"/></svg>',
    });
  });
  try {
    await page.goto("/");
    await expect(page.getByLabel("Displayed radar time")).toHaveText("09:00");
    const map = await page.locator(".map-stage").boundingBox();
    expect(map!.width / map!.height).toBeLessThanOrEqual(1.6);
    const active = page.locator(".radar-scan");
    await page
      .getByRole("button", { name: "Previous radar scan", exact: true })
      .click();
    await expect(page.getByLabel("Displayed radar time")).toHaveText("09:00");
    expect(
      await active.evaluateAll((layers) =>
        layers.some(
          (layer) => Number((layer as HTMLElement).style.opacity) > 0,
        ),
      ),
    ).toBe(true);
    release!();
    await expect(page.getByLabel("Displayed radar time")).toHaveText("08:50");
    expect(await page.locator(".radar-scan").count()).toBeLessThanOrEqual(3);
  } finally {
    release!();
  }
});

test("rain charts distinguish light rainfall from a graph that merely fills its axis", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("8 of 8 sources", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Models", exact: true }).click();
  await page.getByLabel("Forecast hours displayed").selectOption("6");
  await expect(page.getByLabel("Rain intensity guide")).toContainText(
    "Heavy > 7.6 mm/h",
  );
  await expect(page.locator(".rain-chart-context")).toContainText(
    "Light rain · peak 0.7 mm/h",
  );
  await expect(page.getByLabel("Rain chart scale")).toHaveValue("auto");
  await expect(page.locator(".rain-chart-context")).toContainText(
    "zoomed within the light-rain range",
  );
});

test("refresh recovers a failed radar tile even when the latest frame timestamp has not changed", async ({
  page,
}) => {
  let offline = true;
  await page.route("**/v2/radar/test-7200/**", async (route) => {
    await route.fulfill(
      offline
        ? { status: 503, body: "Synthetic tile outage" }
        : {
            contentType: "image/svg+xml",
            body: '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"/>',
          },
    );
  });
  await page.goto("/");
  await expect(
    page
      .locator(".inline-warning")
      .filter({ hasText: "radar scan could not load" }),
  ).toBeVisible();
  await expect(page.getByLabel("Displayed radar time")).toHaveText("—");
  offline = false;
  await page
    .getByRole("button", { name: "Refresh radar", exact: true })
    .click();
  await expect(page.getByLabel("Displayed radar time")).toHaveText("09:00");
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
    snapshot.getByRole("heading", { name: "Rain outlook is incomplete." }),
  ).toBeVisible();
  await expect(snapshot).toContainText("Some rain data is missing.");
});

test("a native forecast stays visible during hourly outages and respects disabled sources", async ({
  page,
  providers,
}) => {
  providers.hourlyFailed = true;
  await page.goto("/");
  const menu = page.getByRole("button", {
    name: "Open saved circuits",
    exact: true,
  });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("navigation", { name: "Saved circuits" })
    .getByRole("button", { name: /Spa-Francorchamps/ })
    .click();
  await expect(page.getByLabel("15-minute rain timing")).toContainText(
    "DWD ICON-D2",
  );
  await expect(page.getByLabel("Rain risk snapshot")).toContainText(
    "10:30–10:45",
  );
  await page.getByRole("button", { name: "Manage forecasts" }).click();
  await page
    .getByRole("checkbox", { name: "Fetch DWD ICON", exact: true })
    .uncheck();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByLabel("15-minute rain timing")).not.toContainText(
    "DWD ICON-D2",
  );
});

test("dashboard window survives navigation and initializes the Models comparison", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("8 of 8 sources", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Dashboard forecast window").selectOption("6");
  await page.getByRole("button", { name: "Models", exact: true }).click();
  await expect(page.getByLabel("Forecast hours displayed")).toHaveValue("6");
  await expect(
    page
      .getByRole("region", { name: "Hourly rainfall comparison" })
      .locator("thead th"),
  ).toHaveCount(7);
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await expect(page.getByLabel("Dashboard forecast window")).toHaveValue("6");
});

test("Pause remains operable when radar metadata refresh fails during playback", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("Displayed radar time")).toHaveText("09:00");
  // Advance before starting playback so the test does not manufacture tile timeouts.
  await page.clock.fastForward(5 * 60 * 1000 - 1000);
  await page.getByRole("button", { name: "Play radar", exact: true }).click();
  await page.route("**/api.rainviewer.com/**", (route) =>
    route.fulfill({
      status: 503,
      json: { error: "Synthetic metadata outage" },
    }),
  );
  await page.clock.runFor(1000);
  await expect(
    page.locator(".inline-warning").filter({ hasText: /503/ }).first(),
  ).toBeVisible();
  const pause = page.getByRole("button", { name: "Pause radar", exact: true });
  await expect(pause).toBeEnabled();
  await pause.click();
  await expect(
    page.getByRole("button", { name: "Play radar", exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("Displayed radar time")).not.toHaveText("—");
  await page.unroute("**/api.rainviewer.com/**");
  await page
    .getByRole("button", { name: "Refresh radar", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Play radar", exact: true }),
  ).toBeEnabled();
});

test("a wet ensemble outlier stays visible even with a zero-percent middle estimate", async ({
  page,
}) => {
  const t = Math.floor(TEST_TIME.getTime() / 3600000) * 3600;
  await page.route("**/ensemble-api.open-meteo.com/**", (route) => {
    const wet =
      new URL(route.request().url()).searchParams.get("models") ===
      "gfs_seamless";
    const amounts = [0, 1, 2, 3].map(() => (wet ? 1 : 0));
    return route.fulfill({
      json: {
        hourly: {
          time: [0, 1, 2, 3].map((i) => t + i * 3600),
          precipitation: amounts,
          precipitation_member01: amounts,
        },
      },
    });
  });
  await page.goto("/");
  await expect(
    page.getByText("8 of 8 sources", { exact: false }),
  ).toBeVisible();
  const snapshot = page.getByLabel("Rain risk snapshot");
  await expect(snapshot.locator(".risk-probability>strong")).toHaveText("0%");
  await expect(snapshot.getByRole("heading")).toHaveText(
    "Rain remains possible.",
  );
  await expect(snapshot).toContainText("0–100%");
});
