import { NextResponse, type NextRequest } from "next/server";

import { toSafeError } from "@/lib/auth";
import { buildInstagramLoginAuthorizationUrl } from "@/lib/providers/instagram-login";
import {
  requireAuthenticatedUser,
  requireWorkspacePermission,
} from "@/lib/server/authorization";
import { assertOAuthStartCapacity } from "@/lib/server/billing/limits";
import { createServerSupabaseClient, getAppUrl } from "@/lib/supabase-server";

function getRequestAppUrl(request: NextRequest): string {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  if (forwardedHost) {
    return `${forwardedProto ?? request.nextUrl.protocol.replace(":", "")}://${forwardedHost}`;
  }

  return request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get("returnTo") ?? "/channels";
  const wantsJson = request.headers.get("accept")?.includes("application/json");

  try {
    const client = createServerSupabaseClient();
    const user = await requireAuthenticatedUser(client, request);
    const workspace = await requireWorkspacePermission(client, user, "content_edit", {
      action: "oauth.login",
      entityType: "connected_account",
      request,
    });

    await assertOAuthStartCapacity(client, {
      workspaceId: workspace.workspaceId!,
      platform: "Instagram",
    });

    const authorizationUrl = buildInstagramLoginAuthorizationUrl(
      {
        userId: user.id,
        returnTo,
        nonce: crypto.randomUUID(),
      },
      getRequestAppUrl(request),
    );

    if (wantsJson) return NextResponse.json({ url: authorizationUrl });

    return NextResponse.redirect(authorizationUrl);
  } catch (error) {
    const safe = toSafeError(error);

    if (wantsJson) return NextResponse.json(safe, { status: safe.status });

    return NextResponse.redirect(`${getAppUrl()}/channels?error=${safe.code}`);
  }
}
