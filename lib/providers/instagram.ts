import "server-only";

import type { MediaAssetDTO } from "@/lib/types";
import type { ProviderPublishInput, ProviderPublishResult } from "@/lib/providers/facebook";
import { getMetaGraphVersion } from "@/lib/providers/meta";
import { PublishingException, PublishErrorCode } from "@/lib/publishing-errors";
import { generateProviderIdempotencyKey, extractMetaPostId } from "@/lib/publish-idempotency";

/**
 * Parse Meta API error response
 */
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
 * Map Meta API error codes to publishing error codes for Instagram
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

  // Account errors
  if (messageStr.includes("business account") || messageStr.includes("instagram")) {
    return PublishErrorCode.ACCOUNT_INACTIVE;
  }

  // Rate limiting
  if (codeStr === "17" || codeStr === "429" || messageStr.includes("rate")) {
    return PublishErrorCode.PROVIDER_RATE_LIMIT;
  }

  // Content validation
  if (messageStr.includes("unsupported") || messageStr.includes("format")) {
    return PublishErrorCode.UNSUPPORTED_MEDIA_TYPE;
  }

  return PublishErrorCode.PROVIDER_ERROR;
}

/**
 * Create Instagram media container
 * Returns container ID or throws structured error
 */
async function createInstagramContainer(
  businessAccountId: string,
  accessToken: string,
  caption: string,
  media: MediaAssetDTO[],
  idempotencyKey: string,
) {
  const firstMedia = media[0];
  const body = new URLSearchParams({
    access_token: accessToken,
    caption,
    idempotency_key: idempotencyKey,
  });

  if (!firstMedia?.url) {
    throw new PublishingException(
      PublishErrorCode.MEDIA_REQUIRED,
      "Instagram publishing requires media",
      {
        retryable: false,
      },
    );
  }

  const isVideo =
    firstMedia.mediaType === "video" || /\.(mp4|mov|m4v|webm)(\?.*)?$/i.test(firstMedia.url);

  if (isVideo) {
    body.set("media_type", "REELS");
    body.set("video_url", firstMedia.url);
  } else {
    body.set("image_url", firstMedia.url);
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${getMetaGraphVersion()}/${businessAccountId}/media`,
      {
        method: "POST",
        body,
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => null)) as
        | { error?: { message?: string; code?: string | number } }
        | null;
      const parsedError = parseMetaErrorResponse(errorData);
      const errorCode = mapMetaErrorCode(parsedError.code, parsedError.message);

      throw new PublishingException(
        errorCode,
        `Instagram container creation failed: ${parsedError.message}`,
        {
          retryable: errorCode !== PublishErrorCode.PERMISSION_DENIED,
          metadata: {
            metaErrorCode: parsedError.code,
          },
        },
      );
    }

    return (await response.json()) as { id: string };
  } catch (error) {
    if (error instanceof PublishingException) {
      throw error;
    }
    throw new PublishingException(
      PublishErrorCode.NETWORK_ERROR,
      "Failed to create Instagram media container",
      {
        retryable: true,
        originalError: error instanceof Error ? error : undefined,
      },
    );
  }
}

/**
 * Wait for Instagram media container to be ready
 * Throws structured error if container fails or expires
 */
async function waitForInstagramContainer(
  businessAccountId: string,
  accessToken: string,
  creationId: string,
  timeoutSeconds: number = 8,
) {
  const maxAttempts = timeoutSeconds;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/${getMetaGraphVersion()}/${creationId}?fields=status_code&access_token=${encodeURIComponent(
          accessToken,
        )}`,
      );

      if (!response.ok) {
        // If we can't check status, wait and retry
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      const payload = (await response.json()) as { status_code?: string };

      if (payload.status_code === "FINISHED") {
        return;
      }

      if (payload.status_code === "ERROR") {
        throw new PublishingException(
          PublishErrorCode.PROVIDER_ERROR,
          "Instagram media container processing failed",
          {
            retryable: true,
            metadata: { containerId: creationId },
          },
        );
      }

      if (payload.status_code === "EXPIRED") {
        throw new PublishingException(
          PublishErrorCode.TIMEOUT,
          "Instagram media container processing took too long",
          {
            retryable: true,
            metadata: { containerId: creationId },
          },
        );
      }

      // Still processing, wait and retry
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      if (error instanceof PublishingException) {
        throw error;
      }
      // Network error during status check, retry
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  throw new PublishingException(
    PublishErrorCode.TIMEOUT,
    "Instagram media container processing timed out",
    {
      retryable: true,
      metadata: { containerId: creationId, attempts: maxAttempts },
    },
  );
}

async function addInstagramFirstComment(
  mediaId: string | null | undefined,
  accessToken: string,
  firstComment: string | null | undefined,
): Promise<string | null> {
  const message = firstComment?.trim();

  if (!mediaId || !message) {
    return null;
  }

  try {
    const body = new URLSearchParams({
      access_token: accessToken,
      message,
    });
    const response = await fetch(
      `https://graph.facebook.com/${getMetaGraphVersion()}/${mediaId}/comments`,
      {
        method: "POST",
        body,
      },
    );

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;

      return payload?.error?.message ?? "First comment could not be added.";
    }

    return null;
  } catch (error) {
    return `First comment failed: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}

export async function publishInstagramBusinessPost(
  input: ProviderPublishInput & { instagramBusinessAccountId?: string | null },
): Promise<ProviderPublishResult> {
  if (!input.instagramBusinessAccountId || !input.accessToken) {
    throw new PublishingException(
      PublishErrorCode.INVALID_TOKEN,
      "Instagram Business credentials are missing",
      {
        retryable: true,
        userMessage: "Instagram account is missing credentials. Please reconnect.",
      },
    );
  }

  if (input.media.length === 0) {
    throw new PublishingException(
      PublishErrorCode.MEDIA_REQUIRED,
      "Instagram publishing requires media",
      {
        retryable: false,
      },
    );
  }

  const firstMedia = input.media[0];
  const isVideo =
    firstMedia.mediaType === "video" || /\.(mp4|mov|m4v|webm)(\?.*)?$/i.test(firstMedia.url);

  if (isVideo || input.media.length > 1) {
    throw new PublishingException(
      PublishErrorCode.UNSUPPORTED_MEDIA_TYPE,
      "Instagram MVP supports single image posts only",
      {
        retryable: false,
        userMessage: "Instagram single-image mode: videos and carousels coming soon.",
      },
    );
  }

  if (input.validateOnly) {
    return { ok: true, message: "Instagram destination can publish this post." };
  }

  try {
    const idempotencyKey = input.idempotencyKey ?? generateProviderIdempotencyKey();

    const container = await createInstagramContainer(
      input.instagramBusinessAccountId,
      input.accessToken,
      input.caption,
      input.media,
      idempotencyKey,
    );

    await waitForInstagramContainer(
      input.instagramBusinessAccountId,
      input.accessToken,
      container.id,
      8,
    );

    const body = new URLSearchParams({
      access_token: input.accessToken,
      creation_id: container.id,
      idempotency_key: idempotencyKey,
    });

    const response = await fetch(
      `https://graph.facebook.com/${getMetaGraphVersion()}/${input.instagramBusinessAccountId}/media_publish`,
      {
        method: "POST",
        body,
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => null)) as
        | { error?: { message?: string; code?: string | number } }
        | null;
      const parsedError = parseMetaErrorResponse(errorData);
      const errorCode = mapMetaErrorCode(parsedError.code, parsedError.message);

      throw new PublishingException(
        errorCode,
        `Instagram publish failed: ${parsedError.message}`,
        {
          retryable: errorCode !== PublishErrorCode.PERMISSION_DENIED,
          metadata: {
            metaErrorCode: parsedError.code,
            containerId: container.id,
          },
        },
      );
    }

    const payload = (await response.json()) as { id?: string };
    const providerPostId = extractMetaPostId(payload);

    const commentError = await addInstagramFirstComment(
      providerPostId,
      input.accessToken,
      input.firstComment,
    );

    return {
      ok: true,
      providerPostId,
      message: commentError
        ? `Published to Instagram, but first comment failed: ${commentError}`
        : "Published to Instagram.",
    };
  } catch (error) {
    if (error instanceof PublishingException) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new PublishingException(
      PublishErrorCode.PROVIDER_ERROR,
      `Instagram publish failed: ${errorMessage}`,
      {
        retryable: true,
        originalError: error instanceof Error ? error : undefined,
      },
    );
  }
}
