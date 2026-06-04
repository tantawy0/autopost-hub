import { expect, test } from "@playwright/test";

import { canRunBrowserE2E, signIn } from "./helpers/auth";

test.describe("dashboard", () => {
  test.skip(!canRunBrowserE2E, "Set E2E_RUN_BROWSER=1, E2E_EMAIL, and E2E_PASSWORD to run dashboard tests.");

  test("shows dashboard sections and responsive navigation", async ({ page }) => {
    await signIn(page);
    await expect(page.getByRole("heading", { name: "Creator command center" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Getting started")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Today's queue")).toBeVisible({ timeout: 15_000 });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("navigation", { name: "Primary mobile" })).toBeVisible();
  });
});
