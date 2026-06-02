import { NextResponse, type NextRequest } from "next/server";

import { getBearerUser, toSafeError } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const client = createServerSupabaseClient();
    const user = await getBearerUser(client, request.headers.get("authorization"));
    const { data, error } = await client
      .from("notifications")
      .select("id, title, body, notification_type, grouped_key, read_at, created_at, metadata")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);

    return NextResponse.json({ notifications: data ?? [] });
  } catch (error) {
    const safe = toSafeError(error);

    return NextResponse.json(safe, { status: safe.status });
  }
}
