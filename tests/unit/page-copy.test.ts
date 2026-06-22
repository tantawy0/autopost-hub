import assert from "node:assert/strict";
import test from "node:test";

import { getPageCopy, getPlatformName, getStatusLabel } from "@/lib/page-copy";

test("Arabic page copy covers the main product surfaces with natural labels", () => {
  const copy = getPageCopy("ar");

  assert.equal(copy.dashboard.title, "مركز قيادة المحتوى");
  assert.equal(copy.create.title, "كتابة بوست");
  assert.equal(copy.channels.connectInstagram, "ربط إنستجرام");
  assert.equal(copy.calendar.views.Month, "شهر");
  assert.equal(copy.queue.tabs[2], "المجدولة");
  assert.equal(copy.analytics.aiSummary, "ملخص ذكي");
  assert.equal(copy.media.dropTitle, "اسحب الملفات هنا أو اضغط للرفع");
  assert.equal(copy.settings.brandVoice, "صوت البراند");
});

test("shared UI labels localize platform and status copy", () => {
  assert.equal(getPlatformName("instagram", "ar"), "إنستجرام");
  assert.equal(getPlatformName("facebook", "ar"), "فيسبوك");
  assert.equal(getStatusLabel("publishing", "ar"), "جاري النشر");
  assert.equal(getStatusLabel("failed", "ar"), "فشل");
});
