import { NextResponse, type NextRequest } from "next/server";

import { AuthorizationErrorCode, toSafeError } from "@/lib/auth";
import {
  assertCronSecret,
  auditAuthorizationDenied,
} from "@/lib/server/authorization";
import { runWorker } from "@/lib/server/jobs/worker";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const client = createServerSupabaseClient();

  try {
    assertCronSecret(request);
  } catch (error) {
    await auditAuthorizationDenied(client, {
      action: "cron.worker",
      entityType: "worker",
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
    return NextResponse.json(
      await runWorker(client, {
        limit: 25,
        workerId: "vercel-cron-worker",
        signal: request.signal,
      }),
    );
  } catch {
    return NextResponse.json(
      { message: "Worker processing failed.", code: "worker_failed" },
      { status: 500 },
    );
  }
}
