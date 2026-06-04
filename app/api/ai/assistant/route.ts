import { NextResponse, type NextRequest } from "next/server";

import { toSafeError } from "@/lib/auth";
import { generateAssistantSuggestions } from "@/lib/server/ai/assistant-service";
import { toSafeAiError } from "@/lib/server/ai/ai-errors";
import {
  requireAuthenticatedUser,
  requireWorkspacePermission,
} from "@/lib/server/authorization";
import { assertPlanCapacity } from "@/lib/server/billing/limits";
import { assertRateLimit, getRateLimitKey } from "@/lib/server/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const client = createServerSupabaseClient();
    const user = await requireAuthenticatedUser(client, request);
    const workspace = await requireWorkspacePermission(client, user, "ai", {
      action: "ai.assistant",
      entityType: "ai_generation",
      request,
    });
    await assertRateLimit(client, {
      key: getRateLimitKey(request, user.id),
      action: "ai_assistant",
      limit: 30,
      windowSeconds: 60,
    });
    const body = (await request.json().catch(() => ({}))) as {
      caption?: string;
      prompt?: string;
      postId?: string | null;
    };

    if (!workspace.workspaceId) {
      return NextResponse.json({ message: "Workspace is required." }, { status: 400 });
    }

    await assertPlanCapacity(client, {
      workspaceId: workspace.workspaceId,
      metric: "aiRequestsMonthly",
    });

    const suggestions = await generateAssistantSuggestions(client, {
      workspaceId: workspace.workspaceId,
      userId: user.id,
      caption: body.caption,
      prompt: body.prompt,
      postId: body.postId,
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    if (error instanceof Error && error.name === "AiProviderException") {
      const safe = toSafeAiError(error);
      return NextResponse.json(safe, { status: safe.status });
    }

    const safe = toSafeError(error);

    return NextResponse.json(safe, { status: safe.status });
  }
}
