import "server-only";

import type { MediaAssetDTO } from "@/lib/types";
import { getMetaGraphVersion } from "@/lib/providers/meta";
import { PublishingException, PublishErrorCode } from "@/lib/publishing-errors";
import { generateProviderIdempotencyKey, extractMetaPostId } from "@/lib/publish-idempotency";

export interface ProviderPublishInput {
  caption: string;
  firstComment?: string | null;
  media: MediaAssetDTO[];
  accessToken?: string | null;
  pageId?: string | null;
  validateOnly?: boolean;
  idempotencyKey?: string;
}

export interface ProviderPublishResult {
  ok: boolean;
  providerPostId?: string | null;
  errorCode?: string | null;
  message: string;
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|m4v|webm)(\?.*)?$/i.test(url);
}

function parseMetaErrorResponse(response: unknown): {
  message: string;
  code?: string | number;
} {
  if (!response || typeof response !== "object") {
    return { message: "Unknown error" };
  }

  const data = response as Record<string, unknown>;
  const error = data.error;

  if (!error || typeof error !== "object") {
    return { message: String(data.error_description ?? data.message ?? "Unknown error") };
  }

  const errorObj = error as Record<string, unknown>;
  return {
    message: String(errorObj.message ?? "Unknown error"),
    code: (errorObj.code as string | number) ?? undefined,
  };
}

/**
 * Map Meta API error codes to publishing error codes
 */
function mapMetaErrorCode(
  metaErrorCode?: string | number,
  message?: string,
): PublishErrorCode {
  const messageStr = message?.toLowerCase() ?? "";
  const codeStr = String(metaErrorCode ?? "").toLowerCase();

  // Auth/token errors
  if (codeStr === "400" && messageStr.includes("access token")) {
    return PublishErrorCode.INVALID_TOKEN;
  }
  if (codeStr === "401" || codeStr === "190") {
    return PublishErrorCode.TOKEN_EXPIRED;
  }
  if (messageStr.includes("permission")) {
    return PublishErrorCode.PERMISSION_DENIED;
  }

  // Page/account errors
  if (codeStr === "100" || messageStr.includes("page")) {
    return PublishErrorCode.PAGE_NOT_ACCESSIBLE;
  }
  if (messageStr.includes("inactive") || messageStr.includes("disabled")) {
    return PublishErrorCode.ACCOUNT_INACTIVE;
  }

  // Rate limiting
  if (codeStr === "17" || codeStr === "429" || messageStr.includes("rate")) {
    return PublishErrorCode.PROVIDER_RATE_LIMIT;
  }

  // Generic provider error
  return PublishErrorCode.PROVIDER_ERROR;
}

async function addFacebookFirstComment(
  postId: string | null | undefined,
  accessToken: string,
  firstComment: string | null | undefined,
): Promise<string | null> {
  const message = firstComment?.trim();

  if (!postId || !message) {
    return null;
  }

  try {
    const body = new URLSearchParams({
      access_token: accessToken,
      message,
    });
    const response = await fetch(
      `https://graph.facebook.com/${getMetaGraphVersion()}/${postId}/comments`,
      {
        method: "POST",
        body,
      },
    );

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | {
            error?: { message?: string };
          }
        | null;

      return payload?.error?.message ?? "First comment could not be added.";
    }

    return null;
  } catch (error) {
    return `First comment failed: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}

export async function publishFacebookPagePost(
  input: ProviderPublishInput,
): Promise<ProviderPublishResult> {
  if (!input.pageId || !input.accessToken) {
    throw new PublishingException(
      PublishErrorCode.INVALID_TOKEN,
      "Facebook Page credentials are missing",
      {
        retryable: true,
        userMessage: "Facebook account is missing credentials. Please reconnect.",
      },
    );
  }

  if (input.validateOnly) {
    return { ok: true, message: "Facebook destination can publish this post." };
  }

  try {
    const firstMedia = input.media[0];
    const hasMedia = Boolean(firstMedia?.url);
    const mediaIsVideo =
      firstMedia?.mediaType === "video" ||
      (firstMedia?.url ? isVideoUrl(firstMedia.url) : false);
    const endpoint = !hasMedia
      ? `https://graph.facebook.com/${getMetaGraphVersion()}/${input.pageId}/feed`
      : mediaIsVideo
        ? `https://graph.facebook.com/${getMetaGraphVersion()}/${input.pageId}/videos`
        : `https://graph.facebook.com/${getMetaGraphVersion()}/${input.pageId}/photos`;

    const body = new URLSearchParams({
      access_token: input.accessToken,
      message: input.caption,
    });

    if (hasMedia && firstMedia?.url) {
      if (mediaIsVideo) {
        body.set("file_url", firstMedia.url);
        body.set("description", input.caption);
      } else {
        body.set("url", firstMedia.url);
        body.set("caption", input.caption);
      }
    }

    // Add idempotency key for duplicate prevention
    const idempotencyKey = input.idempotencyKey ?? generateProviderIdempotencyKey();

    const response = await fetch(endpoint, {
      method: "POST",
      body,
      headers: {
        "X-Idempotency-Key": idempotencyKey,
      },
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => null)) as
        | { error?: { message?: string; code?: string | number } }
        | null;
      const parsedError = parseMetaErrorResponse(errorData);
      const errorCode = mapMetaErrorCode(parsedError.code, parsedError.message);

      throw new PublishingException(
        errorCode,
        `Facebook publishing failed: ${parsedError.message}`,
        {
          retryable: errorCode !== PublishErrorCode.PERMISSION_DENIED,
          metadata: {
            metaErrorCode: parsedError.code,
            metaErrorMessage: parsedError.message,
          },
        },
      );
    }

    const payload = (await response.json()) as { id?: string; post_id?: string };
    const providerPostId = extractMetaPostId(payload);

    // Try to add first comment, but don't fail the publish if it fails
    const commentError = await addFacebookFirstComment(
      providerPostId,
      input.accessToken,
      input.firstComment,
    );

    return {
      ok: true,
      providerPostId,
      message: commentError
        ? `Published to Facebook, but first comment failed: ${commentError}`
        : "Published to Facebook.",
    };
  } catch (error) {
    if (error instanceof PublishingException) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new PublishingException(
      PublishErrorCode.NETWORK_ERROR,
      `Facebook publish network error: ${errorMessage}`,
      {
        retryable: true,
        originalError: error instanceof Error ? error : undefined,
      },
    );
  }
}
