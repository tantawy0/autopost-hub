import { NextResponse, type NextRequest } from "next/server";

import { toSafeError } from "@/lib/auth";
import { buildLinkedInAuthorizationUrl } from "@/lib/providers/linkedin";
import {
  requireAuthenticatedUser,
  requireWorkspacePermission,
} from "@/lib/server/authorization";
import { assertOAuthStartCapacity } from "@/lib/server/billing/limits";
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

function toLinkedInLoginError(error: unknown) {
  if (
    error instanceof Error &&
    /LINKEDIN_CLIENT_(ID|SECRET) is not configured/i.test(error.message)
  ) {
    return {
      status: 503,
      message: "LinkedIn OAuth is not configured yet.",
      code: "provider_config",
    };
  }

  return toSafeError(error);
}

export async function GET(request: NextRequest) {
  const returnTo = normalizeReturnTo(request.nextUrl.searchParams.get("returnTo"));
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
      platform: "LinkedIn",
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
    const safe = toLinkedInLoginError(error);

    if (wantsJson) {
      return NextResponse.json(safe, { status: safe.status });
    }

    return NextResponse.redirect(`${getRequestAppUrl(request)}/channels?error=${safe.code}`);
  }
}
