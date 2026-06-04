import { expect, test } from "@playwright/test";

import { canRunBrowserE2E, expectAuthenticatedAppShell, signIn } from "./helpers/auth";
import { clearLocalAuth } from "./helpers/fixtures";

test.describe("authentication", () => {
  test.skip(!canRunBrowserE2E, "Set E2E_RUN_BROWSER=1, E2E_EMAIL, and E2E_PASSWORD to run browser E2E tests.");

  test("redirects protected dashboard users to auth when signed out", async ({ page }) => {
    await clearLocalAuth(page);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth\?next=%2Fdashboard/);
  });

  test("signs in and signs out with configured test credentials", async ({ page }) => {
    await signIn(page);
    await expectAuthenticatedAppShell(page);
  });
});
