import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getAccessToken, type TokenAccountRow } from "@/lib/oauth-tokens";
import {
  getMetaGraphVersion,
  getMetaScopes,
  getMissingMetaScopes,
  META_REQUIRED_SCOPES,
  type MetaAccountDestination,
} from "@/lib/providers/meta";
import { getAppUrl } from "@/lib/supabase-server";

export type MetaDiagnosticIssue =
  | "meta_app_id_missing"
  | "meta_app_secret_missing"
  | "meta_redirect_uri_missing"
  | "redirect_uri_mismatch"
  | "missing_required_scope"
  | "token_missing"
  | "token_expired"
  | "account_disconnected"
  | "facebook_page_missing"
  | "instagram_business_account_missing"
  | "instagram_page_link_missing"
  | "provider_lookup_failed";

export type MetaSetupDiagnostics = {
  appIdConfigured: boolean;
  appSecretConfigured: boolean;
  redirectUriConfigured: boolean;
  redirectUri: string;
  expectedRedirectUri: string;
  redirectMatchesAppUrl: boolean;
  graphVersion: string;
  scopes: {
    required: string[];
    configured: string[];
    missing: string[];
  };
  readyForPublishing: boolean;
  issues: MetaDiagnosticIssue[];
};

export type MetaConnectionDiagnostic = {
  id: string;
  platform: "Facebook" | "Instagram";
  accountName: string;
  status: string;
  reconnectRequired: boolean;
  hasToken: boolean;
  tokenExpired: boolean;
  pageId: string | null;
  instagramBusinessAccountId: string | null;
  instagramLinkedToPage: boolean | null;
  publishReady: boolean;
  issues: MetaDiagnosticIssue[];
};

export type MetaDiagnosticsSummary = {
  facebookConnections: number;
  instagramConnections: number;
  publishReadyFacebook: number;
  publishReadyInstagram: number;
  pagesWithoutInstagram: number;
};

type MetaConnectionRow = Omit<TokenAccountRow, "platform"> & {
  platform: "Facebook" | "Instagram";
  account_name?: string | null;
  account_id?: string | null;
  page_id?: string | null;
  instagram_business_account_id?: string | null;
  status?: string | null;
  reconnect_required?: boolean | null;
};

function isMetaConnectionRow(row: TokenAccountRow): row is MetaConnectionRow {
  return row.platform === "Facebook" || row.platform === "Instagram";
}

function configured(value: string | undefined): boolean {
  const trimmed = value?.trim();

  return Boolean(trimmed && !/^(your-|replace-with-|example-|changeme)/i.test(trimmed));
}

function normalizeUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

export function buildMetaSetupDiagnostics(appUrl = getAppUrl()): MetaSetupDiagnostics {
  const expectedRedirectUri = `${normalizeUrl(appUrl)}/api/meta/callback`;
  const redirectUri = process.env.META_REDIRECT_URI?.trim() || expectedRedirectUri;
  const configuredScopes = getMetaScopes();
  const missingScopes = getMissingMetaScopes(configuredScopes);
  const issues: MetaDiagnosticIssue[] = [];

  if (!configured(process.env.META_APP_ID)) issues.push("meta_app_id_missing");
  if (!configured(process.env.META_APP_SECRET)) issues.push("meta_app_secret_missing");
  if (!configured(process.env.META_REDIRECT_URI)) issues.push("meta_redirect_uri_missing");
  if (redirectUri !== expectedRedirectUri) issues.push("redirect_uri_mismatch");
  if (missingScopes.length > 0) issues.push("missing_required_scope");

  return {
    appIdConfigured: configured(process.env.META_APP_ID),
    appSecretConfigured: configured(process.env.META_APP_SECRET),
    redirectUriConfigured: configured(process.env.META_REDIRECT_URI),
    redirectUri,
    expectedRedirectUri,
    redirectMatchesAppUrl: redirectUri === expectedRedirectUri,
    graphVersion: getMetaGraphVersion(),
    scopes: {
      required: [...META_REQUIRED_SCOPES],
      configured: configuredScopes,
      missing: missingScopes,
    },
    readyForPublishing: issues.length === 0,
    issues,
  };
}

export function summarizeMetaDestinationDiscovery(
  destinations: MetaAccountDestination[],
  requestedPlatform: "facebook" | "instagram",
) {
  const facebookDestinations = destinations.filter((destination) => destination.platform === "Facebook");
  const instagramDestinations = destinations.filter((destination) => destination.platform === "Instagram");
  const linkedPageIds = new Set(
    instagramDestinations.map((destination) => destination.pageId).filter(Boolean),
  );
  const pagesWithoutInstagram = facebookDestinations
    .filter((destination) => !linkedPageIds.has(destination.pageId ?? destination.accountId))
    .map((destination) => ({
      pageId: destination.pageId ?? destination.accountId,
      accountName: destination.accountName,
    }));
  const connectable =
    requestedPlatform === "facebook" ? facebookDestinations.length > 0 : instagramDestinations.length > 0;

  return {
    connectable,
    facebookCount: facebookDestinations.length,
    instagramCount: instagramDestinations.length,
    pagesWithoutInstagram,
    errorCode: connectable
      ? null
      : requestedPlatform === "instagram"
        ? "instagram_not_linked"
        : "no_eligible_accounts",
  };
}

