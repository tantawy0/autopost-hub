import type { SupabaseClient, User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

export class AuthError extends Error {
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "AuthError";
  }
}

export class OwnershipError extends Error {
  constructor(message = "You do not have access to this resource.") {
    super(message);
    this.name = "OwnershipError";
  }
}

export class ValidationError extends Error {
  code = "validation_error";
  status = 400;

  constructor(message = "Invalid request.") {
    super(message);
    this.name = "ValidationError";
  }
}

export enum AuthorizationErrorCode {
  AUTH_REQUIRED = "auth_required",
  FORBIDDEN = "forbidden",
  INSUFFICIENT_ROLE = "insufficient_role",
  WORKSPACE_REQUIRED = "workspace_required",
  CRON_UNAUTHORIZED = "cron_unauthorized",
  RESOURCE_NOT_FOUND = "resource_not_found",
}

export class AuthorizationError extends Error {
  code: AuthorizationErrorCode;
  status: number;

  constructor(
    code: AuthorizationErrorCode,
    message: string,
    status: number = 403,
  ) {
    super(message);
    this.name = "AuthorizationError";
    this.code = code;
    this.status = status;
  }
}

export async function getClientUser(): Promise<User> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    throw new AuthError();
  }

  return session.user;
}

export async function getBearerUser(
  client: SupabaseClient,
  authorizationHeader: string | null,
): Promise<User> {
  const token = authorizationHeader?.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    throw new AuthError();
  }

  const { data, error } = await client.auth.getUser(token);

  if (error || !data.user) {
    throw new AuthError();
  }

  return data.user;
}

export function assertOwner(resourceUserId: string | null | undefined, userId: string) {
  if (!resourceUserId || resourceUserId !== userId) {
    throw new OwnershipError();
  }
}

export function toSafeError(error: unknown): { status: number; message: string; code: string } {
  if (error instanceof AuthError) {
    return { status: 401, message: error.message, code: AuthorizationErrorCode.AUTH_REQUIRED };
  }

  if (error instanceof AuthorizationError) {
    return { status: error.status, message: error.message, code: error.code };
  }

  if (error instanceof OwnershipError) {
    return { status: 403, message: error.message, code: AuthorizationErrorCode.FORBIDDEN };
  }

  if (error instanceof ValidationError) {
    return { status: error.status, message: error.message, code: error.code };
  }

  if (error instanceof Error && error.name === "RateLimitError") {
    return { status: 429, message: error.message, code: "rate_limited" };
  }

  if (error instanceof Error && error.name === "PlanLimitError") {
    const planError = error as Error & { status?: number; code?: string };
    return {
      status: planError.status ?? 402,
      message: error.message,
      code: planError.code ?? "plan_limit_exceeded",
    };
  }

  return { status: 500, message: "Internal server error.", code: "server_error" };
}
