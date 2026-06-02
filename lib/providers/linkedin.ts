import "server-only";

import crypto from "node:crypto";

import type { ProviderPublishInput, ProviderPublishResult } from "@/lib/providers/facebook";
import { generateProviderIdempotencyKey } from "@/lib/publish-idempotency";
import { PublishingException, PublishErrorCode } from "@/lib/publishing-errors";
import { getAppUrl } from "@/lib/supabase-server";

export const DEFAULT_LINKEDIN_API_VERSION = "202605";
export const LINKEDIN_REQUIRED_SCOPES = ["openid", "profile", "email", "w_member_social"] as const;

export interface LinkedInStatePayload {
  userId: string;
  returnTo: string;
  nonce: string;
}

export interface LinkedInTokenResponse {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
  token_type?: string;
}

export interface LinkedInProfile {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  picture?: string;
}

function getLinkedInClientId(): string {
  const clientId = process.env.LINKEDIN_CLIENT_ID;

  if (!clientId) {
    throw new Error("LINKEDIN_CLIENT_ID is not configured.");
  }

  return clientId;
}

function getLinkedInClientSecret(): string {
  const secret = process.env.LINKEDIN_CLIENT_SECRET;

  if (!secret) {
    throw new Error("LINKEDIN_CLIENT_SECRET is not configured.");
  }

  return secret;
}

export function getLinkedInApiVersion(): string {
  return process.env.LINKEDIN_API_VERSION || DEFAULT_LINKEDIN_API_VERSION;
}

export function getLinkedInRedirectUri(appUrl = getAppUrl()): string {
  return process.env.LINKEDIN_REDIRECT_URI ?? `${appUrl}/api/linkedin/callback`;
}

export function getLinkedInScopes(): string[] {
  return (process.env.LINKEDIN_SCOPES ?? LINKEDIN_REQUIRED_SCOPES.join(","))
    .split(/[,\s]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
}

export function getMissingLinkedInScopes(scopes = getLinkedInScopes()): string[] {
  const configured = new Set(scopes);

  return LINKEDIN_REQUIRED_SCOPES.filter((scope) => !configured.has(scope));
}

function base64Url(value: string | Buffer): string {
  return Buffer.from(value)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function decodeBase64Url(value: string): string {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  return Buffer.from(padded, "base64").toString("utf8");
}

export function signLinkedInState(payload: LinkedInStatePayload): string {
  const encoded = base64Url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", getLinkedInClientSecret()).update(encoded).digest();

  return `${encoded}.${base64Url(signature)}`;
}

export function verifyLinkedInState(state: string): LinkedInStatePayload {
  const [encoded, signature] = state.split(".");

  if (!encoded || !signature) {
    throw new Error("Invalid provider state.");
  }

  const expected = base64Url(
    crypto.createHmac("sha256", getLinkedInClientSecret()).update(encoded).digest(),
  );

  if (signature !== expected) {
    throw new Error("Invalid provider state.");
  }

  return JSON.parse(decodeBase64Url(encoded)) as LinkedInStatePayload;
}

export function buildLinkedInAuthorizationUrl(
  payload: LinkedInStatePayload,
  appUrl = getAppUrl(),
): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: getLinkedInClientId(),
    redirect_uri: getLinkedInRedirectUri(appUrl),
    state: signLinkedInState(payload),
    scope: getLinkedInScopes().join(" "),
  });

  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
}

export async function exchangeCodeForLinkedInToken(
  code: string,
  appUrl = getAppUrl(),
): Promise<LinkedInTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: getLinkedInRedirectUri(appUrl),
    client_id: getLinkedInClientId(),
    client_secret: getLinkedInClientSecret(),
  });

  const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new LinkedInProviderError(`LinkedIn authorization failed: ${payload}`, "provider_config");
  }

  return (await response.json()) as LinkedInTokenResponse;
}

export async function getLinkedInProfile(accessToken: string): Promise<LinkedInProfile> {
  const response = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new LinkedInProviderError(`Unable to load LinkedIn profile: ${payload}`, "linkedin_permissions");
  }

  const profile = (await response.json()) as LinkedInProfile;

  if (!profile.sub) {
    throw new LinkedInProviderError("LinkedIn profile response did not include a member id.", "callback");
  }

  return profile;
}

