import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "./fixtures";
import { open, preferences, setRun } from "./helpers";

test("appearance follows the system and explicit choices survive reload", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await open(page);
  const root = page.locator("html");
  await expect(root).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(root).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(root).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(root).toHaveAttribute("data-theme", "dark");
  await preferences(page);
  await page.getByRole("button", { name: "System", exact: true }).click();
  await expect(root).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(root).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Light", exact: true }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.reload();
  await expect(root).toHaveAttribute("data-theme", "light");
  await expect(
    page.getByRole("button", { name: "Switch to dark mode" }),
  ).toBeVisible();
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    "#f6f6f3",
  );
});

for (const theme of ["light", "dark"] as const) {
  test(`${theme} mode keeps all views and dialogs readable and within the viewport`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ colorScheme: theme });
    await open(page);
    for (const view of ["Dashboard", "Sessions", "Models", "History"]) {
      await page.getByRole("button", { name: view, exact: true }).click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      await testInfo.attach(`axe-${theme}-${view}`, {
        body: JSON.stringify(audit.violations),
        contentType: "application/json",
      });
      expect(
        audit.violations
          .filter((v) => v.impact === "serious" || v.impact === "critical")
          .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      ).toEqual([]);
    }
    await preferences(page);
    const audit = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      audit.violations
        .filter((v) => v.impact === "serious" || v.impact === "critical")
        .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
    ).toEqual([]);
  });
}

for (const rain of ["missing", "partial"] as const) {
  test(`${rain} rainfall never produces a dry 24-hour headline`, async ({
    page,
    providers,
  }) => {
    providers.rain = rain;
    await open(page);
    if (rain === "partial") {
      await setRun(page, "2026-10-26", "18:00", "20:00");
      await page
        .getByRole("button", { name: "Close circuit and session sidebar" })
        .click();
    }
    await expect(page.getByLabel("Rain risk snapshot")).toContainText(
      "incomplete",
    );
    await expect(page.getByLabel("Rain risk snapshot")).not.toContainText(
      "No hourly rain forecast",
    );
  });
}
