import { supabase } from "@/lib/supabase";

export async function getClientAuthHeaders(
  extra: Record<string, string> = {},
): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return {
    ...extra,
    ...(session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}),
  };
}
