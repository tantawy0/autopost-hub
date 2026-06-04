import { NextResponse, type NextRequest } from "next/server";

import { encryptOAuthToken } from "@/lib/oauth-tokens";
import {
  exchangeCodeForLinkedInToken,
  getLinkedInDisplayName,
  getLinkedInProfile,
  getLinkedInTokenExpiresAt,
  LinkedInProviderError,
  safeLinkedInErrorCode,
  toLinkedInAuthorUrn,
  verifyLinkedInState,
} from "@/lib/providers/linkedin";
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
    return NextResponse.redirect(`${appUrl}/channels?error=${safeLinkedInErrorCode(providerError)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/channels?error=callback`);
  }

  try {
    const payload = verifyLinkedInState(state);
    const token = await exchangeCodeForLinkedInToken(code, appUrl);
    const profile = await getLinkedInProfile(token.access_token);
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

    const authorUrn = toLinkedInAuthorUrn(profile.sub);
    await assertDiscoveredChannelCapacity(client, {
      workspaceId: workspace.workspaceId!,
      destinations: [{ platform: "LinkedIn", accountId: authorUrn }],
    });

    const { error } = await client.from("connected_accounts").upsert(
      [
        {
          user_id: payload.userId,
          workspace_id: workspace.workspaceId,
          platform: "LinkedIn",
          account_name: getLinkedInDisplayName(profile),
          account_id: authorUrn,
          page_id: null,
          instagram_business_account_id: null,
          access_token: null,
          refresh_token: null,
          token_ciphertext: encryptOAuthToken(token.access_token),
          refresh_token_ciphertext: encryptOAuthToken(token.refresh_token),
          token_expires_at: getLinkedInTokenExpiresAt(token),
          token_scopes: token.scope?.split(/\s+/).filter(Boolean) ?? [],
          provider_metadata: {
            profilePicture: profile.picture ?? null,
            memberSub: profile.sub,
            provider: "linkedin",
            authorType: "member",
          },
          status: "Connected",
          reconnect_required: false,
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: "user_id,platform,account_id" },
    );

    if (error) {
      throw new Error(error.message);
    }

    await writeAuditLog(client, {
      workspaceId: workspace.workspaceId,
      actorUserId: payload.userId,
      action: "oauth.connected",
      entityType: "connected_account",
      metadata: { platform: "linkedin", destinations: 1, authorType: "member" },
      request,
    });

    return NextResponse.redirect(`${appUrl}${payload.returnTo}?connected=linkedin`);
  } catch (error) {
    console.error("LinkedIn callback failed", {
      code: error instanceof LinkedInProviderError ? error.code : "callback",
    });

    const code = error instanceof LinkedInProviderError ? error.code : "callback";
    return NextResponse.redirect(`${appUrl}/channels?error=${safeLinkedInErrorCode(code)}`);
  }
}
