import { test, expect } from "./fixtures";
import {
  open,
  openSidebar,
  chooseCircuit,
  setRun,
  createSession,
} from "./helpers";

test("session and buffers control the dashboard and Models, then survive reload", async ({
  page,
}) => {
  await open(page);
  await setRun(page, "2026-10-26", "13:15", "13:45");
  await expect(page.getByLabel("Run window")).toContainText("13:15");
  await expect(page.getByLabel("Run window")).toContainText(
    "15 min before · 15 min after",
  );
  await expect(page.getByLabel("Rain risk snapshot")).toContainText(
    "7 of 8 reporting hourly forecasts show rain during your run",
  );
  await expect(page.getByLabel("Forecast rain comparison")).toContainText(
    "13:00–14:00",
  );
  await page.getByLabel("Buffer before run").selectOption("30");
  await page
    .getByRole("button", { name: "Close circuit and session sidebar" })
    .click();
  await page.getByRole("button", { name: "Models", exact: true }).click();
  await expect(page.getByLabel("Forecast hours displayed")).toHaveValue("0");
  await expect(
    page
      .getByRole("region", { name: "Hourly rainfall comparison" })
      .locator("thead th"),
  ).toHaveCount(3);
  await page.reload();
  await expect(page.getByLabel("Run window")).toContainText("30 min before");
  await expect(page.getByLabel("Circuit", { exact: true })).not.toBeVisible();
});

test("the circuit drawer remembers its state and run choices are local to the circuit", async ({
  page,
}) => {
  await open(page);
  await expect(page.getByLabel("Circuit", { exact: true })).not.toBeVisible();
  await setRun(page, "2026-10-26", "13:15", "13:45");
  await page.reload();
  await expect(page.getByLabel("Circuit", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Run start time", { exact: true })).toHaveValue(
    "13:15",
  );
  await chooseCircuit(page, "Spa-Francorchamps");
  await expect(page.getByLabel("Run window")).toContainText("Next 3 hours");
  await chooseCircuit(page, "Portimão");
  await expect(page.getByLabel("Run window")).toContainText("13:15");
});

test("the next saved session becomes the focus and can be overridden", async ({
  page,
}) => {
  await open(page);
  await createSession(page);
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await expect(page.getByLabel("Run window")).toContainText(
    "Release test practice",
  );
  await openSidebar(page);
  await page.getByLabel("Dashboard session").selectOption("now");
  await page
    .getByRole("button", { name: "Close circuit and session sidebar" })
    .click();
  await expect(page.getByLabel("Run window")).toContainText("Next 3 hours");
});

test("forecast catalog selections persist per location and add regional forecasts", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "Manage forecasts" }).click();
  await page
    .getByRole("checkbox", { name: "Fetch UK Met Office", exact: true })
    .uncheck();
  await page
    .getByRole("checkbox", { name: "Fetch KNMI HARMONIE", exact: true })
    .check();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByLabel("Forecast rain comparison")).toContainText(
    "KNMI HARMONIE",
  );
  await page.reload();
  await page.getByRole("button", { name: "Manage forecasts" }).click();
  await expect(
    page.getByRole("checkbox", { name: "Fetch UK Met Office", exact: true }),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await chooseCircuit(page, "Spa-Francorchamps");
  await page
    .getByRole("button", { name: "Close circuit and session sidebar" })
    .click();
  await page.getByRole("button", { name: "Manage forecasts" }).click();
  await expect(
    page.getByRole("checkbox", { name: "Fetch UK Met Office", exact: true }),
  ).toBeChecked();
});

