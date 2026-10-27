import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/desktop.spec.ts",
  workers: 1,
  timeout: 60000,
  use: { baseURL: "http://localhost:4175" },
  reporter: "list",
});
