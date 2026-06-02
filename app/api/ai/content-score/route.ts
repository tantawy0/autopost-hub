import { NextResponse, type NextRequest } from "next/server";

import { toSafeError } from "@/lib/auth";
import { toSafeAiError } from "@/lib/server/ai/ai-errors";
import { scoreAndPersistContent } from "@/lib/server/ai/content-score-service";
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
    await requireWorkspacePermission(client, user, "ai", {
      action: "ai.content_score",
      entityType: "content_score",
      request,
    });
    await assertRateLimit(client, {
      key: getRateLimitKey(request, user.id),
      action: "content_score",
      limit: 40,
      windowSeconds: 60,
    });
    const body = (await request.json().catch(() => ({}))) as {
      caption?: string;
      platform?: string | null;
      postId?: string | null;
    };

    if (!body.caption?.trim()) {
      return NextResponse.json({ message: "Caption is required.", code: "caption_required" }, { status: 400 });
    }

    const score = await scoreAndPersistContent(client, user, {
      postId: body.postId,
      caption: body.caption,
      platform: body.platform,
    });

    return NextResponse.json(score);
  } catch (error) {
    if (error instanceof Error && error.name === "AiProviderException") {
      const safe = toSafeAiError(error);
      return NextResponse.json(safe, { status: safe.status });
    }

    const safe = toSafeError(error);

    return NextResponse.json(safe, { status: safe.status });
  }
}
