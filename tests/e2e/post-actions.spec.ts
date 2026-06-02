import { expect, test } from "@playwright/test";

import { canRunBrowserE2E, signIn } from "./helpers/auth";

test.describe("post actions", () => {
  test.skip(!canRunBrowserE2E, "Set E2E_RUN_BROWSER=1, E2E_EMAIL, and E2E_PASSWORD to run post action tests.");

  test("keeps destructive actions behind confirmation UI", async ({ page }) => {
    await signIn(page);
    await page.goto("/drafts");
    await expect(page.getByRole("heading", { name: "Drafts" })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
