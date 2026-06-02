import { NextResponse, type NextRequest } from "next/server";

import { toSafeError } from "@/lib/auth";
import {
  buildMetaConnectionDiagnostics,
  buildMetaSetupDiagnostics,
} from "@/lib/providers/meta-diagnostics";
import {
  requireAuthenticatedUser,
  requireWorkspacePermission,
} from "@/lib/server/authorization";
import { createServerSupabaseClient } from "@/lib/supabase-server";

function getRequestAppUrl(request: NextRequest): string {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  if (forwardedHost) {
    return `${forwardedProto ?? request.nextUrl.protocol.replace(":", "")}://${forwardedHost}`;
  }

  return request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  try {
    const client = createServerSupabaseClient();
    const user = await requireAuthenticatedUser(client, request);
    await requireWorkspacePermission(client, user, "content_edit", {
      action: "meta.diagnostics",
      entityType: "connected_account",
      request,
    });

    const live = request.nextUrl.searchParams.get("live") === "1";
    const connectionDiagnostics = await buildMetaConnectionDiagnostics(client, user.id, { live });

    return NextResponse.json({
      setup: buildMetaSetupDiagnostics(getRequestAppUrl(request)),
      ...connectionDiagnostics,
    });
  } catch (error) {
    const safe = toSafeError(error);

    return NextResponse.json(safe, { status: safe.status });
  }
}
