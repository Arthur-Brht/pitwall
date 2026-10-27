import { test, expect } from "./fixtures";
import { open, createSession, sessions } from "./helpers";
test.use({ serviceWorkers: "allow" });
test("installed shell survives an offline reload with saved plans", async ({
  page,
  context,
  browserName,
  providers,
}) => {
  test.skip(
    browserName !== "chromium",
    "Offline reload is verified in Chromium; Firefox/WebKit network emulation bypasses service-worker navigation in this harness.",
  );
  await open(page);
  await createSession(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        ),
      );
  });
  providers.failed = true;
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Portimão", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("You are offline", { exact: false }),
  ).toBeVisible();
  expect(await sessions(page)).toHaveLength(1);
});
