import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { publishPostIdempotencyKey } from "@/lib/server/jobs/idempotency";
import { logWorkerEvent } from "@/lib/server/jobs/logger";
import {
  getMaxAttempts,
  getRetryDelaySeconds,
  isRetryableErrorCode,
} from "@/lib/server/jobs/retry-policies";
import type {
  BackgroundJobRow,
  BackgroundJobType,
  PostQueueJobRow,
  QueueJobStatus,
} from "@/lib/server/jobs/types";

type EnqueueBackgroundJobInput = {
  workspaceId?: string | null;
  userId: string;
  jobType: BackgroundJobType;
  idempotencyKey: string;
  payload?: Record<string, unknown>;
  runAfter?: string;
};

type DuePostRow = {
  id: string;
  user_id: string;
  workspace_id?: string | null;
  scheduled_for?: string | null;
  schedule_time?: string | null;
};

export async function findActiveBackgroundJob(
  client: SupabaseClient,
  idempotencyKey: string,
): Promise<BackgroundJobRow | null> {
  const { data } = await client
    .from("background_jobs")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .in("status", ["queued", "processing", "retrying"])
    .maybeSingle();

  return (data as BackgroundJobRow | null) ?? null;
}

export async function enqueueBackgroundJob(
  client: SupabaseClient,
  input: EnqueueBackgroundJobInput,
): Promise<{ enqueued: boolean; jobId: string | null; duplicate: boolean }> {
  const existing = await findActiveBackgroundJob(client, input.idempotencyKey);

  if (existing) {
    return { enqueued: false, jobId: existing.id, duplicate: true };
  }

  const { data: recentSuccess } = await client
    .from("background_jobs")
    .select("id")
    .eq("idempotency_key", input.idempotencyKey)
    .eq("status", "succeeded")
    .gte("updated_at", new Date(Date.now() - 1000 * 60 * 15).toISOString())
    .maybeSingle();

  if (recentSuccess?.id) {
    return { enqueued: false, jobId: recentSuccess.id as string, duplicate: true };
  }

  const { data, error } = await client
    .from("background_jobs")
    .insert([
      {
        workspace_id: input.workspaceId ?? null,
        user_id: input.userId,
        job_type: input.jobType,
        status: "queued",
        run_after: input.runAfter ?? new Date().toISOString(),
        max_attempts: getMaxAttempts(input.jobType),
        idempotency_key: input.idempotencyKey,
        payload: input.payload ?? {},
        recovery_metadata: { source: "enqueue" },
        updated_at: new Date().toISOString(),
      },
    ])
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      const duplicate = await findActiveBackgroundJob(client, input.idempotencyKey);
      return { enqueued: false, jobId: duplicate?.id ?? null, duplicate: true };
    }

    throw new Error(error.message);
  }

  return { enqueued: true, jobId: data.id as string, duplicate: false };
}

export async function enqueueDuePosts(
  client: SupabaseClient,
  posts: DuePostRow[],
): Promise<void> {
  if (posts.length === 0) return;

  const now = new Date().toISOString();

  await client
    .from("post_queue_jobs")
    .upsert(
      posts.map((post) => ({
        workspace_id: post.workspace_id ?? null,
        user_id: post.user_id,
        post_id: post.id,
        status: "queued",
        run_after: post.scheduled_for ?? post.schedule_time ?? now,
        idempotency_key: publishPostIdempotencyKey(post.id),
        payload: { source: "scheduler" },
        recovery_metadata: { source: "scheduler" },
        updated_at: now,
      })),
      { onConflict: "post_id" },
    )
    .then(() => undefined);

  for (const post of posts) {
    await enqueueBackgroundJob(client, {
      workspaceId: post.workspace_id ?? null,
      userId: post.user_id,
      jobType: "publish_post",
      idempotencyKey: publishPostIdempotencyKey(post.id),
      payload: { postId: post.id, source: "scheduler" },
      runAfter: post.scheduled_for ?? post.schedule_time ?? now,
    });
  }
}

export async function releaseStaleProcessingJobs(client: SupabaseClient): Promise<number> {
  const staleBefore = new Date(Date.now() - 1000 * 60 * 10).toISOString();
  const { data, error } = await client
    .from("background_jobs")
    .update({
      status: "retrying",
      locked_at: null,
      locked_by: null,
      run_after: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      recovery_metadata: {
        reason: "stale_lock_released",
        releasedAt: new Date().toISOString(),
      },
    })
    .eq("status", "processing")
    .lt("locked_at", staleBefore)
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).length;
}

