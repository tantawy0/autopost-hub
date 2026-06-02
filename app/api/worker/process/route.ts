import { NextResponse, type NextRequest } from "next/server";

import { AuthorizationErrorCode, toSafeError } from "@/lib/auth";
import { BACKGROUND_JOB_TYPES } from "@/lib/server/jobs/types";
import { runWorker } from "@/lib/server/jobs/worker";
import {
  assertCronSecret,
  auditAuthorizationDenied,
} from "@/lib/server/authorization";
import {
  OperationalInputError,
  parseBackgroundJobTypes,
  parseOperationalLimit,
} from "@/lib/server/operational-input";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    assertCronSecret(request);
  } catch (error) {
    const client = createServerSupabaseClient();
    await auditAuthorizationDenied(client, {
      action: "worker.process",
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

  const body = (await request.json().catch(() => ({}))) as {
    limit?: number;
    dryRun?: boolean;
    jobTypes?: Array<(typeof BACKGROUND_JOB_TYPES)[number]>;
  };

  try {
    const limit = parseOperationalLimit(body.limit, 25);
    const jobTypes = parseBackgroundJobTypes(body.jobTypes);
    const client = createServerSupabaseClient();
    const result = await runWorker(client, {
      limit,
      dryRun: Boolean(body.dryRun),
      jobTypes,
      workerId: "cron-worker",
      signal: request.signal,
    });

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
        message: "Worker processing failed.",
        code: "worker_failed",
      },
      { status: 500 },
    );
  }
}
