import { NextResponse, type NextRequest } from "next/server";

import { BillingError, handleStripeWebhook } from "@/lib/server/billing/service";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const client = createServerSupabaseClient();
    const rawBody = await request.text();
    const result = await handleStripeWebhook(
      client,
      rawBody,
      request.headers.get("stripe-signature"),
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof BillingError) {
      return NextResponse.json(
        { message: error.message, code: error.code },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Stripe webhook failed.", code: "stripe_webhook_failed" },
      { status: 400 },
    );
  }
}
