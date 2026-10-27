import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig({
  ...base,
  testMatch: "documentation.spec.ts",
  testIgnore: [],
  outputDir: "test-results/docs",
  workers: 1,
  timeout: 60000,
  projects: [
    {
      name: "documentation",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1200 },
      },
    },
  ],
  use: {
    ...base.use,
    viewport: { width: 1440, height: 1200 },
    reducedMotion: "reduce",
    colorScheme: "light",
    video: { mode: "on", size: { width: 1440, height: 1200 } },
  },
});
