import type { SupabaseClient, User } from "@supabase/supabase-js";

export interface WorkspaceContext {
  workspaceId: string | null;
  userId: string;
  role: "Owner" | "Admin" | "Editor" | "Analyst" | "Viewer";
}

type WorkspaceRow = {
  id: string;
  owner_id: string;
};

type MemberRow = {
  workspace_id: string;
  role: WorkspaceContext["role"];
};

export async function ensureDefaultWorkspace(
  client: SupabaseClient,
  user: User,
): Promise<WorkspaceContext> {
  const { data: membership } = await client
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membership?.workspace_id) {
    return {
      workspaceId: (membership as MemberRow).workspace_id,
      userId: user.id,
      role: (membership as MemberRow).role,
    };
  }

  const workspaceName = user.email ? `${user.email.split("@")[0]}'s Workspace` : "Personal Workspace";
  const { data: workspace, error: workspaceError } = await client
    .from("workspaces")
    .insert([{ name: workspaceName, owner_id: user.id, settings: { personal: true } }])
    .select("id, owner_id")
    .single();

  if (workspaceError) {
    throw new Error(workspaceError.message);
  }

  const workspaceId = (workspace as WorkspaceRow).id;
  const { error: memberError } = await client
    .from("workspace_members")
    .insert([{ workspace_id: workspaceId, user_id: user.id, role: "Owner" }]);

  if (memberError) {
    throw new Error(memberError.message);
  }

  return { workspaceId, userId: user.id, role: "Owner" };
}

export function canEdit(role: WorkspaceContext["role"]): boolean {
  return role === "Owner" || role === "Admin" || role === "Editor";
}

export function canAdmin(role: WorkspaceContext["role"]): boolean {
  return role === "Owner" || role === "Admin";
}

export function canAnalyze(role: WorkspaceContext["role"]): boolean {
  return canEdit(role) || role === "Analyst";
}

export function canView(role: WorkspaceContext["role"]): boolean {
  return Boolean(role);
}
