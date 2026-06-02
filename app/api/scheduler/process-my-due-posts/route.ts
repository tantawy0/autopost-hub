import { NextResponse, type NextRequest } from "next/server";

import { toSafeError } from "@/lib/auth";
import { processDuePosts } from "@/lib/publishing";
import {
  requireAuthenticatedUser,
  requireWorkspacePermission,
} from "@/lib/server/authorization";
import { assertRateLimit, getRateLimitKey } from "@/lib/server/rate-limit";
import { parseOperationalLimit } from "@/lib/server/operational-input";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const client = createServerSupabaseClient();
    const user = await requireAuthenticatedUser(client, request);
    await requireWorkspacePermission(client, user, "schedule", {
      action: "scheduler.process_my_due_posts",
      entityType: "scheduler",
      request,
    });
    await assertRateLimit(client, {
      key: getRateLimitKey(request, user.id),
      action: "process_my_due_posts",
      limit: 20,
      windowSeconds: 60,
    });
    const body = (await request.json().catch(() => ({}))) as { limit?: number };
    const limit = parseOperationalLimit(body.limit, 10);
    const result = await processDuePosts(client, limit, false, user.id);

    return NextResponse.json(result);
  } catch (error) {
    const safe = toSafeError(error);

    return NextResponse.json(safe, { status: safe.status });
  }
}
