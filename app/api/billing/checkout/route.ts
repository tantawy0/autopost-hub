import { NextResponse, type NextRequest } from "next/server";

import { toSafeError } from "@/lib/auth";
import { BillingError, createCheckoutSession } from "@/lib/server/billing/service";
import {
  requireAuthenticatedUser,
  requireWorkspacePermission,
} from "@/lib/server/authorization";
import { assertRateLimit, getRateLimitKey } from "@/lib/server/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const client = createServerSupabaseClient();
    const user = await requireAuthenticatedUser(client, request);
    await requireWorkspacePermission(client, user, "billing_manage", {
      action: "billing.checkout",
      entityType: "billing",
      request,
    });
    await assertRateLimit(client, {
      key: getRateLimitKey(request, user.id),
      action: "billing_checkout",
      limit: 10,
      windowSeconds: 60,
    });
    const body = (await request.json().catch(() => ({}))) as { planKey?: string };
    const checkout = await createCheckoutSession(client, user, body.planKey ?? "");

    return NextResponse.json(checkout);
  } catch (error) {
    if (error instanceof BillingError) {
      return NextResponse.json(
        { message: error.message, code: error.code },
        { status: error.status },
      );
    }

    const safe = toSafeError(error);

    return NextResponse.json(safe, { status: safe.status });
  }
}
