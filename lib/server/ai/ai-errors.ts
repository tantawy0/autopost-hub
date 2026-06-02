import "server-only";

export enum AiErrorCode {
  PROVIDER_UNAVAILABLE = "PROVIDER_UNAVAILABLE",
  PROVIDER_RATE_LIMIT = "PROVIDER_RATE_LIMIT",
  PROVIDER_TIMEOUT = "PROVIDER_TIMEOUT",
  PROVIDER_AUTH_FAILED = "PROVIDER_AUTH_FAILED",
  INVALID_MODEL = "INVALID_MODEL",
  INVALID_PROMPT = "INVALID_PROMPT",
  INVALID_RESPONSE = "INVALID_RESPONSE",
  CONFIGURATION_ERROR = "CONFIGURATION_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

export interface AiError {
  code: AiErrorCode;
  message: string;
  retryable: boolean;
  userMessage: string;
  metadata?: Record<string, unknown>;
}

export class AiProviderException extends Error implements AiError {
  code: AiErrorCode;
  retryable: boolean;
  userMessage: string;
  metadata?: Record<string, unknown>;

  constructor(
    code: AiErrorCode,
    message: string,
    options: {
      retryable?: boolean;
      userMessage?: string;
      metadata?: Record<string, unknown>;
    } = {},
  ) {
    super(message);
    this.name = "AiProviderException";
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.userMessage = options.userMessage ?? getDefaultAiUserMessage(code);
    this.metadata = options.metadata;
  }
}

export function getDefaultAiUserMessage(code: AiErrorCode): string {
  switch (code) {
    case AiErrorCode.PROVIDER_AUTH_FAILED:
      return "AI provider authentication failed. Check server configuration.";
    case AiErrorCode.INVALID_MODEL:
      return "The configured AI model is not allowed.";
    case AiErrorCode.PROVIDER_RATE_LIMIT:
      return "AI provider rate limit reached. Try again shortly.";
    case AiErrorCode.PROVIDER_TIMEOUT:
      return "AI request timed out. Try again.";
    case AiErrorCode.PROVIDER_UNAVAILABLE:
      return "AI provider is temporarily unavailable.";
    default:
      return "AI request failed. Please try again.";
  }
}

export function toSafeAiError(error: unknown): {
  status: number;
  message: string;
  code: string;
} {
  if (error instanceof AiProviderException) {
    if (
      error.code === AiErrorCode.INVALID_MODEL ||
      error.code === AiErrorCode.INVALID_PROMPT ||
      error.code === AiErrorCode.CONFIGURATION_ERROR
    ) {
      return { status: 400, message: error.userMessage, code: error.code };
    }

    if (error.code === AiErrorCode.PROVIDER_RATE_LIMIT) {
      return { status: 429, message: error.userMessage, code: error.code };
    }

    return {
      status: error.retryable ? 503 : 500,
      message: error.userMessage,
      code: error.code,
    };
  }

  return { status: 500, message: "AI request failed.", code: AiErrorCode.INTERNAL_ERROR };
}
