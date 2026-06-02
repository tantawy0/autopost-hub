import { CircleDot, Clock3, Sparkles, type LucideIcon } from "lucide-react";

import { getClientAuthHeaders } from "@/lib/client-auth";

export interface WorkspaceNotification {
  id: string;
  title: string;
  helper: string;
  icon: LucideIcon;
}

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  notification_type?: string | null;
};

function iconForType(type?: string | null): LucideIcon {
  if (type?.includes("scheduler") || type?.includes("publish")) return Clock3;
  if (type?.includes("ai")) return Sparkles;
  return CircleDot;
}

export async function getWorkspaceNotifications(): Promise<WorkspaceNotification[]> {
  const response = await fetch("/api/notifications", {
    headers: await getClientAuthHeaders(),
  });

  if (!response.ok) return [];

  const body = (await response.json().catch(() => null)) as { notifications?: NotificationRow[] } | null;

  return (body?.notifications ?? []).slice(0, 8).map((notification) => ({
    id: notification.id,
    title: notification.title,
    helper: notification.body,
    icon: iconForType(notification.notification_type),
  }));
}
