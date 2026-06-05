import crypto from "node:crypto";

export type InstagramWebhookVerificationResult =
  | { ok: true; challenge: string }
  | { ok: false; status: 400 | 403; code: string; message: string };

export function getInstagramWebhookVerifyToken(): string | null {
  return process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN?.trim() || null;
}

function getInstagramWebhookSigningSecret(): string | null {
  return process.env.INSTAGRAM_APP_SECRET?.trim() || process.env.META_APP_SECRET?.trim() || null;
}

export function verifyInstagramWebhookChallenge(params: URLSearchParams): InstagramWebhookVerificationResult {
  const mode = params.get("hub.mode");
  const verifyToken = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  const expectedToken = getInstagramWebhookVerifyToken();

  if (mode !== "subscribe" || !challenge) {
    return {
      ok: false,
      status: 400,
      code: "invalid_instagram_webhook_challenge",
      message: "Invalid Instagram webhook verification request.",
    };
  }

  if (!expectedToken || verifyToken !== expectedToken) {
    return {
      ok: false,
      status: 403,
      code: "instagram_webhook_verify_token_mismatch",
      message: "Invalid Instagram webhook verify token.",
    };
  }

  return { ok: true, challenge };
}

export function verifyInstagramWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = getInstagramWebhookSigningSecret();

  if (!secret || !signatureHeader?.startsWith("sha256=")) {
    return false;
  }

  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const provided = signatureHeader.slice("sha256=".length);

  try {
    return crypto.timingSafeEqual(Buffer.from(provided, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}
