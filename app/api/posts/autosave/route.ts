import { NextResponse, type NextRequest } from "next/server";

import { toSafeError } from "@/lib/auth";
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
    const workspace = await requireWorkspacePermission(client, user, "content_edit", {
      action: "post.autosave",
      entityType: "draft_autosave",
      request,
    });
    await assertRateLimit(client, {
      key: getRateLimitKey(request, user.id),
      action: "draft_autosave",
      limit: 60,
      windowSeconds: 60,
    });
    const body = (await request.json().catch(() => ({}))) as {
      postId?: string | null;
      clientDraftId?: string | null;
      payload?: Record<string, unknown>;
    };
    const clientDraftId = body.clientDraftId || body.postId || "composer";

    const { data: existing } = await client
      .from("draft_autosaves")
      .select("version")
      .eq("user_id", user.id)
      .eq("client_draft_id", clientDraftId)
      .maybeSingle();

    const version = Number((existing as { version?: number } | null)?.version ?? 0) + 1;
    const { error } = await client
      .from("draft_autosaves")
      .upsert(
        [
          {
            workspace_id: workspace.workspaceId,
            user_id: user.id,
            post_id: body.postId ?? null,
            client_draft_id: clientDraftId,
            payload: body.payload ?? {},
            version,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: "user_id,client_draft_id" },
      )
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, version });
  } catch (error) {
    const safe = toSafeError(error);

    return NextResponse.json(safe, { status: safe.status });
  }
}
