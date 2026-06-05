import { NextResponse, type NextRequest } from "next/server";

import { getInstagramSignedRequestSecret } from "@/lib/providers/instagram-login";
import { MetaSignedRequestError, verifyMetaSignedRequest } from "@/lib/providers/meta";
import { processInstagramDeauthorizationRequest } from "@/lib/server/instagram-deauthorize";
import { createServerSupabaseClient } from "@/lib/supabase-server";

type InstagramDeauthorizeSignedRequest = Record<string, unknown> & {
  user_id?: string;
};

async function getSignedRequest(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as { signed_request?: unknown } | null;
    return typeof body?.signed_request === "string" ? body.signed_request : null;
  }

  const form = await request.formData().catch(() => null);
  const signedRequest = form?.get("signed_request");

  return typeof signedRequest === "string" ? signedRequest : null;
}

export async function POST(request: NextRequest) {
  try {
    const signedRequest = await getSignedRequest(request);

    if (!signedRequest) {
      return NextResponse.json(
        { message: "signed_request is required.", code: "signed_request_required" },
        { status: 400 },
      );
    }

    const payload = verifyMetaSignedRequest<InstagramDeauthorizeSignedRequest>(
      signedRequest,
      getInstagramSignedRequestSecret(),
    );

    if (!payload.user_id) {
      return NextResponse.json(
        { message: "Instagram user id is required.", code: "instagram_user_required" },
        { status: 400 },
      );
    }

    const result = await processInstagramDeauthorizationRequest(createServerSupabaseClient(), {
      providerUserId: payload.user_id,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MetaSignedRequestError) {
      return NextResponse.json(
        { message: "Invalid signed request.", code: "invalid_signed_request" },
        { status: 400 },
      );
    }

    console.error("Instagram deauthorization callback failed", {
      code: "instagram_deauthorization_failed",
    });

    return NextResponse.json(
      { message: "Unable to process deauthorization request.", code: "instagram_deauthorization_failed" },
      { status: 500 },
    );
  }
}
