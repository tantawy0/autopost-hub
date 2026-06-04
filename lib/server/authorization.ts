import "server-only";

import crypto from "node:crypto";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

import {
  AuthorizationError,
  AuthorizationErrorCode,
  AuthError,
  OwnershipError,
  getBearerUser,
} from "@/lib/auth";
import { writeAuditLog } from "@/lib/server/audit";
import {
  type WorkspaceContext,
  canAdmin,
  canAnalyze,
  canEdit,
  ensureDefaultWorkspace,
} from "@/lib/workspaces";

export type WorkspacePermission =
  | "publish"
  | "schedule"
  | "analytics"
  | "ai"
  | "social_sync"
  | "channel_manage"
  | "content_edit"
  | "billing_manage";

export function isPermissionAllowed(
  permission: WorkspacePermission,
  role: WorkspaceContext["role"],
): boolean {
  switch (permission) {
    case "publish":
    case "schedule":
    case "social_sync":
    case "content_edit":
      return canEdit(role);
    case "analytics":
    case "ai":
      return canAnalyze(role);
    case "billing_manage":
    case "channel_manage":
      return canAdmin(role);
    default:
      return false;
  }
}

export async function auditAuthorizationDenied(
  client: SupabaseClient,
  input: {
    actorUserId?: string | null;
    workspaceId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    reason: string;
    permission?: WorkspacePermission;
    role?: WorkspaceContext["role"];
    request?: NextRequest;
  },
): Promise<void> {
  await writeAuditLog(client, {
    workspaceId: input.workspaceId ?? null,
    actorUserId: input.actorUserId ?? null,
    action: "authz.denied",
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    metadata: {
      deniedAction: input.action,
      reason: input.reason,
      permission: input.permission ?? null,
      role: input.role ?? null,
    },
    request: input.request,
  }).catch(() => undefined);
}

export async function requireAuthenticatedUser(
  client: SupabaseClient,
  request: NextRequest,
): Promise<User> {
  return getBearerUser(client, request.headers.get("authorization"));
}

export function assertCronSecret(request: NextRequest): void {
  const expectedSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  const token = authorization?.replace(/^Bearer\s+/i, "").trim();
  const authorized =
    Boolean(expectedSecret && token) &&
    expectedSecret!.length === token!.length &&
    crypto.timingSafeEqual(Buffer.from(expectedSecret!), Buffer.from(token!));

  if (!authorized) {
    throw new AuthorizationError(
      AuthorizationErrorCode.CRON_UNAUTHORIZED,
      "Scheduler authorization failed.",
      401,
    );
  }
}

export async function requireWorkspacePermission(
  client: SupabaseClient,
  user: User,
  permission: WorkspacePermission,
  audit?: {
    action: string;
    entityType: string;
    entityId?: string | null;
    request?: NextRequest;
  },
): Promise<WorkspaceContext> {
  const workspace = await ensureDefaultWorkspace(client, user);

  if (!workspace.workspaceId) {
    if (audit) {
      await auditAuthorizationDenied(client, {
        actorUserId: user.id,
        action: audit.action,
        entityType: audit.entityType,
        entityId: audit.entityId,
        reason: "workspace_missing",
        permission,
        request: audit.request,
      });
    }

    throw new AuthorizationError(
      AuthorizationErrorCode.WORKSPACE_REQUIRED,
      "Workspace is required.",
      400,
    );
  }

  if (!isPermissionAllowed(permission, workspace.role)) {
    if (audit) {
      await auditAuthorizationDenied(client, {
        actorUserId: user.id,
        workspaceId: workspace.workspaceId,
        action: audit.action,
        entityType: audit.entityType,
        entityId: audit.entityId,
        reason: "insufficient_role",
        permission,
        role: workspace.role,
        request: audit.request,
      });
    }

    throw new AuthorizationError(
      AuthorizationErrorCode.INSUFFICIENT_ROLE,
      "You do not have permission to perform this action.",
      403,
    );
  }

  return workspace;
}

export async function assertPostOwnedByUser(
  client: SupabaseClient,
  userId: string,
  postId: string,
  request?: NextRequest,
): Promise<{ workspaceId: string | null }> {
  const { data, error } = await client
    .from("posts")
    .select("id, user_id, workspace_id")
    .eq("id", postId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    await auditAuthorizationDenied(client, {
      actorUserId: userId,
      action: "post.access",
      entityType: "post",
      entityId: postId,
      reason: "resource_not_found",
      request,
    });

    throw new AuthorizationError(
      AuthorizationErrorCode.RESOURCE_NOT_FOUND,
      "Post was not found.",
      404,
    );
  }

  if (data.user_id !== userId) {
    await auditAuthorizationDenied(client, {
      actorUserId: userId,
      workspaceId: data.workspace_id,
      action: "post.access",
      entityType: "post",
      entityId: postId,
      reason: "ownership_mismatch",
      request,
    });

    throw new OwnershipError();
  }

  return { workspaceId: data.workspace_id };
}

export async function assertConnectedAccountOwnedByUser(
  client: SupabaseClient,
  userId: string,
  connectedAccountId: string,
  request?: NextRequest,
): Promise<{ workspaceId: string | null }> {
  const { data, error } = await client
    .from("connected_accounts")
    .select("id, user_id, workspace_id")
    .eq("id", connectedAccountId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    await auditAuthorizationDenied(client, {
      actorUserId: userId,
      action: "connected_account.access",
      entityType: "connected_account",
      entityId: connectedAccountId,
      reason: "resource_not_found",
      request,
    });

    throw new AuthorizationError(
      AuthorizationErrorCode.RESOURCE_NOT_FOUND,
      "Connected account was not found.",
      404,
    );
  }

  if (data.user_id !== userId) {
    await auditAuthorizationDenied(client, {
      actorUserId: userId,
      workspaceId: data.workspace_id,
      action: "connected_account.access",
      entityType: "connected_account",
      entityId: connectedAccountId,
      reason: "ownership_mismatch",
      request,
    });

    throw new OwnershipError();
  }

  return { workspaceId: data.workspace_id };
}

/** Service-role clients bypass RLS — always scope queries by authenticated user_id. */
export function assertRlsCompatibleUserScope(userId: string, resourceUserId: string | null | undefined) {
  if (!resourceUserId || resourceUserId !== userId) {
    throw new OwnershipError();
  }
}

export { AuthError, AuthorizationError, AuthorizationErrorCode, OwnershipError };
