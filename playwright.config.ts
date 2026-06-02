import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3137";
const shouldStartServer = process.env.E2E_START_SERVER === "1";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: shouldStartServer
    ? {
        command: "npm run start -- --port 3137",
        url: baseURL,
        reuseExistingServer: Boolean(process.env.E2E_BASE_URL),
        timeout: 120_000,
      }
    : undefined,
});
