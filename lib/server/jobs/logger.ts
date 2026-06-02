import "server-only";

type WorkerLogLevel = "info" | "warn" | "error";

type WorkerLogFields = {
  workerId?: string | null;
  jobId?: string;
  jobType?: string;
  action: string;
  durationMs?: number;
  attemptCount?: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
};

export function logWorkerEvent(level: WorkerLogLevel, fields: WorkerLogFields) {
  const entry = {
    scope: "worker",
    level,
    timestamp: new Date().toISOString(),
    ...fields,
  };

  const serialized = JSON.stringify(entry);

  if (level === "error") {
    console.error(serialized);
    return;
  }

  if (level === "warn") {
    console.warn(serialized);
    return;
  }

  console.info(serialized);
}
