import type { ConnectedAccountDTO, ConnectedAccountStatus, Platform } from "@/lib/types";
import {
  normalizeConnectedAccountStatus,
  normalizePlatform,
} from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { getClientUser } from "@/lib/auth";

type ConnectedAccountRow = {
  id: string;
  platform: string;
  account_name?: string | null;
  name?: string | null;
  account_id?: string | null;
  page_id?: string | null;
  instagram_business_account_id?: string | null;
  provider_metadata?: Record<string, unknown> | null;
  status?: string | null;
  reconnect_required?: boolean | null;
};

function toConnectedAccountDTO(row: ConnectedAccountRow): ConnectedAccountDTO {
  const platform = normalizePlatform(row.platform);
  const status = normalizeConnectedAccountStatus(row.status);
  const reconnectRequired =
    Boolean(row.reconnect_required) ||
    status === "Expired" ||
    status === "Revoked" ||
    status === "Unauthorized";

  return {
    id: row.id,
    platform,
    accountId: row.account_id ?? null,
    pageId: row.page_id ?? null,
    instagramBusinessAccountId: row.instagram_business_account_id ?? null,
    providerMetadata: row.provider_metadata ?? null,
    accountName: row.account_name ?? row.name ?? `${platform} Account`,
    status,
    reconnectRequired,
    publishCapable:
      platform !== "TikTok" &&
      status === "Connected" &&
      !reconnectRequired,
  };
}

async function listLegacyChannels(userId: string): Promise<ConnectedAccountDTO[]> {
  const { data, error } = await supabase
    .from("channels")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => toConnectedAccountDTO(row as ConnectedAccountRow));
}

export async function listConnectedAccounts(): Promise<ConnectedAccountDTO[]> {
  const user = await getClientUser();
  const { data, error } = await supabase
    .from("connected_accounts")
    .select(
      "id, platform, account_name, account_id, page_id, instagram_business_account_id, provider_metadata, status, reconnect_required, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return listLegacyChannels(user.id);
  }

  return (data ?? []).map((row) => toConnectedAccountDTO(row as ConnectedAccountRow));
}

export async function listSelectableDestinations(): Promise<ConnectedAccountDTO[]> {
  const accounts = await listConnectedAccounts();

  return accounts.filter((account) => account.publishCapable && !account.reconnectRequired);
}

export async function disconnectConnectedAccount(accountId: string): Promise<void> {
  const user = await getClientUser();

  const { error } = await supabase
    .from("connected_accounts")
    .update({
      status: "Disconnected" satisfies ConnectedAccountStatus,
      reconnect_required: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", accountId)
    .eq("user_id", user.id);

  if (!error) {
    return;
  }

  if (!/relation.*connected_accounts|schema cache|does not exist/i.test(error.message)) {
    throw new Error(error.message);
  }

  const legacy = await supabase
    .from("channels")
    .update({
      status: "Disconnected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", accountId)
    .eq("user_id", user.id);

  if (legacy.error) {
    throw new Error(legacy.error.message);
  }
}

export function getPlatformTone(platform: Platform): string {
  if (platform === "Instagram") return "from-pink-500 to-orange-400";
  if (platform === "Facebook") return "from-blue-500 to-sky-400";
  if (platform === "LinkedIn") return "from-sky-500 to-blue-300";
  return "from-zinc-900 to-zinc-700";
}
