import { expect } from "./fixtures";
import type { Page } from "@playwright/test";
export async function open(page: Page) {
  await page.goto("/");
  await expect(
    page.getByText("8 of 8 sources", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
}
export async function planner(page: Page) {
  await page.getByRole("button", { name: "Sessions", exact: true }).click();
}
export async function preferences(page: Page) {
  const drawer = page.getByRole("complementary", {
    name: "Circuit and session",
  });
  if (await drawer.isVisible())
    await drawer
      .getByRole("button", { name: "Weather preferences", exact: true })
      .click();
  else
    await page
      .getByRole("button", { name: "Weather preferences", exact: true })
      .last()
      .click();
  await expect(page.getByRole("dialog")).toBeVisible();
}
export async function createSession(page: Page) {
  await planner(page);
  await page
    .getByLabel("Session name", { exact: true })
    .fill("Release test practice");
  await page.getByLabel("Session date", { exact: true }).fill("2026-10-26");
  await page.getByLabel("Session start time", { exact: true }).fill("11:00");
  await page.getByRole("button", { name: "Save session" }).click();
  await expect(
    page.getByText("Saved Release test practice", { exact: false }),
  ).toBeVisible();
}
export async function sessions(page: Page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("pitwall-sessions") || "[]"),
  );
}

export async function openSidebar(page: Page) {
  if (!(await page.getByLabel("Circuit", { exact: true }).isVisible()))
    await page
      .getByRole("button", { name: "Open saved circuits", exact: true })
      .click();
}
export async function chooseCircuit(page: Page, name: string) {
  await openSidebar(page);
  await page
    .getByLabel("Circuit", { exact: true })
    .selectOption({ label: name });
}
export async function setRun(
  page: Page,
  date: string,
  start: string,
  end: string,
) {
  await openSidebar(page);
  await page.getByLabel("Dashboard session").selectOption("custom");
  await page.getByLabel("Run date", { exact: true }).fill(date);
  await page.getByLabel("Run start time", { exact: true }).fill(start);
  await page.getByLabel("Run end time", { exact: true }).fill(end);
  await page.getByRole("button", { name: "Apply times", exact: true }).click();
}
