import { NextResponse, type NextRequest } from "next/server";

import { AuthorizationErrorCode, toSafeError } from "@/lib/auth";
import { processDuePosts } from "@/lib/publishing";
import {
  assertCronSecret,
  auditAuthorizationDenied,
} from "@/lib/server/authorization";
import {
  OperationalInputError,
  parseOperationalLimit,
} from "@/lib/server/operational-input";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    assertCronSecret(request);
  } catch (error) {
    const client = createServerSupabaseClient();
    await auditAuthorizationDenied(client, {
      action: "scheduler.process_due_posts",
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

  const body = (await request.json().catch(() => ({}))) as {
    limit?: number;
    dryRun?: boolean;
  };
  try {
    const limit = parseOperationalLimit(body.limit, 25);
    const client = createServerSupabaseClient();
    const result = await processDuePosts(client, limit, Boolean(body.dryRun));

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof OperationalInputError) {
      return NextResponse.json(
        { message: error.message, code: "invalid_operational_input" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        message: "Due-post processing failed.",
        code: "scheduler_failed",
      },
      { status: 500 },
    );
  }
}
