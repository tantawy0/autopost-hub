import { NextResponse, type NextRequest } from "next/server";

import {
  exchangeCodeForMetaToken,
  exchangeForLongLivedMetaToken,
  listMetaDestinations,
  MetaProviderError,
  safeMetaErrorCode,
  verifyMetaState,
} from "@/lib/providers/meta";
import { summarizeMetaDestinationDiscovery } from "@/lib/providers/meta-diagnostics";
import { encryptOAuthToken } from "@/lib/oauth-tokens";
import {
  auditAuthorizationDenied,
  isPermissionAllowed,
} from "@/lib/server/authorization";
import { writeAuditLog } from "@/lib/server/audit";
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
    return NextResponse.redirect(`${appUrl}/channels?error=${safeMetaErrorCode(providerError)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/channels?error=callback`);
  }

  try {
    const payload = verifyMetaState(state);
    const shortLivedToken = await exchangeCodeForMetaToken(code, appUrl);
    const token = await exchangeForLongLivedMetaToken(shortLivedToken);
    const discoveredDestinations = await listMetaDestinations(token);
    const discovery = summarizeMetaDestinationDiscovery(discoveredDestinations, payload.platform);
    const destinations = discoveredDestinations.filter((destination) => {
      if (payload.platform === "instagram") return destination.platform === "Instagram";
      if (payload.platform === "facebook") return destination.platform === "Facebook";

      return false;
    });

    if (destinations.length === 0) {
      const errorCode = discovery.errorCode ?? "no_eligible_accounts";

      return NextResponse.redirect(`${appUrl}${payload.returnTo}?error=${errorCode}`);
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
    const rows = destinations.map((destination) => ({
      user_id: payload.userId,
      workspace_id: workspace.workspaceId,
      platform: destination.platform,
      account_name: destination.accountName,
      account_id: destination.accountId,
      page_id: destination.pageId ?? null,
      instagram_business_account_id: destination.instagramBusinessAccountId ?? null,
      access_token: null,
      token_ciphertext: encryptOAuthToken(destination.accessToken),
      token_expires_at: destination.tokenExpiresAt ?? null,
      status: "Connected",
      reconnect_required: false,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await client
      .from("connected_accounts")
      .upsert(rows, { onConflict: "user_id,platform,account_id" });

    if (error) {
      throw new Error(error.message);
    }

    await writeAuditLog(client, {
      workspaceId: workspace.workspaceId,
      actorUserId: payload.userId,
      action: "oauth.connected",
      entityType: "connected_account",
      metadata: { platform: payload.platform, destinations: destinations.length },
      request,
    });

    return NextResponse.redirect(`${appUrl}${payload.returnTo}?connected=${payload.platform}`);
  } catch (error) {
    console.error("Meta callback failed", {
      code: error instanceof MetaProviderError ? error.code : "callback",
    });

    const code = error instanceof MetaProviderError ? error.code : "callback";
    return NextResponse.redirect(`${appUrl}/channels?error=${safeMetaErrorCode(code)}`);
  }
}
