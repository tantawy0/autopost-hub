import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { hashMetaProviderUserId } from "@/lib/providers/meta";

export async function processInstagramDeauthorizationRequest(
  client: SupabaseClient,
  input: { providerUserId: string; now?: Date },
) {
  const providerUserIdHash = hashMetaProviderUserId(input.providerUserId);
  const now = (input.now ?? new Date()).toISOString();
  const { data: accounts, error: accountError } = await client
    .from("connected_accounts")
    .select("id")
    .eq("platform", "Instagram")
    .eq("provider_user_id_hash", providerUserIdHash);

  if (accountError) throw new Error(accountError.message);

  const matchedConnectedAccountIds = ((accounts ?? []) as Array<{ id: string }>).map((account) => account.id);

  if (matchedConnectedAccountIds.length > 0) {
    const { error: updateError } = await client
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

    if (updateError) throw new Error(updateError.message);
  }

  return {
    ok: true,
    matchedConnectedAccountIds,
  };
}
