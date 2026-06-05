import "server-only";

import crypto from "node:crypto";

import { getAppUrl } from "@/lib/supabase-server";

const DEFAULT_INSTAGRAM_SCOPES = [
  "instagram_business_basic",
  "instagram_business_content_publish",
] as const;

export interface InstagramLoginStatePayload {
  userId: string;
  returnTo: string;
  nonce: string;
}

export interface InstagramLoginTokenResponse {
  access_token: string;
  user_id?: string | number;
  token_type?: string;
  expires_in?: number;
}

export interface InstagramProfile {
  id: string;
  username?: string;
  name?: string;
  account_type?: string;
  profile_picture_url?: string;
}

export class InstagramLoginProviderError extends Error {
  constructor(
    message: string,
    public readonly code = "instagram_callback",
  ) {
    super(message);
    this.name = "InstagramLoginProviderError";
  }
}

function getInstagramClientId(): string {
  const value = process.env.INSTAGRAM_APP_ID ?? process.env.META_APP_ID;
  if (!value) throw new InstagramLoginProviderError("Instagram app id is not configured.", "instagram_provider_config");
  return value;
}

function getInstagramClientSecret(): string {
  const value = process.env.INSTAGRAM_APP_SECRET ?? process.env.META_APP_SECRET;
  if (!value) throw new InstagramLoginProviderError("Instagram app secret is not configured.", "instagram_provider_config");
  return value;
}

function getInstagramRedirectUri(appUrl = getAppUrl()): string {
  return process.env.INSTAGRAM_REDIRECT_URI ?? `${appUrl}/api/instagram/callback`;
}

export function getInstagramApiVersion(): string {
  return process.env.INSTAGRAM_API_VERSION ?? process.env.META_GRAPH_VERSION ?? "v25.0";
}

export function getInstagramLoginScopes(): string[] {
  return (process.env.INSTAGRAM_SCOPES ?? DEFAULT_INSTAGRAM_SCOPES.join(","))
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean);
}

function base64Url(value: string | Uint8Array): string {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeBase64Url(value: string): string {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

function getStateSecret(): string {
  return process.env.INSTAGRAM_APP_SECRET ?? process.env.META_APP_SECRET ?? "";
}

export function signInstagramLoginState(payload: InstagramLoginStatePayload): string {
  const secret = getStateSecret();
  if (!secret) throw new InstagramLoginProviderError("Instagram app secret is not configured.", "instagram_provider_config");
  const encoded = base64Url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", secret).update(encoded).digest();

  return `${encoded}.${base64Url(signature)}`;
}

export function verifyInstagramLoginState(state: string): InstagramLoginStatePayload {
  const [encoded, signature] = state.split(".");
  const secret = getStateSecret();

  if (!encoded || !signature || !secret) {
    throw new InstagramLoginProviderError("Invalid Instagram provider state.", "instagram_callback");
  }

  const expected = base64Url(crypto.createHmac("sha256", secret).update(encoded).digest());

  if (signature !== expected) {
    throw new InstagramLoginProviderError("Invalid Instagram provider state.", "instagram_callback");
  }

  return JSON.parse(decodeBase64Url(encoded)) as InstagramLoginStatePayload;
}

export function buildInstagramLoginAuthorizationUrl(
  payload: InstagramLoginStatePayload,
  appUrl = getAppUrl(),
): string {
  const params = new URLSearchParams({
    client_id: getInstagramClientId(),
    redirect_uri: getInstagramRedirectUri(appUrl),
    response_type: "code",
    scope: getInstagramLoginScopes().join(","),
    state: signInstagramLoginState(payload),
    enable_fb_login: "0",
    force_authentication: "1",
  });

  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForInstagramToken(
  code: string,
  appUrl = getAppUrl(),
): Promise<InstagramLoginTokenResponse> {
  const body = new URLSearchParams({
    client_id: getInstagramClientId(),
    client_secret: getInstagramClientSecret(),
    grant_type: "authorization_code",
    redirect_uri: getInstagramRedirectUri(appUrl),
    code,
  });

  const response = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    body,
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new InstagramLoginProviderError(`Instagram authorization failed: ${payload}`, "instagram_provider_config");
  }

  return (await response.json()) as InstagramLoginTokenResponse;
}

export async function exchangeForLongLivedInstagramToken(
  token: InstagramLoginTokenResponse,
): Promise<InstagramLoginTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: getInstagramClientSecret(),
    access_token: token.access_token,
  });
  const response = await fetch(`https://graph.instagram.com/access_token?${params.toString()}`);

  if (!response.ok) return token;

  const body = (await response.json()) as InstagramLoginTokenResponse;

  return {
    ...body,
    user_id: body.user_id ?? token.user_id,
  };
}

export async function refreshLongLivedInstagramToken(
  accessToken: string,
): Promise<InstagramLoginTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "ig_refresh_token",
    access_token: accessToken,
  });
  const response = await fetch(`https://graph.instagram.com/refresh_access_token?${params.toString()}`);

  if (!response.ok) {
    const payload = await response.text();
    throw new InstagramLoginProviderError(`Instagram token refresh failed: ${payload}`, "instagram_permissions");
  }

  return (await response.json()) as InstagramLoginTokenResponse;
}

export async function getInstagramLoginProfile(
  token: InstagramLoginTokenResponse,
): Promise<InstagramProfile> {
  const params = new URLSearchParams({
    fields: "id,username,name,account_type,profile_picture_url",
    access_token: token.access_token,
  });
  const response = await fetch(
    `https://graph.instagram.com/${getInstagramApiVersion()}/me?${params.toString()}`,
  );

  if (!response.ok) {
    const payload = await response.text();
    throw new InstagramLoginProviderError(`Unable to load Instagram profile: ${payload}`, "instagram_permissions");
  }

  const profile = (await response.json()) as InstagramProfile;

  if (!profile.id) {
    throw new InstagramLoginProviderError("Instagram profile did not include an id.", "instagram_permissions");
  }

  return profile;
}

export function safeInstagramLoginErrorCode(value: string | null): string {
  const allowed = new Set([
    "access_denied",
    "instagram_provider_config",
    "instagram_permissions",
    "instagram_professional_required",
    "instagram_callback",
    "plan_limit_exceeded",
  ]);

  if (value && allowed.has(value)) return value;

  return "instagram_callback";
}

export function isInstagramProfessionalAccount(profile: InstagramProfile): boolean {
  const accountType = profile.account_type?.toUpperCase();

  return accountType === "BUSINESS" || accountType === "MEDIA_CREATOR" || accountType === "CREATOR";
}
