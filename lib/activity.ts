import { getClientUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export interface ActivityEventDTO {
  id: string;
  eventType: string;
  message: string;
  createdAt: string;
}

export async function listRecentActivity(limit = 20): Promise<ActivityEventDTO[]> {
  const user = await getClientUser();
  const { data, error } = await supabase
    .from("activity_events")
    .select("id, event_type, message, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    eventType: row.event_type,
    message: row.message,
    createdAt: row.created_at,
  }));
}
