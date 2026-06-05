import { NextResponse, type NextRequest } from "next/server";

import {
  verifyInstagramWebhookChallenge,
  verifyInstagramWebhookSignature,
} from "@/lib/providers/instagram-webhook";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const result = verifyInstagramWebhookChallenge(request.nextUrl.searchParams);

  if (!result.ok) {
    return NextResponse.json({ message: result.message, code: result.code }, { status: result.status });
  }

  return new NextResponse(result.challenge, {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (!verifyInstagramWebhookSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json(
      { message: "Invalid Instagram webhook signature.", code: "invalid_instagram_webhook_signature" },
      { status: 401 },
    );
  }

  const payload = JSON.parse(rawBody || "{}") as { object?: string; entry?: unknown[] };

  console.info("Instagram webhook received", {
    object: payload.object ?? null,
    entryCount: Array.isArray(payload.entry) ? payload.entry.length : 0,
  });

  return NextResponse.json({ ok: true });
}
