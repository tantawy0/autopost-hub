import { NextResponse, type NextRequest } from "next/server";

import { getBearerUser, toSafeError } from "@/lib/auth";
import { BillingError, createCheckoutSession } from "@/lib/server/billing/service";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const client = createServerSupabaseClient();
    const user = await getBearerUser(client, request.headers.get("authorization"));
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
