import { NextResponse, type NextRequest } from "next/server";

import { ValidationError, toSafeError } from "@/lib/auth";
import {
  assertPostOwnedByUser,
  requireAuthenticatedUser,
  requireWorkspacePermission,
} from "@/lib/server/authorization";
import { savePostForUser } from "@/lib/server/posts/service";
import { assertRateLimit, getRateLimitKey } from "@/lib/server/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { SavePostInput } from "@/lib/types";

function parseSavePostInput(body: unknown): SavePostInput {
  if (!body || typeof body !== "object") {
    throw new ValidationError("Invalid post payload.");
  }

  const input = body as Partial<SavePostInput>;

  if (typeof input.caption !== "string") throw new ValidationError("Caption is required.");
  if (typeof input.firstComment !== "string") throw new ValidationError("First comment is required.");
  if (input.imageUrl !== null && typeof input.imageUrl !== "string") {
    throw new ValidationError("Invalid media URL.");
  }
  if (!Array.isArray(input.platforms)) throw new ValidationError("Select at least one platform.");
  if (
    input.destinationAccountIds !== undefined &&
    (!Array.isArray(input.destinationAccountIds) ||
      input.destinationAccountIds.some((id) => typeof id !== "string"))
  ) {
    throw new ValidationError("Invalid publishing destination.");
  }
  if (input.status !== "Draft" && input.status !== "Scheduled") {
    throw new ValidationError("Unsupported post status.");
  }
  if (input.scheduledFor !== null && typeof input.scheduledFor !== "string") {
    throw new ValidationError("Invalid schedule time.");
  }

  return {
    postId: typeof input.postId === "string" ? input.postId : undefined,
    caption: input.caption,
    firstComment: input.firstComment,
    imageUrl: input.imageUrl,
    platforms: input.platforms,
    destinationAccountIds: input.destinationAccountIds,
    status: input.status,
    scheduledFor: input.scheduledFor,
    mediaAssets: Array.isArray(input.mediaAssets) ? input.mediaAssets : [],
    internalNotes: typeof input.internalNotes === "string" ? input.internalNotes : undefined,
    postFormat: input.postFormat,
    approvalRequested: Boolean(input.approvalRequested),
  } as SavePostInput;
}

export async function POST(request: NextRequest) {
  try {
    const client = createServerSupabaseClient();
    const user = await requireAuthenticatedUser(client, request);
    const body = await request.json().catch(() => {
      throw new ValidationError("Invalid JSON payload.");
    });
    const post = parseSavePostInput(body);
    const workspace = await requireWorkspacePermission(
      client,
      user,
      post.status === "Scheduled" ? "schedule" : "content_edit",
      {
        action: post.status === "Scheduled" ? "post.schedule" : "post.save",
        entityType: "post",
        entityId: post.postId ?? null,
        request,
      },
    );

    if (post.postId) {
      await assertPostOwnedByUser(client, user.id, post.postId, request);
    }

    await assertRateLimit(client, {
      key: getRateLimitKey(request, user.id),
      action: "post_save",
      limit: 60,
      windowSeconds: 60,
    });

    const saved = await savePostForUser(client, { user, workspace, post });

    return NextResponse.json(saved);
  } catch (error) {
    const safe = toSafeError(error);

    return NextResponse.json(safe, { status: safe.status });
  }
}
