import "server-only";

import crypto from "node:crypto";

const PREFIX = "v1";

function keyMaterial() {
  const configured = process.env.TOKEN_ENCRYPTION_KEY;

  if (!configured) {
    throw new Error("TOKEN_ENCRYPTION_KEY is required for encrypted token storage.");
  }

  return crypto.createHash("sha256").update(configured).digest();
}

export function encryptSecret(value: string | null | undefined): string | null {
  if (!value) return null;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyMaterial(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [PREFIX, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptSecret(value: string | null | undefined): string | null {
  if (!value) return null;

  const [version, encodedIv, encodedTag, encodedCiphertext] = value.split(".");

  if (version !== PREFIX || !encodedIv || !encodedTag || !encodedCiphertext) {
    return value;
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    keyMaterial(),
    Buffer.from(encodedIv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function hashSecret(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}
