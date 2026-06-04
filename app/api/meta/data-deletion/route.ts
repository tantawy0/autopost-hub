import { NextResponse, type NextRequest } from "next/server";

import { MetaSignedRequestError, verifyMetaSignedRequest } from "@/lib/providers/meta";
import { processMetaDataDeletionRequest } from "@/lib/server/meta-data-deletion";
import { createServerSupabaseClient } from "@/lib/supabase-server";

type MetaDeletionSignedRequest = Record<string, unknown> & {
  algorithm?: string;
  issued_at?: number;
  user_id?: string;
};

function getRequestAppUrl(request: NextRequest): string {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  if (forwardedHost) {
    return `${forwardedProto ?? request.nextUrl.protocol.replace(":", "")}://${forwardedHost}`;
  }

  return request.nextUrl.origin;
}

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

    const payload = verifyMetaSignedRequest<MetaDeletionSignedRequest>(signedRequest);

    if (!payload.user_id) {
      return NextResponse.json(
        { message: "Meta user id is required.", code: "meta_user_required" },
        { status: 400 },
      );
    }

    const appUrl = getRequestAppUrl(request);
    const result = await processMetaDataDeletionRequest(createServerSupabaseClient(), {
      providerUserId: payload.user_id,
      appUrl,
      signedRequestIssuedAt: payload.issued_at ?? null,
    });
    const url = `${appUrl}/data-deletion/status?code=${encodeURIComponent(result.confirmationCode)}`;

    return NextResponse.json({
      url,
      confirmation_code: result.confirmationCode,
    });
  } catch (error) {
    if (error instanceof MetaSignedRequestError) {
      return NextResponse.json(
        { message: "Invalid signed request.", code: "invalid_signed_request" },
        { status: 400 },
      );
    }

    console.error("Meta data deletion callback failed", {
      code: "meta_data_deletion_failed",
    });

    return NextResponse.json(
      { message: "Unable to process data deletion request.", code: "meta_data_deletion_failed" },
      { status: 500 },
    );
  }
}
