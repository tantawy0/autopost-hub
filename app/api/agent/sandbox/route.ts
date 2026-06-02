import { NextResponse, type NextRequest } from "next/server";

import { toSafeError } from "@/lib/auth";
import { getAgentSetupHint, getErrorMessage } from "@/lib/agent-errors";
import { agentClient } from "@/lib/agent-client";
import {
  requireAuthenticatedUser,
  requireWorkspacePermission,
} from "@/lib/server/authorization";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  if (!process.env.API_KEY_21ST) {
    return NextResponse.json({ error: "API_KEY_21ST missing" }, { status: 500 });
  }

  try {
    const client = createServerSupabaseClient();
    const user = await requireAuthenticatedUser(client, request);
    await requireWorkspacePermission(client, user, "ai", {
      action: "agent.sandbox",
      entityType: "agent_sandbox",
      request,
    });
  } catch (error) {
    const safe = toSafeError(error);
    return NextResponse.json(safe, { status: safe.status });
  }

  try {
    const sandbox = await agentClient.sandboxes.create({ agent: "my-agent" });

    return NextResponse.json({ sandboxId: sandbox.id });
  } catch (error) {
    const message = getErrorMessage(error);

    return NextResponse.json(
      {
        error: message,
        hint: getAgentSetupHint(message),
      },
      { status: /not found/i.test(message) ? 404 : 500 },
    );
  }
}
