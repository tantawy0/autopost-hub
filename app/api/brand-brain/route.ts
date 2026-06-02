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
      .from("brand_profiles")
      .select("id, name, voice, audience, rules, created_at, updated_at")
      .eq("workspace_id", workspace.workspaceId)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    return NextResponse.json({ profiles: data ?? [] });
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
      voice?: Record<string, unknown>;
      audience?: Record<string, unknown>;
      rules?: Record<string, unknown>;
    };

    if (!body.name?.trim()) {
      return NextResponse.json({ message: "Brand name is required." }, { status: 400 });
    }

    const { data, error } = await client
      .from("brand_profiles")
      .insert([
        {
          workspace_id: workspace.workspaceId,
          name: body.name.trim(),
          voice: body.voice ?? {},
          audience: body.audience ?? {},
          rules: body.rules ?? {},
          created_by: user.id,
        },
      ])
      .select("id, name, voice, audience, rules, created_at, updated_at")
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ profile: data });
  } catch (error) {
    const safe = toSafeError(error);

    return NextResponse.json(safe, { status: safe.status });
  }
}
