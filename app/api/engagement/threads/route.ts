import { NextResponse, type NextRequest } from "next/server";

import { getBearerUser, toSafeError } from "@/lib/auth";
import { ensureDefaultWorkspace } from "@/lib/workspaces";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const client = createServerSupabaseClient();
    const user = await getBearerUser(client, request.headers.get("authorization"));
    const workspace = await ensureDefaultWorkspace(client, user);
    const { data, error } = await client
      .from("engagement_threads")
      .select("id, platform, author_name, status, sentiment, last_message_at, created_at")
      .eq("user_id", user.id)
      .eq("workspace_id", workspace.workspaceId)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(50);

    if (error) throw new Error(error.message);

    return NextResponse.json({ threads: data ?? [] });
  } catch (error) {
    const safe = toSafeError(error);

    return NextResponse.json(safe, { status: safe.status });
  }
}
