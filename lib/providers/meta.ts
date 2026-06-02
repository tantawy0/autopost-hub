import "server-only";

import crypto from "node:crypto";

import { getAppUrl } from "@/lib/supabase-server";

export const DEFAULT_META_GRAPH_VERSION = "v25.0";
export const META_REQUIRED_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
] as const;

const DEFAULT_META_SCOPES = [...META_REQUIRED_SCOPES];

export interface MetaStatePayload {
  userId: string;
  platform: "facebook" | "instagram";
  returnTo: string;
  nonce: string;
}

export interface MetaTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

export interface MetaAccountDestination {
  platform: "Facebook" | "Instagram";
  accountName: string;
  accountId: string;
  pageId?: string | null;
  instagramBusinessAccountId?: string | null;
  accessToken: string;
  tokenExpiresAt?: string | null;
}

export class MetaProviderError extends Error {
  constructor(
    message: string,
    public readonly code = "callback",
  ) {
    super(message);
    this.name = "MetaProviderError";
  }
}

function getMetaSecret(): string {
  const secret = process.env.META_APP_SECRET;

  if (!secret) {
    throw new Error("META_APP_SECRET is not configured.");
  }

  return secret;
}

export function getMetaGraphVersion(): string {
  return process.env.META_GRAPH_VERSION || DEFAULT_META_GRAPH_VERSION;
}

function getMetaGraphBaseUrl(): string {
  return `https://graph.facebook.com/${getMetaGraphVersion()}`;
}

export function getMetaScopes(): string[] {
  return (process.env.META_SCOPES ?? DEFAULT_META_SCOPES.join(","))
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean);
}

export function getMissingMetaScopes(scopes = getMetaScopes()): string[] {
  const configured = new Set(scopes);

  return META_REQUIRED_SCOPES.filter((scope) => !configured.has(scope));
}

function base64Url(value: string | Uint8Array): string {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function decodeBase64Url(value: string): string {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

export function signMetaState(payload: MetaStatePayload): string {
  const encoded = base64Url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", getMetaSecret()).update(encoded).digest();

  return `${encoded}.${base64Url(signature)}`;
}

export function verifyMetaState(state: string): MetaStatePayload {
  const [encoded, signature] = state.split(".");

  if (!encoded || !signature) {
    throw new Error("Invalid provider state.");
  }

  const expected = base64Url(
    crypto.createHmac("sha256", getMetaSecret()).update(encoded).digest(),
  );

  if (signature !== expected) {
    throw new Error("Invalid provider state.");
  }

  return JSON.parse(decodeBase64Url(encoded)) as MetaStatePayload;
}

export function buildMetaAuthorizationUrl(payload: MetaStatePayload, appUrl = getAppUrl()): string {
  const appId = process.env.META_APP_ID;

  if (!appId) {
    throw new Error("META_APP_ID is not configured.");
  }

  const redirectUri = process.env.META_REDIRECT_URI ?? `${appUrl}/api/meta/callback`;
  const scopes = getMetaScopes();

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes.join(","),
    state: signMetaState(payload),
  });

  return `https://www.facebook.com/${getMetaGraphVersion()}/dialog/oauth?${params.toString()}`;
}

export async function exchangeCodeForMetaToken(
  code: string,
  appUrl = getAppUrl(),
): Promise<MetaTokenResponse> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = process.env.META_REDIRECT_URI ?? `${appUrl}/api/meta/callback`;

  if (!appId || !appSecret) {
    throw new Error("Meta provider credentials are not configured.");
  }

  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });

  const response = await fetch(`${getMetaGraphBaseUrl()}/oauth/access_token?${params.toString()}`);

  if (!response.ok) {
    const body = await response.text();
    throw new MetaProviderError(`Meta authorization failed: ${body}`, "provider_config");
  }

  return (await response.json()) as MetaTokenResponse;
}

export async function exchangeForLongLivedMetaToken(
  token: MetaTokenResponse,
): Promise<MetaTokenResponse> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("Meta provider credentials are not configured.");
  }

  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: token.access_token,
  });
  const response = await fetch(`${getMetaGraphBaseUrl()}/oauth/access_token?${params.toString()}`);

  if (!response.ok) {
    return token;
  }

  return (await response.json()) as MetaTokenResponse;
}

export async function listMetaDestinations(
  token: MetaTokenResponse,
): Promise<MetaAccountDestination[]> {
  const response = await fetch(
    `${getMetaGraphBaseUrl()}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,profile_picture_url}&access_token=${encodeURIComponent(
      token.access_token,
    )}`,
  );

  if (!response.ok) {
    const body = await response.text();
    throw new MetaProviderError(`Unable to load Instagram accounts: ${body}`, "meta_permissions");
  }

  const body = (await response.json()) as {
    data?: Array<{
      id: string;
      name: string;
      access_token?: string;
      instagram_business_account?: { id: string; username?: string; profile_picture_url?: string };
    }>;
  };

  const expiresAt =
    token.expires_in && token.expires_in > 0
      ? new Date(Date.now() + token.expires_in * 1000).toISOString()
      : null;

  return (body.data ?? []).flatMap((page) => {
    const pageToken = page.access_token ?? token.access_token;
    const destinations: MetaAccountDestination[] = [
      {
        platform: "Facebook",
        accountName: page.name,
        accountId: page.id,
        pageId: page.id,
        accessToken: pageToken,
        tokenExpiresAt: expiresAt,
      },
    ];

    if (page.instagram_business_account?.id) {
      destinations.push({
        platform: "Instagram",
        accountName: page.instagram_business_account.username ?? `${page.name} Instagram`,
        accountId: page.instagram_business_account.id,
        pageId: page.id,
        instagramBusinessAccountId: page.instagram_business_account.id,
        accessToken: pageToken,
        tokenExpiresAt: expiresAt,
      });
    }

    return destinations;
  });
}

export function safeMetaErrorCode(value: string | null): string {
  const allowed = new Set([
    "access_denied",
    "no_eligible_accounts",
    "instagram_not_linked",
    "meta_permissions",
    "provider_config",
    "callback",
  ]);

  if (value && allowed.has(value)) {
    return value;
  }

  return "callback";
}