test("the simple snapshot shows run temperature and wind, with humidity and charts on demand", async ({
  page,
}) => {
  await open(page);
  const conditions = page.getByLabel("Conditions snapshot");
  await expect(conditions).toContainText("Air temperature");
  await expect(conditions).toContainText("Wind");
  await expect(conditions).not.toContainText("Humidity");
  await expect(
    page.getByText("Humidity during the window", { exact: true }),
  ).not.toBeVisible();
  await page
    .getByText("More detail · conditions, charts & forecast methods", {
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Humidity during the window", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Track temperature", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Overview", exact: true }),
  ).toHaveCount(0);
});

test("regional timing stays visible without replacing the main hourly timing group", async ({
  page,
}) => {
  await open(page);
  await chooseCircuit(page, "Spa-Francorchamps");
  await setRun(page, "2026-10-26", "10:30", "14:30");
  await page
    .getByRole("button", { name: "Close circuit and session sidebar" })
    .click();
  const snapshot = page.getByLabel("Rain risk snapshot");
  await expect(snapshot).toContainText("14:00–15:00");
  await expect(snapshot).toContainText("10:30–10:45");
  await expect(snapshot).toContainText("7 forecasts in this timing group");
  await expect(
    page.getByLabel("Forecast rain comparison").locator(".native-row"),
  ).toHaveCount(2);
});

test("native rows survive an hourly outage and respect disabled sources", async ({
  page,
  providers,
}) => {
  providers.hourlyFailed = true;
  await page.goto("/");
  await chooseCircuit(page, "Spa-Francorchamps");
  await page
    .getByRole("button", { name: "Close circuit and session sidebar" })
    .click();
  await expect(page.getByLabel("Forecast rain comparison")).toContainText(
    "DWD ICON-D2",
  );
  await expect(page.getByLabel("Rain risk snapshot")).toContainText(
    "10:30–10:45",
  );
  await expect(page.getByLabel("Rain risk snapshot")).toContainText(
    "Regional showers possible; hourly data unavailable.",
  );
  await expect(
    page.getByText("First regional signal", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Manage forecasts" }).click();
  await page
    .getByRole("checkbox", { name: "Fetch DWD ICON", exact: true })
    .uncheck();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByLabel("Forecast rain comparison")).not.toContainText(
    "DWD ICON-D2",
  );
});

test("clearing stays visible beyond the run buffer without hiding an unresolved wet source", async ({
  page,
}) => {
  await page.route("**/api.open-meteo.com/v1/forecast?**", async (route) => {
    const url = new URL(route.request().url());
    if (
      url.searchParams.get("models") !== "ecmwf_ifs025" ||
      url.searchParams.has("minutely_15")
    )
      return route.fallback();
    const start = Date.parse("2026-10-26T09:00:00Z") / 1000;
    const times = Array.from({ length: 97 }, (_, i) => start + i * 3600);
    await route.fulfill({
      json: {
        hourly: {
          time: times,
          temperature_2m: times.map(() => 18),
          precipitation: times.map((_, i) => (i >= 5 ? 1 : 0)),
        },
      },
    });
  });
  await open(page);
  await setRun(page, "2026-10-26", "13:15", "13:45");
  await page
    .getByRole("button", { name: "Close circuit and session sidebar" })
    .click();
  const clearing = page
    .getByText("Main clearing signal", { exact: true })
    .locator("..");
  await expect(clearing).toContainText("17:00–18:00");
  await expect(clearing).toContainText("6 of 7 wet hourly forecasts");
  await expect(clearing).toContainText("1 without a confirmed stop");
  await expect(clearing).toContainText("After the shown timeline");
  await expect(page.getByLabel("Forecast rain comparison")).toContainText(
    "13:00–14:00",
  );
});

test("regional-only rain supplies the main arrival and clearing facts while hourly timing remains explicit elsewhere", async ({
  page,
  providers,
}) => {
  providers.rain = "partial";
  await open(page);
  await chooseCircuit(page, "Spa-Francorchamps");
  await setRun(page, "2026-10-26", "10:30", "10:45");
  await page
    .getByRole("button", { name: "Close circuit and session sidebar" })
    .click();
  await expect(
    page.getByText("First regional signal", { exact: true }).locator(".."),
  ).toContainText("10:30–10:45");
  await expect(
    page.getByText("Main clearing signal", { exact: true }).locator(".."),
  ).toContainText("11:15–11:30");
  await expect(page.getByLabel("Rain risk snapshot")).toContainText(
    "Regional showers possible.",
  );
  await expect(page.getByLabel("Available rain timing")).toContainText(
    "15-min regional timing",
  );
  await chooseCircuit(page, "Portimão");
  await page
    .getByRole("button", { name: "Close circuit and session sidebar" })
    .click();
  await expect(page.getByLabel("Available rain timing")).toHaveText(
    "Hourly timing only · no 15-min data for this window",
  );
});

test("a later run automatically retains genuine quarter-hour rows beyond six hours with no added selector", async ({
  page,
}) => {
  await open(page);
  await chooseCircuit(page, "Spa-Francorchamps");
  await setRun(page, "2026-10-26", "19:15", "19:45");
  await page
    .getByRole("button", { name: "Close circuit and session sidebar" })
    .click();
  await expect(page.getByLabel("Available rain timing")).toContainText(
    "15-min regional timing",
  );
  await expect(
    page.getByLabel("Forecast rain comparison").locator(".native-row"),
  ).toHaveCount(2);
  await expect(
    page
      .getByLabel("Forecast rain comparison")
      .locator(".native-row")
      .first()
      .getByRole("button")
      .first(),
  ).toHaveAttribute("aria-label", /19:00–19:15/);
});

test("missing model and ensemble data never becomes a dry or zero-percent outlook", async ({
  page,
  providers,
}) => {
  providers.rain = "missing";
  await open(page);
  await expect(page.getByLabel("Rain risk snapshot")).toContainText(
    "Rain outlook incomplete",
  );
  await expect(page.locator(".ensemble-line")).toHaveCount(0);
});

test("hour-aligned ensemble bounds stay explicit for a short run", async ({
  page,
}) => {
  await open(page);
  await setRun(page, "2026-10-26", "13:15", "13:45");
  await page
    .getByRole("button", { name: "Close circuit and session sidebar" })
    .click();
  const ensemble = page.locator(".ensemble-line");
  await expect(ensemble).toContainText("50%");
  await expect(ensemble).toContainText("13:00–14:00 (surrounding whole hours)");
});

test("rain charts remain on demand with an intensity guide and a fitted scale", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "Models", exact: true }).click();
  await page.getByLabel("Forecast hours displayed").selectOption("6");
  await expect(page.getByLabel("Rain chart scale")).not.toBeVisible();
  await page
    .getByText("Rain chart · show more detail", { exact: true })
    .click();
  await expect(page.getByLabel("Rain intensity guide")).toContainText(
    "Heavy > 7.6 mm/h",
  );
  await expect(page.locator(".rain-chart-context")).toContainText(
    "Light rain · peak 0.7 mm/h",
  );
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
