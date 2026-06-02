import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { validateProductionEnv } from "@/lib/server/production-env";
import { isServiceRoleClient } from "@/lib/supabase-server";

export type OperationalCheck = {
  name: "environment" | "service_role" | "database" | "storage";
  ok: boolean;
  message: string;
};

async function checkDatabase(client: SupabaseClient): Promise<OperationalCheck> {
  const { error } = await client
    .from("workspaces")
    .select("id", { count: "exact", head: true });

  return error
    ? { name: "database", ok: false, message: "Database probe failed." }
    : { name: "database", ok: true, message: "Database probe passed." };
}

async function checkStorage(client: SupabaseClient): Promise<OperationalCheck> {
  const { data, error } = await client.storage.getBucket("post-images");
  const bucketReady =
    !error &&
    data?.name === "post-images" &&
    data.public === true &&
    data.file_size_limit === 209_715_200;

  return bucketReady
    ? { name: "storage", ok: true, message: "Storage bucket probe passed." }
    : { name: "storage", ok: false, message: "Storage bucket probe failed." };
}

export async function getOperationalReadiness(client: SupabaseClient) {
  const env = validateProductionEnv();
  const checks: OperationalCheck[] = [
    {
      name: "environment",
      ok: env.ok,
      message: env.ok ? "Environment validation passed." : "Environment validation failed.",
    },
    {
      name: "service_role",
      ok: isServiceRoleClient(),
      message: isServiceRoleClient()
        ? "Service-role client is configured."
        : "Service-role client is not configured.",
    },
    await checkDatabase(client),
    await checkStorage(client),
  ];

  return {
    ok: checks.every((check) => check.ok),
    checks,
    missingRequiredEnv: env.missingRequired.map((item) => item.key),
    invalidRequiredEnv: env.issues
      .filter((issue) => issue.severity === "required")
      .map((issue) => ({ key: issue.key, code: issue.code })),
    timestamp: new Date().toISOString(),
  };
}
