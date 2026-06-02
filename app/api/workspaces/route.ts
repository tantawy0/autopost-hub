import { NextResponse, type NextRequest } from "next/server";

import { getBearerUser, toSafeError } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { ensureDefaultWorkspace } from "@/lib/workspaces";

export async function GET(request: NextRequest) {
  try {
    const client = createServerSupabaseClient();
    const user = await getBearerUser(client, request.headers.get("authorization"));
    const workspace = await ensureDefaultWorkspace(client, user);

    return NextResponse.json({ workspace });
  } catch (error) {
    const safe = toSafeError(error);

    return NextResponse.json(safe, { status: safe.status });
  }
}
