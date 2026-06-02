import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { ingestAnalyticsMetrics } from "../../lib/server/services/analytics-ingest";
import { createFakeSupabase } from "./helpers/fake-supabase";

describe("analytics ingestion idempotency", () => {
  test("returns duplicate without rewriting rollups for the same daily payload", async () => {
    const client = createFakeSupabase({
      analytics_ingestion_receipts: [],
      analytics_daily: [],
      analytics_rollups: [],
      audit_logs: [],
    });
    const input = {
      workspaceId: "workspace-1",
      userId: "user-1",
      platform: "Instagram",
      metricDate: "2026-05-25",
      impressions: 1200,
      reach: 900,
      engagement: 86,
      clicks: 14,
      skipGrowthSnapshot: true,
      skipHourlyRollup: true,
    };

    const first = await ingestAnalyticsMetrics(client as never, input);
    const dailyRowsAfterFirst = client.tables.analytics_daily.length;
    const rollupRowsAfterFirst = client.tables.analytics_rollups.length;
    const receiptsAfterFirst = client.tables.analytics_ingestion_receipts.length;

    const second = await ingestAnalyticsMetrics(client as never, input);

    assert.equal(first.duplicate, false);
    assert.equal(second.duplicate, true);
    assert.deepEqual(second.metrics, first.metrics);
    assert.equal(client.tables.analytics_daily.length, dailyRowsAfterFirst);
    assert.equal(client.tables.analytics_rollups.length, rollupRowsAfterFirst);
    assert.equal(client.tables.analytics_ingestion_receipts.length, receiptsAfterFirst);
  });
});
