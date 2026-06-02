import { type NextRequest, NextResponse } from "next/server";

import { toSafeError } from "@/lib/auth";
import { getAgentSetupHint, getErrorMessage } from "@/lib/agent-errors";
import { agentClient } from "@/lib/agent-client";
import {
  requireAuthenticatedUser,
  requireWorkspacePermission,
} from "@/lib/server/authorization";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const sandboxId = request.nextUrl.searchParams.get("sandboxId");

  if (!sandboxId) {
    return NextResponse.json({ error: "sandboxId required" }, { status: 400 });
  }

  try {
    const client = createServerSupabaseClient();
    const user = await requireAuthenticatedUser(client, request);
    await requireWorkspacePermission(client, user, "ai", {
      action: "agent.threads.list",
      entityType: "agent_thread",
      request,
    });
  } catch (error) {
    const safe = toSafeError(error);
    return NextResponse.json(safe, { status: safe.status });
  }

  try {
    const threads = await agentClient.threads.list({ sandboxId });

    return NextResponse.json(threads);
  } catch (error) {
    const message = getErrorMessage(error);

    return NextResponse.json({ error: message, hint: getAgentSetupHint(message) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { sandboxId?: string; name?: string };

  if (!body.sandboxId) {
    return NextResponse.json({ error: "sandboxId required" }, { status: 400 });
  }

  try {
    const client = createServerSupabaseClient();
    const user = await requireAuthenticatedUser(client, request);
    await requireWorkspacePermission(client, user, "ai", {
      action: "agent.threads.create",
      entityType: "agent_thread",
      request,
    });
  } catch (error) {
    const safe = toSafeError(error);
    return NextResponse.json(safe, { status: safe.status });
  }

  try {
    const thread = await agentClient.threads.create({
      sandboxId: body.sandboxId,
      name: body.name ?? "AutoPost Assistant",
    });

    return NextResponse.json(thread);
  } catch (error) {
    const message = getErrorMessage(error);

    return NextResponse.json({ error: message, hint: getAgentSetupHint(message) }, { status: 500 });
  }
}