export async function claimBackgroundJobs(
  client: SupabaseClient,
  input: {
    workerId: string;
    jobTypes: BackgroundJobType[];
    limit: number;
    userId?: string;
  },
): Promise<BackgroundJobRow[]> {
  const now = new Date().toISOString();
  let query = client
    .from("background_jobs")
    .select("*")
    .in("status", ["queued", "retrying"])
    .in("job_type", input.jobTypes)
    .lte("run_after", now)
    .order("run_after", { ascending: true })
    .limit(input.limit);

  if (input.userId) {
    query = query.eq("user_id", input.userId);
  }

  const { data: candidates, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const claimed: BackgroundJobRow[] = [];

  for (const candidate of (candidates ?? []) as BackgroundJobRow[]) {
    const nextAttempt = candidate.attempt_count + 1;
    const { data: locked, error: lockError } = await client
      .from("background_jobs")
      .update({
        status: "processing",
        locked_at: now,
        locked_by: input.workerId,
        attempt_count: nextAttempt,
        updated_at: now,
      })
      .eq("id", candidate.id)
      .in("status", ["queued", "retrying"])
      .select("*")
      .maybeSingle();

    if (lockError) {
      throw new Error(lockError.message);
    }

    if (locked) {
      claimed.push(locked as BackgroundJobRow);
    }

    if (claimed.length >= input.limit) {
      break;
    }
  }

  return claimed;
}

export async function releaseBackgroundJob(
  client: SupabaseClient,
  jobId: string,
  workerId: string,
): Promise<void> {
  await client
    .from("background_jobs")
    .update({
      status: "queued",
      locked_at: null,
      locked_by: null,
      updated_at: new Date().toISOString(),
      recovery_metadata: {
        releasedBy: workerId,
        releasedAt: new Date().toISOString(),
        reason: "worker_shutdown",
      },
    })
    .eq("id", jobId)
    .eq("locked_by", workerId)
    .eq("status", "processing")
    .then(() => undefined);
}

function buildRecoveryMetadata(
  job: BackgroundJobRow,
  input: {
    errorCode?: string | null;
    errorMessage?: string | null;
    terminalStatus: QueueJobStatus;
    nextRunAfter?: string | null;
  },
): Record<string, unknown> {
  return {
    ...job.recovery_metadata,
    jobType: job.job_type,
    attemptCount: job.attempt_count,
    maxAttempts: job.max_attempts,
    terminalStatus: input.terminalStatus,
    errorCode: input.errorCode ?? null,
    errorMessage: input.errorMessage ?? null,
    nextRunAfter: input.nextRunAfter ?? null,
    recoverable:
      input.terminalStatus === "retrying" || input.terminalStatus === "dead_letter",
    lastUpdatedAt: new Date().toISOString(),
  };
}

export async function completeBackgroundJob(
  client: SupabaseClient,
  job: BackgroundJobRow,
  input: {
    workerId: string;
    errorCode?: string | null;
    errorMessage?: string | null;
    success?: boolean;
  },
): Promise<QueueJobStatus> {
  const success = input.success ?? false;
  const errorCode = input.errorCode ?? null;
  const retryable = isRetryableErrorCode(job.job_type, errorCode);
  const exhausted = job.attempt_count >= job.max_attempts;

  let terminalStatus: QueueJobStatus = success ? "succeeded" : "failed";
  let runAfter: string | null = null;

  if (!success && retryable && !exhausted) {
    terminalStatus = "retrying";
    const delaySeconds = getRetryDelaySeconds(job.job_type, job.attempt_count);
    runAfter = new Date(Date.now() + delaySeconds * 1000).toISOString();
  } else if (!success && (!retryable || exhausted)) {
    terminalStatus = "dead_letter";
  }

  const recoveryMetadata = buildRecoveryMetadata(job, {
    errorCode,
    errorMessage: input.errorMessage ?? null,
    terminalStatus,
    nextRunAfter: runAfter,
  });

  const update: Record<string, unknown> = {
    status: terminalStatus,
    last_error_code: errorCode,
    last_error_message: input.errorMessage ?? null,
    recovery_metadata: recoveryMetadata,
    locked_at: null,
    locked_by: null,
    updated_at: new Date().toISOString(),
  };

  if (runAfter) {
    update.run_after = runAfter;
  }

  if (terminalStatus === "dead_letter") {
    update.dead_lettered_at = new Date().toISOString();
  }

  await client.from("background_jobs").update(update).eq("id", job.id).then(() => undefined);

  if (job.job_type === "publish_post") {
    const postId = typeof job.payload.postId === "string" ? job.payload.postId : null;
    if (postId) {
      await syncPostQueueJob(client, postId, terminalStatus, {
        workerId: input.workerId,
        errorCode,
        errorMessage: input.errorMessage ?? null,
        recoveryMetadata,
        runAfter,
      });
    }
  }

  logWorkerEvent(terminalStatus === "succeeded" ? "info" : "warn", {
    workerId: input.workerId,
    jobId: job.id,
    jobType: job.job_type,
    action: "job_terminal",
    attemptCount: job.attempt_count,
    errorCode,
    errorMessage: input.errorMessage ?? null,
    metadata: { terminalStatus },
  });

  return terminalStatus;
}

async function syncPostQueueJob(
  client: SupabaseClient,
  postId: string,
  status: QueueJobStatus,
  input: {
    workerId: string;
    errorCode?: string | null;
    errorMessage?: string | null;
    recoveryMetadata: Record<string, unknown>;
    runAfter?: string | null;
  },
) {
  const mapped =
    status === "succeeded"
      ? "succeeded"
      : status === "retrying"
        ? "retrying"
        : status === "dead_letter"
          ? "dead_letter"
          : "failed";

  const update: Record<string, unknown> = {
    status: mapped,
    locked_by: input.workerId,
    last_error_code: input.errorCode ?? null,
    last_error_message: input.errorMessage ?? null,
    recovery_metadata: input.recoveryMetadata,
    updated_at: new Date().toISOString(),
  };

  if (input.runAfter) {
    update.run_after = input.runAfter;
  }

  if (mapped === "dead_letter") {
    update.dead_lettered_at = new Date().toISOString();
  }

  update.locked_at = null;

  await client
    .from("post_queue_jobs")
    .update(update)
    .eq("post_id", postId)
    .in("status", ["queued", "processing", "retrying", "failed"])
    .then(() => undefined);
}

export async function markQueueJob(
  client: SupabaseClient,
  postId: string,
  status: "processing" | "retrying" | "succeeded" | "failed" | "dead_letter",
  input: {
    workerId?: string;
    errorCode?: string | null;
    errorMessage?: string | null;
    recoveryMetadata?: Record<string, unknown>;
    incrementAttempt?: boolean;
  } = {},
) {
  const { data: existing } = await client
    .from("post_queue_jobs")
    .select("attempt_count, max_attempts, recovery_metadata")
    .eq("post_id", postId)
    .maybeSingle();

  const row = existing as PostQueueJobRow | null;
  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
    idempotency_key: publishPostIdempotencyKey(postId),
  };

  if (status === "processing") {
    update.locked_at = new Date().toISOString();
    update.locked_by = input.workerId ?? "scheduler";
    update.attempt_count = input.incrementAttempt === false ? row?.attempt_count ?? 1 : (row?.attempt_count ?? 0) + 1;
  } else {
    update.locked_at = null;
  }

  if (input.errorCode || input.errorMessage) {
    update.last_error_code = input.errorCode ?? "worker_error";
    update.last_error_message = input.errorMessage ?? null;
  }

  if (input.recoveryMetadata) {
    update.recovery_metadata = input.recoveryMetadata;
  } else if (input.errorCode || input.errorMessage) {
    update.recovery_metadata = {
      ...(row?.recovery_metadata ?? {}),
      errorCode: input.errorCode ?? null,
      errorMessage: input.errorMessage ?? null,
      terminalStatus: status,
      recoverable: status === "retrying",
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  if (status === "dead_letter") {
    update.dead_lettered_at = new Date().toISOString();
  }

  await client
    .from("post_queue_jobs")
    .update(update)
    .eq("post_id", postId)
    .in("status", ["queued", "processing", "retrying", "failed"])
    .then(() => undefined);
}

export async function hasCompletedIdempotentJob(
  client: SupabaseClient,
  idempotencyKey: string,
): Promise<boolean> {
  const { data } = await client
    .from("background_jobs")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .eq("status", "succeeded")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return Boolean(data?.id);
}
