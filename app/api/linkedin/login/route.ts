import { NextResponse, type NextRequest } from "next/server";

import { toSafeError } from "@/lib/auth";
import { buildLinkedInAuthorizationUrl } from "@/lib/providers/linkedin";
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

function normalizeReturnTo(value: string | null): string {
  return value?.startsWith("/") ? value : "/channels";
}

export async function GET(request: NextRequest) {
  const returnTo = normalizeReturnTo(request.nextUrl.searchParams.get("returnTo"));
  const wantsJson = request.headers.get("accept")?.includes("application/json");

  try {
    const client = createServerSupabaseClient();
    const user = await requireAuthenticatedUser(client, request);
    await requireWorkspacePermission(client, user, "content_edit", {
      action: "oauth.login",
      entityType: "connected_account",
      request,
    });
    const authorizationUrl = buildLinkedInAuthorizationUrl(
      {
        userId: user.id,
        returnTo,
        nonce: crypto.randomUUID(),
      },
      getRequestAppUrl(request),
    );

    if (wantsJson) {
      return NextResponse.json({ url: authorizationUrl });
    }

    return NextResponse.redirect(authorizationUrl);
  } catch (error) {
    const safe = toSafeError(error);

    if (wantsJson) {
      return NextResponse.json(safe, { status: safe.status });
    }

    return NextResponse.redirect(`${getRequestAppUrl(request)}/channels?error=${safe.code}`);
  }
}
