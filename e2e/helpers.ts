import { expect } from "./fixtures";
import type { Page } from "@playwright/test";
export async function open(page: Page) {
  await page.goto("/");
  await expect(
    page.getByText("5 enabled feeds", { exact: false }),
  ).toBeVisible();
}
export async function planner(page: Page) {
  await page
    .getByRole("button", { name: "Session planner", exact: true })
    .click();
}
export async function preferences(page: Page) {
  await page
    .getByRole("button", { name: "Weather preferences", exact: true })
    .last()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
}
export async function createSession(page: Page) {
  await planner(page);
  await page
    .getByLabel("SESSION NAME", { exact: true })
    .fill("Release test practice");
  await page.getByLabel("Session date", { exact: true }).fill("2026-10-26");
  await page.getByLabel("Session start time", { exact: true }).fill("11:00");
  await page
    .getByRole("button", { name: "Save session on this device" })
    .click();
  await expect(
    page.getByText("Saved Release test practice", { exact: false }),
  ).toBeVisible();
}
export async function sessions(page: Page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("pitwall-sessions") || "[]"),
  );
}