function tokenExpired(row: MetaConnectionRow): boolean {
  if (!row.token_expires_at) return false;

  const expiresAt = new Date(row.token_expires_at).getTime();

  return Number.isFinite(expiresAt) && expiresAt <= Date.now();
}

function getConnectionIssues(
  row: MetaConnectionRow,
  linkedInstagramKnown: boolean | null,
): MetaDiagnosticIssue[] {
  const issues: MetaDiagnosticIssue[] = [];
  const accessToken = getAccessToken(row);
  const expired = tokenExpired(row);

  if (row.status !== "Connected" || row.reconnect_required) issues.push("account_disconnected");
  if (!accessToken) issues.push("token_missing");
  if (expired) issues.push("token_expired");
  if (row.platform === "Facebook" && !row.page_id) issues.push("facebook_page_missing");
  if (row.platform === "Instagram" && !row.instagram_business_account_id) {
    issues.push("instagram_business_account_missing");
  }
  if (row.platform === "Facebook" && linkedInstagramKnown === false) {
    issues.push("instagram_page_link_missing");
  }

  return issues;
}

async function fetchLinkedInstagramForPage(pageId: string, accessToken: string) {
  const url = `https://graph.facebook.com/${getMetaGraphVersion()}/${pageId}?fields=instagram_business_account{id,username}&access_token=${encodeURIComponent(
    accessToken,
  )}`;
  const response = await fetch(url);
  const body = (await response.json().catch(() => null)) as
    | { instagram_business_account?: { id?: string; username?: string }; error?: { message?: string } }
    | null;

  if (!response.ok) {
    return { ok: false as const, instagramBusinessAccountId: null, username: null };
  }

  return {
    ok: true as const,
    instagramBusinessAccountId: body?.instagram_business_account?.id ?? null,
    username: body?.instagram_business_account?.username ?? null,
  };
}

export async function buildMetaConnectionDiagnostics(
  client: SupabaseClient,
  userId: string,
  options: { live?: boolean } = {},
): Promise<{
  connections: MetaConnectionDiagnostic[];
  summary: MetaDiagnosticsSummary;
}> {
  const { data, error } = await client
    .from("connected_accounts")
    .select(
      "id, platform, account_name, account_id, page_id, instagram_business_account_id, status, reconnect_required, access_token, token_ciphertext, token_expires_at",
    )
    .eq("user_id", userId)
    .in("platform", ["Facebook", "Instagram"]);

  if (error) {
    throw new Error(error.message);
  }

  const rows = ((data ?? []) as TokenAccountRow[]).filter(isMetaConnectionRow);
  const instagramPageIds = new Set(rows
    .filter((row) => row.platform === "Instagram")
    .map((row) => row.page_id)
    .filter(Boolean));
  const connections: MetaConnectionDiagnostic[] = [];

  for (const row of rows) {
    const accessToken = getAccessToken(row);
    let linkedInstagramKnown: boolean | null =
      row.platform === "Instagram"
        ? true
        : row.instagram_business_account_id
          ? true
          : row.page_id
            ? instagramPageIds.has(row.page_id)
            : null;

    if (options.live && row.platform === "Facebook" && row.page_id && accessToken) {
      try {
        const live = await fetchLinkedInstagramForPage(row.page_id, accessToken);
        linkedInstagramKnown = Boolean(live.instagramBusinessAccountId);
      } catch {
        linkedInstagramKnown = null;
      }
    }

    const issues = getConnectionIssues(row, linkedInstagramKnown);
    const publishReady = issues.filter((issue) => issue !== "instagram_page_link_missing").length === 0;

    connections.push({
      id: row.id,
      platform: row.platform,
      accountName: row.account_name ?? row.account_id ?? `${row.platform} Account`,
      status: row.status ?? "Disconnected",
      reconnectRequired: Boolean(row.reconnect_required),
      hasToken: Boolean(accessToken),
      tokenExpired: tokenExpired(row),
      pageId: row.page_id ?? null,
      instagramBusinessAccountId: row.instagram_business_account_id ?? null,
      instagramLinkedToPage: linkedInstagramKnown,
      publishReady,
      issues,
    });
  }

  const facebookConnections = connections.filter((connection) => connection.platform === "Facebook");
  const instagramConnections = connections.filter((connection) => connection.platform === "Instagram");

  return {
    connections,
    summary: {
      facebookConnections: facebookConnections.length,
      instagramConnections: instagramConnections.length,
      publishReadyFacebook: facebookConnections.filter((connection) => connection.publishReady).length,
      publishReadyInstagram: instagramConnections.filter((connection) => connection.publishReady).length,
      pagesWithoutInstagram: facebookConnections.filter(
        (connection) => connection.instagramLinkedToPage === false,
      ).length,
    },
  };
}
