import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { decryptSecret, encryptSecret } from "@/lib/server/secrets";
import { exchangeForLongLivedMetaToken } from "@/lib/providers/meta";
import { refreshLongLivedInstagramToken } from "@/lib/providers/instagram-login";
import { PublishingException, PublishErrorCode } from "@/lib/publishing-errors";
import { writeAuditLog } from "@/lib/server/audit";

export type TokenAccountRow = {
  id: string;
  platform: string;
  user_id?: string;
  workspace_id?: string | null;
  access_token?: string | null;
  refresh_token?: string | null;
  token_ciphertext?: string | null;
  refresh_token_ciphertext?: string | null;
  token_expires_at?: string | null;
  provider_metadata?: Record<string, unknown> | null;
};

export function encryptOAuthToken(value: string | null | undefined): string | null {
  return encryptSecret(value);
}

export function getAccessToken(account: TokenAccountRow): string | null {
  return decryptSecret(account.token_ciphertext) ?? account.access_token ?? null;
}

export function getRefreshToken(account: TokenAccountRow): string | null {
  return decryptSecret(account.refresh_token_ciphertext) ?? account.refresh_token ?? null;
}

/**
 * Check if a token needs refresh
 * Proactively refresh if expires within 7 days
 */
function tokenNeedsRefresh(account: TokenAccountRow): boolean {
  if (!account.token_expires_at) return false;

  const expiresAt = new Date(account.token_expires_at).getTime();
  const refreshThreshold = 1000 * 60 * 60 * 24 * 7; // 7 days

  return Number.isFinite(expiresAt) && expiresAt - Date.now() < refreshThreshold;
}

/**
 * Check if a token is already expired
 */
function tokenIsExpired(account: TokenAccountRow): boolean {
  if (!account.token_expires_at) return false;

  const expiresAt = new Date(account.token_expires_at).getTime();

  return Number.isFinite(expiresAt) && expiresAt < Date.now();
}

/**
 * Verify token is valid before publishing
 * Raises exception if token cannot be used
 */
export async function verifyTokenBeforePublishing<T extends TokenAccountRow>(
  account: T,
): Promise<void> {
  const accessToken = getAccessToken(account);

  if (!accessToken) {
    throw new PublishingException(
      PublishErrorCode.INVALID_TOKEN,
      "No valid access token found for account",
      {
        retryable: true,
        metadata: { accountId: account.id },
      },
    );
  }

  if (tokenIsExpired(account)) {
    throw new PublishingException(
      PublishErrorCode.TOKEN_EXPIRED,
      "Access token has expired",
      {
        retryable: true,
        metadata: { accountId: account.id, expiresAt: account.token_expires_at },
      },
    );
  }
}

export async function refreshAccountTokenIfNeeded<T extends TokenAccountRow>(
  client: SupabaseClient,
  account: T,
): Promise<T & { access_token: string | null }> {
  const currentAccessToken = getAccessToken(account);

  if (!currentAccessToken || account.platform === "TikTok" || !tokenNeedsRefresh(account)) {
    return { ...account, access_token: currentAccessToken };
  }

  if (account.platform !== "Facebook" && account.platform !== "Instagram") {
    return { ...account, access_token: currentAccessToken };
  }

  try {
    const connectedVia = String(account.provider_metadata?.connected_via ?? "");
    const refreshed =
      account.platform === "Instagram" && connectedVia === "instagram_login"
        ? await refreshLongLivedInstagramToken(currentAccessToken)
        : await exchangeForLongLivedMetaToken({ access_token: currentAccessToken });
    const expiresAt =
      refreshed.expires_in && refreshed.expires_in > 0
        ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
        : account.token_expires_at ?? null;

    await client
      .from("connected_accounts")
      .update({
        token_ciphertext: encryptSecret(refreshed.access_token),
        access_token: null,
        token_expires_at: expiresAt,
        token_last_refreshed_at: new Date().toISOString(),
        status: "Connected",
        reconnect_required: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id);

    // Log successful token refresh
    await writeAuditLog(client, {
      workspaceId: account.workspace_id,
      actorUserId: account.user_id,
      action: "oauth_token.refreshed",
      entityType: "connected_account",
      entityId: account.id,
      metadata: {
        platform: account.platform,
        expiresAt,
      },
    }).catch(() => {
      // Ignore audit log failures
    });

    return { ...account, access_token: refreshed.access_token, token_expires_at: expiresAt };
  } catch {
    // Mark account as expired and requiring reconnection
    await client
      .from("connected_accounts")
      .update({
        status: "Expired",
        reconnect_required: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id);

    // Log token refresh failure
    await writeAuditLog(client, {
      workspaceId: account.workspace_id,
      actorUserId: account.user_id,
      action: "oauth_token.refresh_failed",
      entityType: "connected_account",
      entityId: account.id,
      metadata: {
        platform: account.platform,
        errorCode: "provider_refresh_failed",
      },
    }).catch(() => {
      // Ignore audit log failures
    });

    return { ...account, access_token: currentAccessToken };
  }
}
