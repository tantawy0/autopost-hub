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

  test("starts channel OAuth from the copied UI connect action", async ({ page }) => {
    const callbackUrl = `${process.env.E2E_BASE_URL ?? "http://127.0.0.1:3137"}/channels?connected=instagram`;

    await page.route(/\/api\/meta\/login\?platform=instagram&returnTo=\/channels$/, async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ url: callbackUrl }),
      });
    });

    await signIn(page);
    await page.goto("/channels");
    await page.getByRole("button", { name: /connect channel/i }).click();
    await page.waitForURL(callbackUrl);
  });
});
