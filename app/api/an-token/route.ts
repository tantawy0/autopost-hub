import { createTokenHandler } from "@21st-sdk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { toSafeError } from "@/lib/auth";
import { getErrorMessage } from "@/lib/agent-errors";
import {
  requireAuthenticatedUser,
  requireWorkspacePermission,
} from "@/lib/server/authorization";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const tokenHandler = createTokenHandler({
  apiKey: process.env.API_KEY_21ST!,
});

export async function POST(request: NextRequest) {
  if (!process.env.API_KEY_21ST) {
    return NextResponse.json({ error: "API_KEY_21ST missing" }, { status: 500 });
  }

  try {
    const client = createServerSupabaseClient();
    const user = await requireAuthenticatedUser(client, request);
    await requireWorkspacePermission(client, user, "ai", {
      action: "agent.token",
      entityType: "agent_token",
      request,
    });
  } catch (error) {
    const safe = toSafeError(error);
    return NextResponse.json(safe, { status: safe.status });
  }

  try {
    return await tokenHandler(request);
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
