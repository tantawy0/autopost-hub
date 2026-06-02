import { NextResponse, type NextRequest } from "next/server";

import { AuthorizationErrorCode, toSafeError } from "@/lib/auth";
import {
  assertCronSecret,
  auditAuthorizationDenied,
} from "@/lib/server/authorization";
import { getOperationalReadiness } from "@/lib/server/operational-readiness";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const client = createServerSupabaseClient();

  try {
    assertCronSecret(request);
  } catch (error) {
    await auditAuthorizationDenied(client, {
      action: "ops.readiness",
      entityType: "ops",
      reason: "cron_unauthorized",
      request,
    });
    const safe = toSafeError(error);

    return NextResponse.json(
      { message: safe.message, code: safe.code ?? AuthorizationErrorCode.CRON_UNAUTHORIZED },
      { status: safe.status },
    );
  }

  const readiness = await getOperationalReadiness(client);

  return NextResponse.json(readiness, { status: readiness.ok ? 200 : 503 });
}