export function toLinkedInAuthorUrn(profileSubOrUrn: string): string {
  return profileSubOrUrn.startsWith("urn:li:") ? profileSubOrUrn : `urn:li:person:${profileSubOrUrn}`;
}

export function getLinkedInDisplayName(profile: LinkedInProfile): string {
  const composedName = [profile.given_name, profile.family_name].filter(Boolean).join(" ").trim();

  return profile.name?.trim() || composedName || profile.email || "LinkedIn Member";
}

export function getLinkedInTokenExpiresAt(token: LinkedInTokenResponse): string | null {
  return token.expires_in && token.expires_in > 0
    ? new Date(Date.now() + token.expires_in * 1000).toISOString()
    : null;
}

function mapLinkedInError(responseStatus: number, message: string): PublishErrorCode {
  const normalized = message.toLowerCase();

  if (responseStatus === 401 || normalized.includes("token")) return PublishErrorCode.TOKEN_EXPIRED;
  if (responseStatus === 403) return PublishErrorCode.PERMISSION_DENIED;
  if (responseStatus === 429) return PublishErrorCode.PROVIDER_RATE_LIMIT;
  if (responseStatus >= 500) return PublishErrorCode.PROVIDER_UNAVAILABLE;
  if (responseStatus === 400) return PublishErrorCode.INVALID_CONTENT;

  return PublishErrorCode.PROVIDER_ERROR;
}

export async function publishLinkedInMemberPost(
  input: ProviderPublishInput & { authorUrn?: string | null },
): Promise<ProviderPublishResult> {
  if (!input.authorUrn || !input.accessToken) {
    throw new PublishingException(
      PublishErrorCode.INVALID_TOKEN,
      "LinkedIn member credentials are missing",
      {
        retryable: true,
        userMessage: "LinkedIn account is missing credentials. Please reconnect.",
      },
    );
  }

  const commentary = input.caption.trim();

  if (!commentary) {
    throw new PublishingException(
      PublishErrorCode.INVALID_CONTENT,
      "LinkedIn publishing requires a caption for this release",
      { retryable: false },
    );
  }

  if (commentary.length > 3000) {
    throw new PublishingException(
      PublishErrorCode.CONTENT_TOO_LONG,
      "LinkedIn captions must be 3000 characters or fewer",
      { retryable: false },
    );
  }

  if (input.media.length > 0) {
    throw new PublishingException(
      PublishErrorCode.UNSUPPORTED_MEDIA_TYPE,
      "LinkedIn media publishing is not enabled in this release",
      {
        retryable: false,
        userMessage: "LinkedIn text publishing is ready; image/video publishing needs the asset upload step.",
      },
    );
  }

  if (input.validateOnly) {
    return { ok: true, message: "LinkedIn destination can publish this text post." };
  }

  const response = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": getLinkedInApiVersion(),
      "X-Restli-Protocol-Version": "2.0.0",
      "X-Idempotency-Key": input.idempotencyKey ?? generateProviderIdempotencyKey(),
    },
    body: JSON.stringify({
      author: input.authorUrn,
      commentary,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });

  if (!response.ok) {
    const payload = await response.text();
    const code = mapLinkedInError(response.status, payload);

    throw new PublishingException(code, `LinkedIn publishing failed: ${payload || response.statusText}`, {
      retryable: code !== PublishErrorCode.PERMISSION_DENIED && code !== PublishErrorCode.INVALID_CONTENT,
      metadata: { status: response.status },
    });
  }

  return {
    ok: true,
    providerPostId: response.headers.get("x-restli-id"),
    message: "Published to LinkedIn.",
  };
}

export class LinkedInProviderError extends Error {
  constructor(
    message: string,
    public readonly code = "callback",
  ) {
    super(message);
    this.name = "LinkedInProviderError";
  }
}

export function safeLinkedInErrorCode(value: string | null): string {
  const allowed = new Set([
    "access_denied",
    "provider_config",
    "linkedin_permissions",
    "callback",
    "forbidden",
  ]);

  if (value && allowed.has(value)) {
    return value;
  }

  return "callback";
}
