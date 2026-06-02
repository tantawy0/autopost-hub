import { expect, test } from "@playwright/test";

import { futureDateTimeLocal } from "./helpers/fixtures";
import { canRunBrowserE2E, signIn } from "./helpers/auth";

test.describe("composer", () => {
  test.skip(!canRunBrowserE2E, "Set E2E_RUN_BROWSER=1, E2E_EMAIL, and E2E_PASSWORD to run composer tests.");

  test("validates required fields before scheduling", async ({ page }) => {
    await signIn(page);
    await page.goto("/create");
    await page.getByRole("button", { name: /^Schedule/ }).click();
    await expect(page.getByText(/add a caption or media/i)).toBeVisible();
  });

  test("accepts content and a future schedule time", async ({ page }) => {
    await signIn(page);
    await page.goto("/create");
    await page.getByPlaceholder("What's happening?").fill("Scheduled from E2E");
    await page.locator('input[type="datetime-local"]').fill(futureDateTimeLocal());
    await expect(page.getByRole("button", { name: /Save draft/i })).toBeEnabled();
  });
});
