import { NextResponse } from "next/server";

import { validateProductionEnv } from "@/lib/server/production-env";

export function GET() {
  const env = validateProductionEnv();

  return NextResponse.json(
    {
      ok: env.ok,
      service: "autopost-hub",
      configuration: env.ok ? "ready" : "incomplete",
      timestamp: new Date().toISOString(),
    },
    {
      status: env.ok ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
