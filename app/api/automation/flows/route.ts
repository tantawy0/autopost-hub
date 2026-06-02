import { NextResponse, type NextRequest } from "next/server";

import { getBearerUser, toSafeError } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { ensureDefaultWorkspace } from "@/lib/workspaces";

export async function GET(request: NextRequest) {
  try {
    const client = createServerSupabaseClient();
    const user = await getBearerUser(client, request.headers.get("authorization"));
    const workspace = await ensureDefaultWorkspace(client, user);
    const { data, error } = await client
      .from("automation_flows")
      .select("id, name, trigger_type, status, definition, created_at, updated_at")
      .eq("workspace_id", workspace.workspaceId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json({ flows: data ?? [] });
  } catch (error) {
    const safe = toSafeError(error);

    return NextResponse.json(safe, { status: safe.status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = createServerSupabaseClient();
    const user = await getBearerUser(client, request.headers.get("authorization"));
    const workspace = await ensureDefaultWorkspace(client, user);
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      triggerType?: string;
      definition?: Record<string, unknown>;
    };

    if (!body.name || !body.triggerType) {
      return NextResponse.json({ message: "name and triggerType are required." }, { status: 400 });
    }

    const { data, error } = await client
      .from("automation_flows")
      .insert([
        {
          workspace_id: workspace.workspaceId,
          name: body.name,
          trigger_type: body.triggerType,
          definition: body.definition ?? {},
          created_by: user.id,
        },
      ])
      .select("id, name, trigger_type, status, definition, created_at, updated_at")
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ flow: data });
  } catch (error) {
    const safe = toSafeError(error);

    return NextResponse.json(safe, { status: safe.status });
  }
}
