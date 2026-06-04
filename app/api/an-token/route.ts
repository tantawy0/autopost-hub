import { NextResponse, type NextRequest } from "next/server";

import { toSafeError } from "@/lib/auth";
import { getErrorMessage } from "@/lib/agent-errors";
import {
  requireAuthenticatedUser,
  requireWorkspacePermission,
} from "@/lib/server/authorization";
import { createServerSupabaseClient } from "@/lib/supabase-server";

type TokenRequestBody = {
  agent?: string;
};

async function exchangeAgentToken({
  apiKey,
  agent,
  userId,
}: {
  apiKey: string;
  agent?: string;
  userId: string;
}) {
  const response = await fetch("https://relay.an.dev/v1/tokens", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      agents: agent ? [agent] : undefined,
      expiresIn: "1h",
    }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Agent token exchange failed: ${response.status}`);
  }

  return response.json() as Promise<{ token: string; expiresAt: string }>;
}

export async function POST(request: NextRequest) {
  let userId: string;

  try {
    const client = createServerSupabaseClient();
    const user = await requireAuthenticatedUser(client, request);
    await requireWorkspacePermission(client, user, "ai", {
      action: "agent.token",
      entityType: "agent_token",
      request,
    });
    userId = user.id;
  } catch (error) {
    const safe = toSafeError(error);
    return NextResponse.json(safe, { status: safe.status });
  }

  const apiKey = process.env.API_KEY_21ST;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Agent token provider is not configured.", code: "agent_not_configured" },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as TokenRequestBody;
    const token = await exchangeAgentToken({
      apiKey,
      agent: body.agent,
      userId,
    });

    return NextResponse.json(token);
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
