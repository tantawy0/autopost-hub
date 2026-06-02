import "server-only";

/**
 * Structured publishing error types for type-safe error handling and recovery
 */

export enum PublishErrorCode {
  // Token/Auth errors (recoverable via reconnect)
  INVALID_TOKEN = "INVALID_TOKEN",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  TOKEN_REVOKED = "TOKEN_REVOKED",
  MISSING_SCOPES = "MISSING_SCOPES",
  ACCOUNT_DISCONNECTED = "ACCOUNT_DISCONNECTED",

  // Account state errors
  ACCOUNT_INACTIVE = "ACCOUNT_INACTIVE",
  PAGE_NOT_ACCESSIBLE = "PAGE_NOT_ACCESSIBLE",
  PERMISSION_DENIED = "PERMISSION_DENIED",

  // Content validation errors (not recoverable)
  INVALID_CONTENT = "INVALID_CONTENT",
  MEDIA_REQUIRED = "MEDIA_REQUIRED",
  UNSUPPORTED_MEDIA_TYPE = "UNSUPPORTED_MEDIA_TYPE",
  CONTENT_TOO_LONG = "CONTENT_TOO_LONG",
  UNSUPPORTED_PLATFORM = "UNSUPPORTED_PLATFORM",

  // Provider-specific errors
  PROVIDER_UNAVAILABLE = "PROVIDER_UNAVAILABLE",
  PROVIDER_RATE_LIMIT = "PROVIDER_RATE_LIMIT",
  PROVIDER_ERROR = "PROVIDER_ERROR",

  // System errors
  INTERNAL_ERROR = "INTERNAL_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT = "TIMEOUT",
}

export interface PublishError {
  code: PublishErrorCode;
  message: string;
  retryable: boolean;
  userMessage: string;
  originalError?: Error;
  metadata?: Record<string, unknown>;
}

export class PublishingException extends Error implements PublishError {
  code: PublishErrorCode;
  retryable: boolean;
  userMessage: string;
  metadata?: Record<string, unknown>;

  constructor(
    code: PublishErrorCode,
    message: string,
    options: {
      retryable?: boolean;
      userMessage?: string;
      metadata?: Record<string, unknown>;
      originalError?: Error;
    } = {},
  ) {
    super(message);
    this.name = "PublishingException";
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.userMessage =
      options.userMessage ??
      getDefaultUserMessage(code);
    this.metadata = options.metadata;
    if (options.originalError) {
      this.cause = options.originalError;
    }
  }
}

export function getDefaultUserMessage(code: PublishErrorCode): string {
  switch (code) {
    case PublishErrorCode.INVALID_TOKEN:
    case PublishErrorCode.TOKEN_EXPIRED:
    case PublishErrorCode.TOKEN_REVOKED:
      return "Account authorization has expired. Please reconnect.";
    case PublishErrorCode.MISSING_SCOPES:
      return "Account is missing required permissions. Please reconnect.";
    case PublishErrorCode.ACCOUNT_DISCONNECTED:
      return "Account is no longer connected. Please reconnect.";
    case PublishErrorCode.ACCOUNT_INACTIVE:
      return "Account is inactive or disabled.";
    case PublishErrorCode.PAGE_NOT_ACCESSIBLE:
      return "Page is not accessible. Please check your account.";
    case PublishErrorCode.PERMISSION_DENIED:
      return "You don't have permission to publish to this account.";
    case PublishErrorCode.INVALID_CONTENT:
      return "Content is invalid for this platform.";
    case PublishErrorCode.MEDIA_REQUIRED:
      return "This platform requires media to post.";
    case PublishErrorCode.UNSUPPORTED_MEDIA_TYPE:
      return "This media type is not supported.";
    case PublishErrorCode.CONTENT_TOO_LONG:
      return "Content is too long for this platform.";
    case PublishErrorCode.UNSUPPORTED_PLATFORM:
      return "This platform is not yet supported for publishing.";
    case PublishErrorCode.PROVIDER_UNAVAILABLE:
      return "The service is temporarily unavailable. Try again later.";
    case PublishErrorCode.PROVIDER_RATE_LIMIT:
      return "You're posting too quickly. Please wait a moment.";
    case PublishErrorCode.PROVIDER_ERROR:
      return "The service rejected your request. Try again later.";
    case PublishErrorCode.NETWORK_ERROR:
      return "Network error. Check your connection and try again.";
    case PublishErrorCode.TIMEOUT:
      return "Request took too long. Try again later.";
    case PublishErrorCode.INTERNAL_ERROR:
      return "An unexpected error occurred. Please try again.";
    default:
      return "Publishing failed. Please try again.";
  }
}

export function isRetryableError(code: PublishErrorCode): boolean {
  const nonRetryableCodes = [
    PublishErrorCode.INVALID_CONTENT,
    PublishErrorCode.MEDIA_REQUIRED,
    PublishErrorCode.UNSUPPORTED_MEDIA_TYPE,
    PublishErrorCode.CONTENT_TOO_LONG,
    PublishErrorCode.UNSUPPORTED_PLATFORM,
    PublishErrorCode.MISSING_SCOPES,
    PublishErrorCode.PERMISSION_DENIED,
  ];
  return !nonRetryableCodes.includes(code);
}
