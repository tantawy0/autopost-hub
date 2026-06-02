import assert from "node:assert/strict";
import test from "node:test";

import { summarizeAnalytics } from "../../lib/analytics";

test("summarizeAnalytics aggregates metrics and derives engagement rate", () => {
  assert.deepEqual(
    summarizeAnalytics([
      { impressions: 120, reach: 80, engagement: 12, clicks: 3 },
      { impressions: 180, reach: 120, engagement: 18, clicks: 5 },
    ]),
    {
      impressions: 300,
      reach: 200,
      engagement: 30,
      clicks: 8,
      engagementRate: 15,
    },
  );
});

test("summarizeAnalytics avoids division by zero", () => {
  assert.equal(
    summarizeAnalytics([{ impressions: 0, reach: 0, engagement: 4, clicks: 0 }]).engagementRate,
    0,
  );
});
