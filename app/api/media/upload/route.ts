import { NextResponse, type NextRequest } from "next/server";

import { ValidationError, toSafeError } from "@/lib/auth";
import {
  requireAuthenticatedUser,
  requireWorkspacePermission,
} from "@/lib/server/authorization";
import { uploadMediaAssetForUser } from "@/lib/server/posts/service";
import { assertRateLimit, getRateLimitKey } from "@/lib/server/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const client = createServerSupabaseClient();
    const user = await requireAuthenticatedUser(client, request);
    const workspace = await requireWorkspacePermission(client, user, "content_edit", {
      action: "media.upload",
      entityType: "media_asset",
      request,
    });

    await assertRateLimit(client, {
      key: getRateLimitKey(request, user.id),
      action: "media_upload",
      limit: 20,
      windowSeconds: 60,
    });

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new ValidationError("Upload a valid media file.");
    }

    const asset = await uploadMediaAssetForUser(client, { user, workspace, file });

    return NextResponse.json(asset);
  } catch (error) {
    const safe = toSafeError(error);

    return NextResponse.json(safe, { status: safe.status });
  }
}
