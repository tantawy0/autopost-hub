import "server-only";

import crypto from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { hashMetaProviderUserId } from "@/lib/providers/meta";

export type MetaDataDeletionStatus = "received" | "processed" | "no_match" | "failed";

export interface MetaDataDeletionResult {
  confirmationCode: string;
  status: MetaDataDeletionStatus;
  matchedConnectedAccountIds: string[];
  matchedUserIds: string[];
}

interface ConnectedAccountForDeletion {
  id: string;
  user_id: string;
  workspace_id: string | null;
  platform: "Facebook" | "Instagram";
}

function createConfirmationCode() {
  return `meta-del-${crypto.randomBytes(18).toString("base64url")}`;
}

export async function processMetaDataDeletionRequest(
  client: SupabaseClient,
  input: {
    providerUserId: string;
    appUrl: string;
    signedRequestIssuedAt?: number | null;
    confirmationCode?: string;
    now?: Date;
  },
): Promise<MetaDataDeletionResult> {
  const providerUserIdHash = hashMetaProviderUserId(input.providerUserId);
  const confirmationCode = input.confirmationCode ?? createConfirmationCode();
  const now = (input.now ?? new Date()).toISOString();
  const { data: accounts, error: accountError } = await client
    .from("connected_accounts")
    .select("id, user_id, workspace_id, platform")
    .eq("provider_user_id_hash", providerUserIdHash)
    .in("platform", ["Facebook", "Instagram"]);

  if (accountError) throw new Error(accountError.message);

  const matchedAccounts = ((accounts ?? []) as ConnectedAccountForDeletion[]);
  const matchedConnectedAccountIds = matchedAccounts.map((account) => account.id);
  const matchedUserIds = [...new Set(matchedAccounts.map((account) => account.user_id))];
  const status: MetaDataDeletionStatus = matchedAccounts.length > 0 ? "processed" : "no_match";

  if (matchedConnectedAccountIds.length > 0) {
    const { error: accountUpdateError } = await client
      .from("connected_accounts")
      .update({
        access_token: null,
        token_ciphertext: null,
        refresh_token_ciphertext: null,
        token_last_refreshed_at: null,
        token_expires_at: null,
        status: "Revoked",
        reconnect_required: true,
        updated_at: now,
      })
      .in("id", matchedConnectedAccountIds);

    if (accountUpdateError) throw new Error(accountUpdateError.message);

    for (const table of [
      "social_post_metric_snapshots",
      "engagement_threads",
      "social_posts",
    ]) {
      const { error } = await client.from(table).delete().in("connected_account_id", matchedConnectedAccountIds);

      if (error && !/does not exist|schema cache/i.test(error.message)) {
        throw new Error(error.message);
      }
    }
  }

  const { error: insertError } = await client.from("platform_data_deletion_requests").insert([
    {
      provider: "Meta",
      provider_user_id_hash: providerUserIdHash,
      confirmation_code: confirmationCode,
      status,
      matched_user_ids: matchedUserIds,
      matched_connected_account_ids: matchedConnectedAccountIds,
      raw_payload: {
        issued_at: input.signedRequestIssuedAt ?? null,
      },
      metadata: {
        status_url: `${input.appUrl}/data-deletion/status?code=${encodeURIComponent(confirmationCode)}`,
      },
      requested_at: now,
      processed_at: now,
    },
  ]);

  if (insertError) throw new Error(insertError.message);

  return {
    confirmationCode,
    status,
    matchedConnectedAccountIds,
    matchedUserIds,
  };
}

export async function getMetaDataDeletionStatus(client: SupabaseClient, confirmationCode: string) {
  const { data, error } = await client
    .from("platform_data_deletion_requests")
    .select("confirmation_code, provider, status, requested_at, processed_at")
    .eq("confirmation_code", confirmationCode)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data as
    | {
        confirmation_code: string;
        provider: string;
        status: MetaDataDeletionStatus;
        requested_at: string;
        processed_at: string | null;
      }
    | null;
}
