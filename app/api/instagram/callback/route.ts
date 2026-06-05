import { NextResponse, type NextRequest } from "next/server";

import {
  exchangeCodeForInstagramToken,
  exchangeForLongLivedInstagramToken,
  getInstagramLoginProfile,
  getInstagramLoginScopes,
  InstagramLoginProviderError,
  isInstagramProfessionalAccount,
  safeInstagramLoginErrorCode,
  verifyInstagramLoginState,
} from "@/lib/providers/instagram-login";
import { hashMetaProviderUserId } from "@/lib/providers/meta";
import { encryptOAuthToken } from "@/lib/oauth-tokens";
import {
  auditAuthorizationDenied,
  isPermissionAllowed,
} from "@/lib/server/authorization";
import { writeAuditLog } from "@/lib/server/audit";
import { assertDiscoveredChannelCapacity } from "@/lib/server/billing/limits";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { ensureDefaultWorkspace } from "@/lib/workspaces";

function getRequestAppUrl(request: NextRequest): string {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  if (forwardedHost) {
    return `${forwardedProto ?? request.nextUrl.protocol.replace(":", "")}://${forwardedHost}`;
  }

  return request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const appUrl = getRequestAppUrl(request);
  const searchParams = request.nextUrl.searchParams;
  const providerError = searchParams.get("error");
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (providerError) {
    return NextResponse.redirect(`${appUrl}/channels?error=${safeInstagramLoginErrorCode(providerError)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/channels?error=instagram_callback`);
  }

  try {
    const payload = verifyInstagramLoginState(state);
    const shortLivedToken = await exchangeCodeForInstagramToken(code, appUrl);
    const token = await exchangeForLongLivedInstagramToken(shortLivedToken);
    const profile = await getInstagramLoginProfile(token);

    if (!isInstagramProfessionalAccount(profile)) {
      return NextResponse.redirect(`${appUrl}${payload.returnTo}?error=instagram_professional_required`);
    }

    const client = createServerSupabaseClient();
    const { data: userData } = await client.auth.admin.getUserById(payload.userId);
    const user = userData?.user ?? { id: payload.userId, email: undefined } as unknown as import("@supabase/supabase-js").User;
    const workspace = await ensureDefaultWorkspace(client, user);

    if (!isPermissionAllowed("content_edit", workspace.role)) {
      await auditAuthorizationDenied(client, {
        actorUserId: payload.userId,
        workspaceId: workspace.workspaceId,
        action: "oauth.connect",
        entityType: "connected_account",
        reason: "insufficient_role",
        permission: "content_edit",
        role: workspace.role,
        request,
      });

      return NextResponse.redirect(`${appUrl}/channels?error=forbidden`);
    }

    await assertDiscoveredChannelCapacity(client, {
      workspaceId: workspace.workspaceId!,
      destinations: [{ platform: "Instagram", accountId: profile.id }],
    });

    const expiresAt =
      token.expires_in && token.expires_in > 0
        ? new Date(Date.now() + token.expires_in * 1000).toISOString()
        : null;

    const { error } = await client
      .from("connected_accounts")
      .upsert(
        [
          {
            user_id: payload.userId,
            workspace_id: workspace.workspaceId,
            platform: "Instagram",
            account_name: profile.username ? `@${profile.username}` : profile.name ?? "Instagram Account",
            account_id: profile.id,
            page_id: null,
            instagram_business_account_id: profile.id,
            access_token: null,
            token_ciphertext: encryptOAuthToken(token.access_token),
            token_expires_at: expiresAt,
            token_scopes: getInstagramLoginScopes(),
            provider_user_id_hash: hashMetaProviderUserId(profile.id),
            provider_metadata: {
              connected_via: "instagram_login",
              auth_surface: "instagram",
              account_type: profile.account_type ?? null,
              username: profile.username ?? null,
            },
            status: "Connected",
            reconnect_required: false,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: "user_id,platform,account_id" },
      );

    if (error) throw new Error(error.message);

    await writeAuditLog(client, {
      workspaceId: workspace.workspaceId,
      actorUserId: payload.userId,
      action: "oauth.connected",
      entityType: "connected_account",
      metadata: { platform: "instagram", destinations: 1, connectedVia: "instagram_login" },
      request,
    });

    return NextResponse.redirect(`${appUrl}${payload.returnTo}?connected=instagram`);
  } catch (error) {
    console.error("Instagram callback failed", {
      code: error instanceof InstagramLoginProviderError ? error.code : "instagram_callback",
    });

    const code =
      error instanceof InstagramLoginProviderError
        ? error.code
        : error instanceof Error && error.name === "PlanLimitError"
          ? "plan_limit_exceeded"
          : "instagram_callback";

    return NextResponse.redirect(`${appUrl}/channels?error=${safeInstagramLoginErrorCode(code)}`);
  }
}
