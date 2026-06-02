import "server-only";

import type { BackgroundJobType } from "@/lib/server/jobs/types";

export type RetryPolicy = {
  maxAttempts: number;
  backoffSeconds: number[];
  retryableErrorCodes: string[];
};

const DEFAULT_RETRYABLE = [
  "worker_failed",
  "PROVIDER_UNAVAILABLE",
  "PROVIDER_RATE_LIMIT",
  "NETWORK_ERROR",
  "TIMEOUT",
  "TOKEN_EXPIRED",
  "INTERNAL_ERROR",
];

export const RETRY_POLICIES: Record<BackgroundJobType, RetryPolicy> = {
  publish_post: {
    maxAttempts: 3,
    backoffSeconds: [30, 120, 600],
    retryableErrorCodes: DEFAULT_RETRYABLE,
  },
  analytics_ingest: {
    maxAttempts: 5,
    backoffSeconds: [10, 30, 60, 180, 300],
    retryableErrorCodes: ["worker_failed", "NETWORK_ERROR", "TIMEOUT", "INTERNAL_ERROR"],
  },
  token_refresh: {
    maxAttempts: 4,
    backoffSeconds: [60, 300, 900, 1800],
    retryableErrorCodes: [
      "worker_failed",
      "NETWORK_ERROR",
      "TIMEOUT",
      "TOKEN_EXPIRED",
      "PROVIDER_UNAVAILABLE",
    ],
  },
  social_sync: {
    maxAttempts: 3,
    backoffSeconds: [120, 600, 1800],
    retryableErrorCodes: [
      "worker_failed",
      "NETWORK_ERROR",
      "TIMEOUT",
      "PROVIDER_RATE_LIMIT",
      "PROVIDER_UNAVAILABLE",
    ],
  },
};

export function getMaxAttempts(jobType: BackgroundJobType): number {
  return RETRY_POLICIES[jobType].maxAttempts;
}

export function getRetryDelaySeconds(jobType: BackgroundJobType, attemptCount: number): number {
  const policy = RETRY_POLICIES[jobType];
  const index = Math.min(Math.max(attemptCount - 1, 0), policy.backoffSeconds.length - 1);

  return policy.backoffSeconds[index] ?? policy.backoffSeconds.at(-1) ?? 60;
}

export function isRetryableErrorCode(
  jobType: BackgroundJobType,
  errorCode: string | null | undefined,
): boolean {
  if (!errorCode) return false;

  return RETRY_POLICIES[jobType].retryableErrorCodes.includes(errorCode);
}
