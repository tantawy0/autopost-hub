import "server-only";

export enum AnalyticsErrorCode {
  INVALID_PLATFORM = "INVALID_PLATFORM",
  INVALID_METRIC_DATE = "INVALID_METRIC_DATE",
  INVALID_METRICS = "INVALID_METRICS",
  DUPLICATE_INGESTION = "DUPLICATE_INGESTION",
  SNAPSHOT_SUPERSEDED = "SNAPSHOT_SUPERSEDED",
  WORKSPACE_REQUIRED = "WORKSPACE_REQUIRED",
  POST_NOT_FOUND = "POST_NOT_FOUND",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

export interface AnalyticsError {
  code: AnalyticsErrorCode;
  message: string;
  retryable: boolean;
  userMessage: string;
  metadata?: Record<string, unknown>;
}

export class AnalyticsException extends Error implements AnalyticsError {
  code: AnalyticsErrorCode;
  retryable: boolean;
  userMessage: string;
  metadata?: Record<string, unknown>;

  constructor(
    code: AnalyticsErrorCode,
    message: string,
    options: {
      retryable?: boolean;
      userMessage?: string;
      metadata?: Record<string, unknown>;
    } = {},
  ) {
    super(message);
    this.name = "AnalyticsException";
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.userMessage = options.userMessage ?? getDefaultAnalyticsUserMessage(code);
    this.metadata = options.metadata;
  }
}

export function getDefaultAnalyticsUserMessage(code: AnalyticsErrorCode): string {
  switch (code) {
    case AnalyticsErrorCode.INVALID_PLATFORM:
      return "Platform is not supported for analytics ingestion.";
    case AnalyticsErrorCode.INVALID_METRIC_DATE:
      return "Metric date must be a valid YYYY-MM-DD value.";
    case AnalyticsErrorCode.INVALID_METRICS:
      return "Analytics metrics are invalid.";
    case AnalyticsErrorCode.DUPLICATE_INGESTION:
      return "These analytics were already ingested.";
    case AnalyticsErrorCode.SNAPSHOT_SUPERSEDED:
      return "A newer analytics snapshot is already active.";
    case AnalyticsErrorCode.WORKSPACE_REQUIRED:
      return "Workspace context is required for analytics ingestion.";
    case AnalyticsErrorCode.POST_NOT_FOUND:
      return "Social post was not found for metric ingestion.";
    default:
      return "Analytics ingestion failed. Please try again.";
  }
}

export function toSafeAnalyticsError(error: unknown): {
  status: number;
  message: string;
  code: string;
} {
  if (error instanceof AnalyticsException) {
    if (error.code === AnalyticsErrorCode.DUPLICATE_INGESTION) {
      return { status: 409, message: error.userMessage, code: error.code };
    }

    if (
      error.code === AnalyticsErrorCode.INVALID_PLATFORM ||
      error.code === AnalyticsErrorCode.INVALID_METRIC_DATE ||
      error.code === AnalyticsErrorCode.INVALID_METRICS ||
      error.code === AnalyticsErrorCode.WORKSPACE_REQUIRED
    ) {
      return { status: 400, message: error.userMessage, code: error.code };
    }

    return {
      status: error.retryable ? 503 : 500,
      message: error.userMessage,
      code: error.code,
    };
  }

  return {
    status: 500,
    message: "Analytics ingestion failed.",
    code: AnalyticsErrorCode.INTERNAL_ERROR,
  };
}
