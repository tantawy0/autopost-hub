import { expect, test } from "@playwright/test";

import { canRunBrowserE2E, signIn } from "./helpers/auth";

test.describe("media validation", () => {
  test.skip(!canRunBrowserE2E, "Set E2E_RUN_BROWSER=1, E2E_EMAIL, and E2E_PASSWORD to run media validation tests.");

  test("shows upload controls and destination-aware guidance", async ({ page }) => {
    await signIn(page);
    await page.goto("/media");
    await expect(page.getByText("Drop files here or click to upload")).toBeVisible();
    await expect(page.getByText(/up to 200MB/i)).toBeVisible();
  });
});
