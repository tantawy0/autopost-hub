import { NextResponse, type NextRequest } from "next/server";

import { toSafeError } from "@/lib/auth";
import {
  assertConnectedAccountOwnedByUser,
  requireAuthenticatedUser,
  requireWorkspacePermission,
} from "@/lib/server/authorization";
import { writeAuditLog } from "@/lib/server/audit";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ connectedAccountId: string }> },
) {
  try {
    const { connectedAccountId } = await context.params;
    const client = createServerSupabaseClient();
    const user = await requireAuthenticatedUser(client, request);
    const workspace = await requireWorkspacePermission(client, user, "channel_manage", {
      action: "channel.disconnect",
      entityType: "connected_account",
      entityId: connectedAccountId,
      request,
    });
    await assertConnectedAccountOwnedByUser(client, user.id, connectedAccountId, request);
    const { data, error } = await client
      .from("connected_accounts")
      .update({
        status: "Disconnected",
        reconnect_required: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connectedAccountId)
      .eq("user_id", user.id)
      .select("id, status, platform, account_name")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return NextResponse.json(
        { message: "Connected account was not found.", code: "not_found" },
        { status: 404 },
      );
    }

    await writeAuditLog(client, {
      workspaceId: workspace.workspaceId,
      actorUserId: user.id,
      action: "oauth.disconnected",
      entityType: "connected_account",
      entityId: connectedAccountId,
      metadata: {
        platform: data.platform,
        accountName: data.account_name,
      },
      request,
    });

    return NextResponse.json({
      connectedAccountId: data.id,
      status: data.status,
    });
  } catch (error) {
    const safe = toSafeError(error);

    return NextResponse.json(safe, { status: safe.status });
  }
}
