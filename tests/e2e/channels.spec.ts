import { expect, test } from "@playwright/test";

import { canRunBrowserE2E, signIn } from "./helpers/auth";

test.describe("channels", () => {
  test.skip(!canRunBrowserE2E, "Set E2E_RUN_BROWSER=1, E2E_EMAIL, and E2E_PASSWORD to run channel tests.");

  test("shows live Meta options and TikTok placeholder", async ({ page }) => {
    await signIn(page);
    await page.goto("/channels");
    await expect(page.getByRole("heading", { name: "Channels" })).toBeVisible();
    await expect(page.getByText("Facebook")).toBeVisible();
    await expect(page.getByText("Instagram")).toBeVisible();
    await expect(page.getByText("TikTok")).toBeVisible();
    await expect(page.getByText("Disconnected").first()).toBeVisible();
  });
});
