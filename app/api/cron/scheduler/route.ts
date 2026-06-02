import { NextResponse, type NextRequest } from "next/server";

import { AuthorizationErrorCode, toSafeError } from "@/lib/auth";
import { processDuePosts } from "@/lib/publishing";
import {
  assertCronSecret,
  auditAuthorizationDenied,
} from "@/lib/server/authorization";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const client = createServerSupabaseClient();

  try {
    assertCronSecret(request);
  } catch (error) {
    await auditAuthorizationDenied(client, {
      action: "cron.scheduler",
      entityType: "scheduler",
      reason: "cron_unauthorized",
      request,
    });
    const safe = toSafeError(error);

    return NextResponse.json(
      { message: safe.message, code: safe.code ?? AuthorizationErrorCode.CRON_UNAUTHORIZED },
      { status: safe.status },
    );
  }

  try {
    return NextResponse.json(await processDuePosts(client, 25, false));
  } catch {
    return NextResponse.json(
      { message: "Due-post processing failed.", code: "scheduler_failed" },
      { status: 500 },
    );
  }
}
