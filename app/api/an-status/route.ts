import { NextResponse, type NextRequest } from "next/server";

import { toSafeError } from "@/lib/auth";
import { requireAuthenticatedUser } from "@/lib/server/authorization";
import { getAiProviderStatus } from "@/lib/server/ai/providers/registry";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const client = createServerSupabaseClient();
    await requireAuthenticatedUser(client, request);
  } catch (error) {
    const safe = toSafeError(error);
    return NextResponse.json(safe, { status: safe.status });
  }

  const status = getAiProviderStatus();

  return NextResponse.json({
    configured: status.twentyFirstConfigured,
    primaryProvider: status.primaryProvider,
    openRouterConfigured: status.openRouterConfigured,
    geminiConfigured: status.geminiConfigured,
    heuristicAvailable: status.heuristicAvailable,
  });
}
