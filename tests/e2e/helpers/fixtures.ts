import type { Page } from "@playwright/test";

export async function clearLocalAuth(page: Page) {
  await page.context().clearCookies();
  await page.goto("/auth");
  await page.evaluate(() => window.localStorage.clear());
}

export function futureDateTimeLocal(minutesFromNow = 45): string {
  const date = new Date(Date.now() + minutesFromNow * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());

  return date.toISOString().slice(0, 16);
}
