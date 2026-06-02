import { NextResponse, type NextRequest } from "next/server";

import { toSafeError } from "@/lib/auth";
import { toSafeAnalyticsError } from "@/lib/server/analytics-errors";
import { enqueueAnalyticsIngestJob } from "@/lib/server/jobs/enqueue";
import { ingestAnalyticsMetrics } from "@/lib/server/services/analytics-ingest";
import {
  requireAuthenticatedUser,
  requireWorkspacePermission,
} from "@/lib/server/authorization";
import { assertRateLimit, getRateLimitKey } from "@/lib/server/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const client = createServerSupabaseClient();
    const user = await requireAuthenticatedUser(client, request);
    const workspace = await requireWorkspacePermission(client, user, "analytics", {
      action: "analytics.ingest",
      entityType: "analytics_daily",
      request,
    });
    await assertRateLimit(client, {
      key: getRateLimitKey(request, user.id),
      action: "analytics_ingest",
      limit: 120,
      windowSeconds: 60,
    });
    const body = (await request.json().catch(() => ({}))) as {
      platform?: string;
      metricDate?: string;
      impressions?: number;
      reach?: number;
      engagement?: number;
      clicks?: number;
    };

    if (!body.platform || !body.metricDate) {
      return NextResponse.json({ message: "platform and metricDate are required." }, { status: 400 });
    }

    if (!workspace.workspaceId) {
      return NextResponse.json({ message: "Workspace is required." }, { status: 400 });
    }

    const metricsInput = {
      workspaceId: workspace.workspaceId,
      userId: user.id,
      platform: body.platform,
      metricDate: body.metricDate,
      impressions: body.impressions,
      reach: body.reach,
      engagement: body.engagement,
      clicks: body.clicks,
    };

    const preferAsync = request.nextUrl.searchParams.get("async") === "1";

    if (preferAsync) {
      const queued = await enqueueAnalyticsIngestJob(client, metricsInput);
      return NextResponse.json({ ok: true, queued });
    }

    const result = await ingestAnalyticsMetrics(client, metricsInput);

    return NextResponse.json({ ok: true, duplicate: result.duplicate });
  } catch (error) {
    if (error instanceof Error && error.name === "AnalyticsException") {
      const safe = toSafeAnalyticsError(error);
      return NextResponse.json(safe, { status: safe.status });
    }

    const safe = toSafeError(error);

    return NextResponse.json(safe, { status: safe.status });
  }
}
