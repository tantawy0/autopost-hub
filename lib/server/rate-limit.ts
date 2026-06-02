import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

export class RateLimitError extends Error {
  constructor(message = "Too many requests. Try again shortly.") {
    super(message);
    this.name = "RateLimitError";
  }
}

export function getRateLimitKey(request: NextRequest, userId?: string | null) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  return userId ? `user:${userId}` : `ip:${ip}`;
}

export async function assertRateLimit(
  client: SupabaseClient,
  input: {
    key: string;
    action: string;
    limit: number;
    windowSeconds: number;
  },
) {
  const since = new Date(Date.now() - input.windowSeconds * 1000).toISOString();
  const { count, error } = await client
    .from("rate_limit_events")
    .select("id", { count: "exact", head: true })
    .eq("key", input.key)
    .eq("action", input.action)
    .gte("occurred_at", since);

  if (error) return;

  if ((count ?? 0) >= input.limit) {
    throw new RateLimitError();
  }

  await client
    .from("rate_limit_events")
    .insert([{ key: input.key, action: input.action }])
    .then(() => undefined);
}
