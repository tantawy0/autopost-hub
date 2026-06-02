import "server-only";

import { createHash } from "crypto";

/**
 * Generate idempotency key for publish operations
 * Ensures duplicate publish requests don't create duplicate posts
 */
export function generatePublishIdempotencyKey(
  postId: string,
  destinationAccountId: string,
  attempt: number = 1,
): string {
  const hash = createHash("sha256")
    .update(`${postId}:${destinationAccountId}:${attempt}`)
    .digest("hex");
  return hash.slice(0, 32);
}

/**
 * Generate idempotency key for provider API calls
 * Follows Meta's idempotency key format (v4 UUID-like)
 */
export function generateProviderIdempotencyKey(): string {
  const chars = "0123456789abcdef";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  // Format: 8-4-4-4-12
  return `${result.slice(0, 8)}-${result.slice(8, 12)}-${result.slice(12, 16)}-${result.slice(16, 20)}-${result.slice(20)}`;
}

/**
 * Extract Meta provider post ID from response
 * Handles different API response formats
 */
export function extractMetaPostId(response: unknown): string | null {
  if (!response || typeof response !== "object") return null;

  const data = response as Record<string, unknown>;
  return (
    (typeof data.id === "string" ? data.id : null) ||
    (typeof data.post_id === "string" ? data.post_id : null) ||
    null
  );
}

/**
 * Verify publish attempt completion
 * Checks if a publish attempt has finished (succeeded, failed, or skipped)
 */
export function isPublishAttemptComplete(
  status: "Pending" | "Publishing" | "Succeeded" | "Failed" | "Skipped",
): boolean {
  return status === "Succeeded" || status === "Failed" || status === "Skipped";
}

/**
 * Verify publish attempt succeeded
 */
export function isPublishAttemptSucceeded(
  status: "Pending" | "Publishing" | "Succeeded" | "Failed" | "Skipped",
): boolean {
  return status === "Succeeded";
}
