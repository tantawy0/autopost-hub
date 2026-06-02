import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

export async function writeAuditLog(
  client: SupabaseClient,
  input: {
    workspaceId?: string | null;
    actorUserId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
    request?: NextRequest;
  },
) {
  await client
    .from("audit_logs")
    .insert([
      {
        workspace_id: input.workspaceId ?? null,
        actor_user_id: input.actorUserId ?? null,
        action: input.action,
        entity_type: input.entityType,
        entity_id: input.entityId ?? null,
        metadata: input.metadata ?? {},
        ip_address:
          input.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          input.request?.headers.get("x-real-ip") ??
          null,
        user_agent: input.request?.headers.get("user-agent") ?? null,
      },
    ])
    .then(() => undefined);
}
