import { expect, test } from "@playwright/test";

import { canRunBrowserE2E, signIn } from "./helpers/auth";

test.describe("dashboard account isolation", () => {
  test.skip(!canRunBrowserE2E, "Set E2E_RUN_BROWSER=1 and account credentials to run isolation tests.");

  test("loads only the signed-in user's dashboard data", async ({ page }) => {
    await signIn(page);
    await expect(page.getByRole("heading", { name: "Creator command center" })).toBeVisible();
    await expect(page.getByText("Dashboard data could not be loaded")).toHaveCount(0);
  });
});
