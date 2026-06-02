import { expect, test } from "@playwright/test";

import { canRunBrowserE2E, signIn } from "./helpers/auth";

test.describe("publishing isolation", () => {
  test.skip(!canRunBrowserE2E, "Set E2E_RUN_BROWSER=1 and two test users to run publishing isolation tests.");

  test("does not expose another user's publishing attempts in UI", async ({ page }) => {
    await signIn(page);
    await page.goto("/published");
    await expect(page.getByText(/server secret|access_token|service role/i)).toHaveCount(0);
  });
});
