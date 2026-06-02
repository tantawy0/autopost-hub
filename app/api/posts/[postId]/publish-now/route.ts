import { NextResponse, type NextRequest } from "next/server";

import { toSafeError } from "@/lib/auth";
import { publishPost } from "@/lib/publishing";
import {
  assertPostOwnedByUser,
  requireAuthenticatedUser,
  requireWorkspacePermission,
} from "@/lib/server/authorization";
import { assertRateLimit, getRateLimitKey } from "@/lib/server/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ postId: string }> },
) {
  try {
    const { postId } = await context.params;
    const client = createServerSupabaseClient();
    const user = await requireAuthenticatedUser(client, request);
    await requireWorkspacePermission(client, user, "publish", {
      action: "post.publish_now",
      entityType: "post",
      entityId: postId,
      request,
    });
    await assertPostOwnedByUser(client, user.id, postId, request);
    await assertRateLimit(client, {
      key: getRateLimitKey(request, user.id),
      action: "publish_now",
      limit: 20,
      windowSeconds: 60,
    });
    const body = (await request.json().catch(() => ({}))) as {
      destinationAccountIds?: string[];
      validateOnly?: boolean;
    };
    const result = await publishPost(client, {
      postId,
      userId: user.id,
      destinationAccountIds: body.destinationAccountIds,
      validateOnly: Boolean(body.validateOnly),
    });

    return NextResponse.json(result);
  } catch (error) {
    const safe = toSafeError(error);
    const status =
      safe.code === "server_error" && safe.message.includes("terminal") ? 409 : safe.status;

    return NextResponse.json(safe, { status });
  }
}
