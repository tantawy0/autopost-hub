import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function getServerEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured.");
  }

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for server operations.");
  }

  return {
    url,
    key: serviceRoleKey,
  };
}

export function isServiceRoleClient(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

/** Service-role bypasses RLS — routes must enforce user_id ownership and RBAC in application code. */
export function createServerSupabaseClient(): SupabaseClient {
  const { url, key } = getServerEnv();

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
