import { NextResponse, type NextRequest } from "next/server";

import { AuthorizationErrorCode, toSafeError } from "@/lib/auth";
import {
  assertCronSecret,
  auditAuthorizationDenied,
} from "@/lib/server/authorization";
import { validateProductionEnv } from "@/lib/server/production-env";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    assertCronSecret(request);
  } catch (error) {
    const client = createServerSupabaseClient();
    await auditAuthorizationDenied(client, {
      action: "scheduler.health",
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

  const env = validateProductionEnv();

  return NextResponse.json({
    ok: env.ok,
    scheduler: "ready",
    missingRequiredEnv: env.missingRequired.map((item) => item.key),
    timestamp: new Date().toISOString(),
  });
}
