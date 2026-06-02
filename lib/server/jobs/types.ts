import "server-only";

export const BACKGROUND_JOB_TYPES = [
  "publish_post",
  "analytics_ingest",
  "token_refresh",
  "social_sync",
] as const;

export type BackgroundJobType = (typeof BACKGROUND_JOB_TYPES)[number];

export type QueueJobStatus =
  | "queued"
  | "processing"
  | "retrying"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "dead_letter";

export type BackgroundJobRow = {
  id: string;
  workspace_id?: string | null;
  user_id: string;
  job_type: BackgroundJobType;
  status: QueueJobStatus;
  run_after: string;
  locked_at?: string | null;
  locked_by?: string | null;
  attempt_count: number;
  max_attempts: number;
  idempotency_key: string;
  last_error_code?: string | null;
  last_error_message?: string | null;
  payload: Record<string, unknown>;
  recovery_metadata: Record<string, unknown>;
  dead_lettered_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type PostQueueJobRow = {
  id: string;
  workspace_id?: string | null;
  user_id: string;
  post_id: string;
  status: QueueJobStatus;
  run_after: string;
  locked_at?: string | null;
  locked_by?: string | null;
  attempt_count: number;
  max_attempts: number;
  idempotency_key?: string | null;
  last_error_code?: string | null;
  last_error_message?: string | null;
  payload: Record<string, unknown>;
  recovery_metadata?: Record<string, unknown>;
  dead_lettered_at?: string | null;
};

export type WorkerRunOptions = {
  workerId?: string;
  jobTypes?: BackgroundJobType[];
  limit?: number;
  dryRun?: boolean;
  userId?: string;
  signal?: AbortSignal;
};

export type WorkerRunResult = {
  claimed: number;
  processed: number;
  succeeded: number;
  retried: number;
  failed: number;
  deadLettered: number;
  skipped: number;
  released: number;
};

export type WorkerHealthSnapshot = {
  state: "idle" | "running" | "shutting_down";
  workerId: string | null;
  startedAt: string | null;
  lastHeartbeatAt: string | null;
  inFlightJobIds: string[];
  shutdownRequested: boolean;
  lastRun: WorkerRunResult | null;
};
