import "server-only";

export type JobHandlerResult = {
  success: boolean;
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
};
