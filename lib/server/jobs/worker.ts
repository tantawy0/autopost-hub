import "server-only";

import { randomUUID } from "crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { executeBackgroundJob } from "@/lib/server/jobs/handlers/index";
import { logWorkerEvent } from "@/lib/server/jobs/logger";
import {
  claimBackgroundJobs,
  completeBackgroundJob,
  hasCompletedIdempotentJob,
  releaseBackgroundJob,
  releaseStaleProcessingJobs,
} from "@/lib/server/jobs/queue";
import type {
  BackgroundJobType,
  WorkerHealthSnapshot,
  WorkerRunOptions,
  WorkerRunResult,
} from "@/lib/server/jobs/types";

const DEFAULT_JOB_TYPES: BackgroundJobType[] = [
  "publish_post",
  "analytics_ingest",
  "token_refresh",
  "social_sync",
];

type WorkerRuntimeState = {
  state: WorkerHealthSnapshot["state"];
  workerId: string | null;
  startedAt: string | null;
  lastHeartbeatAt: string | null;
  inFlightJobIds: string[];
  shutdownRequested: boolean;
  lastRun: WorkerRunResult | null;
};

const runtime: WorkerRuntimeState = {
  state: "idle",
  workerId: null,
  startedAt: null,
  lastHeartbeatAt: null,
  inFlightJobIds: [],
  shutdownRequested: false,
  lastRun: null,
};

function touchHeartbeat() {
  runtime.lastHeartbeatAt = new Date().toISOString();
}

export function requestWorkerShutdown() {
  runtime.shutdownRequested = true;
  runtime.state = "shutting_down";
  logWorkerEvent("warn", {
    workerId: runtime.workerId,
    action: "shutdown_requested",
  });
}

export function getWorkerHealth(): WorkerHealthSnapshot {
  return {
    state: runtime.state,
    workerId: runtime.workerId,
    startedAt: runtime.startedAt,
    lastHeartbeatAt: runtime.lastHeartbeatAt,
    inFlightJobIds: [...runtime.inFlightJobIds],
    shutdownRequested: runtime.shutdownRequested,
    lastRun: runtime.lastRun,
  };
}

function shouldStop(signal?: AbortSignal): boolean {
  return runtime.shutdownRequested || Boolean(signal?.aborted);
}

export async function runWorker(
  client: SupabaseClient,
  options: WorkerRunOptions = {},
): Promise<WorkerRunResult> {
  const workerId = options.workerId ?? `worker-${randomUUID().slice(0, 8)}`;
  const jobTypes = options.jobTypes ?? DEFAULT_JOB_TYPES;
  const limit = Math.min(Math.max(options.limit ?? 25, 1), 100);
  const result: WorkerRunResult = {
    claimed: 0,
    processed: 0,
    succeeded: 0,
    retried: 0,
    failed: 0,
    deadLettered: 0,
    skipped: 0,
    released: 0,
  };

  runtime.state = "running";
  runtime.workerId = workerId;
  runtime.startedAt = runtime.startedAt ?? new Date().toISOString();
  touchHeartbeat();

  if (options.dryRun) {
    const { data, error } = await client
      .from("background_jobs")
      .select("id")
      .in("status", ["queued", "retrying"])
      .in("job_type", jobTypes)
      .lte("run_after", new Date().toISOString())
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    result.claimed = (data ?? []).length;
    runtime.lastRun = result;
    runtime.state = "idle";
    return result;
  }

  await releaseStaleProcessingJobs(client);

  const jobs = await claimBackgroundJobs(client, {
    workerId,
    jobTypes,
    limit,
    userId: options.userId,
  });

  result.claimed = jobs.length;
  touchHeartbeat();

  for (const job of jobs) {
    if (shouldStop(options.signal)) {
      await releaseBackgroundJob(client, job.id, workerId);
      result.released += 1;
      runtime.inFlightJobIds = runtime.inFlightJobIds.filter((id) => id !== job.id);
      continue;
    }

    runtime.inFlightJobIds.push(job.id);
    touchHeartbeat();

    if (await hasCompletedIdempotentJob(client, job.idempotency_key)) {
      await completeBackgroundJob(client, job, {
        workerId,
        success: true,
      });
      result.skipped += 1;
      runtime.inFlightJobIds = runtime.inFlightJobIds.filter((id) => id !== job.id);
      continue;
    }

    result.processed += 1;

    const handlerResult = await executeBackgroundJob(client, job, workerId);
    const terminalStatus = await completeBackgroundJob(client, job, {
      workerId,
      success: handlerResult.success,
      errorCode: handlerResult.errorCode,
      errorMessage: handlerResult.errorMessage,
    });

    if (terminalStatus === "succeeded") result.succeeded += 1;
    if (terminalStatus === "retrying") result.retried += 1;
    if (terminalStatus === "failed") result.failed += 1;
    if (terminalStatus === "dead_letter") result.deadLettered += 1;

    runtime.inFlightJobIds = runtime.inFlightJobIds.filter((id) => id !== job.id);
    touchHeartbeat();

    if (shouldStop(options.signal)) {
      break;
    }
  }

  runtime.lastRun = result;
  runtime.state = runtime.shutdownRequested ? "shutting_down" : "idle";

  logWorkerEvent("info", {
    workerId,
    action: "worker_run_complete",
    metadata: result as unknown as Record<string, unknown>,
  });

  return result;
}

if (typeof process !== "undefined") {
  const shutdown = () => requestWorkerShutdown();
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}
