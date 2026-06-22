import test from "node:test";
import assert from "node:assert/strict";

import {
  getDictionary,
  getGuideStepIndex,
  getGuideSteps,
  getShellRoutes,
  isRtlLocale,
  normalizeLocale,
} from "@/lib/i18n";

test("normalizes unsupported locales to English", () => {
  assert.equal(normalizeLocale("ar"), "ar");
  assert.equal(normalizeLocale("en"), "en");
  assert.equal(normalizeLocale("fr"), "en");
  assert.equal(normalizeLocale(null), "en");
});

test("Arabic shell copy uses RTL labels and searchable routes", () => {
  const dictionary = getDictionary("ar");
  const routes = getShellRoutes("ar");

  assert.equal(isRtlLocale("ar"), true);
  assert.equal(dictionary.topbar.createPost, "إنشاء بوست");
  assert.equal(routes.find((route) => route.to === "/channels")?.label, "القنوات");
  assert.match(routes.find((route) => route.to === "/create")?.keywords ?? "", /بوست/);
});

test("guide steps are ordered around the first-use publishing workflow", () => {
  const steps = getGuideSteps("en");

  assert.deepEqual(
    steps.map((step) => step.href),
    ["/dashboard", "/channels", "/create", "/queue", "/analytics"],
  );
  assert.equal(getGuideStepIndex(-10, steps.length), 0);
  assert.equal(getGuideStepIndex(50, steps.length), steps.length - 1);
});
