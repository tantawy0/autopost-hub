import { expect, test } from "@playwright/test";

import { canRunBrowserE2E, signIn } from "./helpers/auth";

test.describe("Arabic onboarding guide", () => {
  test.skip(!canRunBrowserE2E, "Set E2E_RUN_BROWSER=1, E2E_EMAIL, and E2E_PASSWORD to run Arabic guide tests.");

  test("switches the authenticated shell to Arabic and walks the floating guide", async ({ page }) => {
    await signIn(page);

    await expect(page.getByRole("complementary", { name: "Getting started guide" })).toBeVisible();
    await page.getByRole("button", { name: "Switch to Arabic" }).click();
    await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe("rtl");
    await expect(page.getByRole("heading", { name: "مركز قيادة المحتوى" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "التنقل الرئيسي" })).toBeVisible();
    await expect(page.getByRole("link", { name: /القنوات/ })).toBeVisible();

    const guide = page.getByRole("complementary", { name: "دليل البدء" });
    await expect(guide).toBeVisible();
    await expect(guide).toContainText("خطوة 1/5");
    await guide.getByRole("button", { name: "التالي" }).click();
    await expect(guide).toContainText("خطوة 2/5");
    await guide.getByRole("link", { name: "افتح الخطوة" }).click();
    await expect(page).toHaveURL(/\/channels$/);
  });
});
