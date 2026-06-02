import { NextResponse, type NextRequest } from "next/server";

import { toSafeError } from "@/lib/auth";
import { buildMetaAuthorizationUrl } from "@/lib/providers/meta";
import {
  requireAuthenticatedUser,
  requireWorkspacePermission,
} from "@/lib/server/authorization";
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
  const searchParams = request.nextUrl.searchParams;
  const platform = searchParams.get("platform");
  const returnTo = searchParams.get("returnTo") ?? "/channels";
  const wantsJson = request.headers.get("accept")?.includes("application/json");

  try {
    if (platform !== "facebook" && platform !== "instagram") {
      return NextResponse.json(
        { message: "Unsupported Meta platform.", code: "unsupported_platform" },
        { status: 400 },
      );
    }

    const client = createServerSupabaseClient();
    const user = await requireAuthenticatedUser(client, request);
    await requireWorkspacePermission(client, user, "content_edit", {
      action: "oauth.login",
      entityType: "connected_account",
      request,
    });
    const authorizationUrl = buildMetaAuthorizationUrl(
      {
        userId: user.id,
        platform,
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

    return NextResponse.redirect(`${getAppUrl()}/channels?error=${safe.code}`);
  }
}
