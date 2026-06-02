import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ingestAnalyticsMetrics } from "@/lib/server/services/analytics-ingest";
import { refreshAccountTokenIfNeeded } from "@/lib/oauth-tokens";
import { runSocialSyncJob } from "@/lib/server/jobs/handlers/social-sync";
import type { JobHandlerResult } from "@/lib/server/jobs/handlers/result";
import { logWorkerEvent } from "@/lib/server/jobs/logger";
import type { BackgroundJobRow } from "@/lib/server/jobs/types";

export type { JobHandlerResult } from "@/lib/server/jobs/handlers/result";

export async function executeBackgroundJob(
  client: SupabaseClient,
  job: BackgroundJobRow,
  workerId: string,
): Promise<JobHandlerResult> {
  const started = Date.now();

  logWorkerEvent("info", {
    workerId,
    jobId: job.id,
    jobType: job.job_type,
    action: "job_start",
    attemptCount: job.attempt_count,
  });

  try {
    const result = await dispatchJob(client, job);

    logWorkerEvent("info", {
      workerId,
      jobId: job.id,
      jobType: job.job_type,
      action: "job_finish",
      durationMs: Date.now() - started,
      metadata: result.metadata,
    });

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Worker job failed.";

    logWorkerEvent("error", {
      workerId,
      jobId: job.id,
      jobType: job.job_type,
      action: "job_error",
      durationMs: Date.now() - started,
      errorCode: "worker_failed",
      errorMessage: message,
    });

    return {
      success: false,
      errorCode: "worker_failed",
      errorMessage: message,
    };
  }
}

async function dispatchJob(
  client: SupabaseClient,
  job: BackgroundJobRow,
): Promise<JobHandlerResult> {
  switch (job.job_type) {
    case "publish_post": {
      const postId = typeof job.payload.postId === "string" ? job.payload.postId : null;
      if (!postId) {
        return {
          success: false,
          errorCode: "INVALID_CONTENT",
          errorMessage: "publish_post job missing postId.",
        };
      }

      const { publishPost } = await import("@/lib/publishing");
      const result = await publishPost(client, { postId, userId: job.user_id });
      const success = result.status !== "Failed";

      return {
        success,
        errorCode: success ? null : "worker_failed",
        errorMessage: success ? null : `Publish finished with status ${result.status}.`,
        metadata: { postStatus: result.status },
      };
    }
    case "analytics_ingest": {
      const platform = typeof job.payload.platform === "string" ? job.payload.platform : null;
      const metricDate = typeof job.payload.metricDate === "string" ? job.payload.metricDate : null;
      const workspaceId =
        typeof job.payload.workspaceId === "string"
          ? job.payload.workspaceId
          : job.workspace_id;

      if (!platform || !metricDate || !workspaceId) {
        return {
          success: false,
          errorCode: "INVALID_CONTENT",
          errorMessage: "analytics_ingest job missing platform, metricDate, or workspaceId.",
        };
      }

      const result = await ingestAnalyticsMetrics(client, {
        workspaceId,
        userId: job.user_id,
        platform,
        metricDate,
        impressions: Number(job.payload.impressions ?? 0),
        reach: Number(job.payload.reach ?? 0),
        engagement: Number(job.payload.engagement ?? 0),
        clicks: Number(job.payload.clicks ?? 0),
      });

      return {
        success: true,
        metadata: { platform, metricDate, duplicate: result.duplicate },
      };
    }
    case "token_refresh": {
      const connectedAccountId =
        typeof job.payload.connectedAccountId === "string"
          ? job.payload.connectedAccountId
          : null;

      if (!connectedAccountId) {
        return {
          success: false,
          errorCode: "INVALID_CONTENT",
          errorMessage: "token_refresh job missing connectedAccountId.",
        };
      }

      const { data: account, error } = await client
        .from("connected_accounts")
        .select(
          "id, user_id, workspace_id, platform, access_token, token_ciphertext, token_expires_at, refresh_token, refresh_token_ciphertext",
        )
        .eq("id", connectedAccountId)
        .eq("user_id", job.user_id)
        .single();

      if (error || !account) {
        return {
          success: false,
          errorCode: "ACCOUNT_DISCONNECTED",
          errorMessage: "Connected account not found for token refresh.",
        };
      }

      const refreshed = await refreshAccountTokenIfNeeded(client, account);

      return {
        success: Boolean(refreshed.access_token),
        errorCode: refreshed.access_token ? null : "TOKEN_EXPIRED",
        errorMessage: refreshed.access_token ? null : "Token refresh did not produce an access token.",
        metadata: { connectedAccountId },
      };
    }
    case "social_sync":
      return runSocialSyncJob(client, job);
    default:
      return {
        success: false,
        errorCode: "INTERNAL_ERROR",
        errorMessage: `Unsupported job type: ${job.job_type as string}`,
      };
  }
}
