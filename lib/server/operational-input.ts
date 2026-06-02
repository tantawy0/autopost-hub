import "server-only";

import {
  BACKGROUND_JOB_TYPES,
  type BackgroundJobType,
} from "@/lib/server/jobs/types";

const backgroundJobTypes = new Set<string>(BACKGROUND_JOB_TYPES);

export class OperationalInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OperationalInputError";
  }
}

export function parseOperationalLimit(value: unknown, fallback: number): number {
  if (value === undefined) return fallback;

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new OperationalInputError("limit must be a finite number.");
  }

  return Math.min(Math.max(Math.floor(value), 1), 100);
}

export function parseBackgroundJobTypes(value: unknown): BackgroundJobType[] | undefined {
  if (value === undefined) return undefined;

  if (!Array.isArray(value) || value.length === 0) {
    throw new OperationalInputError("jobTypes must be a non-empty array.");
  }

  const unique = [...new Set(value)];

  if (unique.some((jobType) => typeof jobType !== "string" || !backgroundJobTypes.has(jobType))) {
    throw new OperationalInputError("jobTypes contains an unsupported job type.");
  }

  return unique as BackgroundJobType[];
}
