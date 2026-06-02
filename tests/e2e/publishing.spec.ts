import { expect, test } from "@playwright/test";

import { canRunBrowserE2E, signIn } from "./helpers/auth";

test.describe("publishing outcomes", () => {
  test.skip(!canRunBrowserE2E, "Set E2E_RUN_BROWSER=1, E2E_EMAIL, and E2E_PASSWORD to run publishing tests.");

  test("shows published outcomes view", async ({ page }) => {
    await signIn(page);
    await page.goto("/published");
    await expect(page.getByRole("heading", { name: "Published" })).toBeVisible();
    await expect(page.getByText("Recent posts and their performance.")).toBeVisible();
  });
});
