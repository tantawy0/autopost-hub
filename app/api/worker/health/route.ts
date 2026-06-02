import { NextResponse, type NextRequest } from "next/server";

import { AuthorizationErrorCode, toSafeError } from "@/lib/auth";
import { getWorkerHealth } from "@/lib/server/jobs/worker";
import { validateProductionEnv } from "@/lib/server/production-env";
import {
  assertCronSecret,
  auditAuthorizationDenied,
} from "@/lib/server/authorization";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    assertCronSecret(request);
  } catch (error) {
    const client = createServerSupabaseClient();
    await auditAuthorizationDenied(client, {
      action: "worker.health",
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

  const health = getWorkerHealth();
  const env = validateProductionEnv();

  return NextResponse.json({
    ok: env.ok,
    health,
    missingRequiredEnv: env.missingRequired.map((item) => item.key),
    timestamp: new Date().toISOString(),
  });
}
