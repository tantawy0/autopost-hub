import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const repoRoot = process.cwd();
const envPath = path.join(repoRoot, ".env.local");

function parseEnvFile(filePath) {
  const values = new Map();

  if (!fs.existsSync(filePath)) return values;

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index <= 0) continue;

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values.set(key, value);
    process.env[key] ??= value;
  }

  return values;
}

function writeEnvValues(filePath, updates) {
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8").split(/\r?\n/) : [];
  const seen = new Set();
  const lines = existing.map((line) => {
    const match = line.match(/^([A-Z0-9_]+)=/);

    if (!match || !(match[1] in updates)) return line;

    seen.add(match[1]);
    return `${match[1]}=${updates[match[1]]}`;
  });

  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key)) lines.push(`${key}=${value}`);
  }

  fs.writeFileSync(filePath, `${lines.filter((line, index) => line || index < lines.length - 1).join("\n")}\n`);
}

async function findUserByEmail(client, email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });

    if (error) throw error;

    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < 1000) return null;
  }

  return null;
}

async function ensureWorkspace(client, userId) {
  const { data: existingMember, error: memberReadError } = await client
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (memberReadError) throw memberReadError;

  if (existingMember?.workspace_id) {
    return existingMember.workspace_id;
  }

  const { data: workspace, error: workspaceError } = await client
    .from("workspaces")
    .insert([{ name: "E2E Workspace", owner_id: userId, settings: { personal: true, e2e: true } }])
    .select("id")
    .single();

  if (workspaceError) throw workspaceError;

  const workspaceId = workspace.id;
  const { error: memberError } = await client
    .from("workspace_members")
    .insert([{ workspace_id: workspaceId, user_id: userId, role: "Owner" }]);

  if (memberError) throw memberError;

  return workspaceId;
}

async function ensureFreeSubscription(client, workspaceId) {
  const { error } = await client
    .from("workspace_subscriptions")
    .upsert(
      [{ workspace_id: workspaceId, plan_key: "free", status: "free", updated_at: new Date().toISOString() }],
      { onConflict: "workspace_id" },
    );

  if (error && !/workspace_subscriptions|schema cache|does not exist/i.test(error.message)) {
    throw error;
  }
}

async function main() {
  parseEnvFile(envPath);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }

  const email = process.env.E2E_EMAIL?.trim() || `autopost-e2e-${crypto.randomUUID().slice(0, 8)}@example.test`;
  const password = process.env.E2E_PASSWORD?.trim() || `E2E-${crypto.randomBytes(24).toString("base64url")}`;
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const existing = await findUserByEmail(client, email);
  const user = existing
    ? (await client.auth.admin.updateUserById(existing.id, { password, email_confirm: true })).data.user
    : (await client.auth.admin.createUser({ email, password, email_confirm: true })).data.user;

  if (!user) throw new Error("Unable to create or update E2E user.");

  const workspaceId = await ensureWorkspace(client, user.id);
  await ensureFreeSubscription(client, workspaceId);

  writeEnvValues(envPath, {
    E2E_RUN_BROWSER: "1",
    E2E_START_SERVER: "1",
    E2E_EMAIL: email,
    E2E_PASSWORD: password,
  });

  console.log(JSON.stringify({
    ok: true,
    emailConfigured: true,
    passwordConfigured: true,
    workspaceConfigured: true,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    message: error instanceof Error ? error.message : "Unable to configure E2E credentials.",
  }, null, 2));
  process.exitCode = 1;
});
