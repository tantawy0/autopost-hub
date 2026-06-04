import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

function loadLocalEnv() {
  for (const filename of [".env.local", ".env"]) {
    const fullPath = path.join(repoRoot, filename);
    if (!fs.existsSync(fullPath)) continue;

    const lines = fs.readFileSync(fullPath, "utf8").split(/\r?\n/);

    for (const line of lines) {
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

      if (!process.env[key]) process.env[key] = value;
    }
  }
}

function normalizeBaseUrl(value) {
  return (value || "http://localhost:3000").replace(/\/+$/, "");
}

function assertNoSecretExposure(text, secret) {
  if (secret && text.includes(secret)) {
    throw new Error("Response exposed the cron secret value.");
  }

  if (/\b(?:sk-(?:or-v1|proj|live|test)-|whsec_|21st_sk_)[A-Za-z0-9_-]{12,}\b/.test(text)) {
    throw new Error("Response exposed a secret-shaped value.");
  }
}

async function requestCheck(input) {
  const response = await fetch(`${input.baseUrl}${input.path}`, {
    method: input.method ?? "GET",
    headers: input.headers,
    body: input.body ? JSON.stringify(input.body) : undefined,
  });
  const text = await response.text();

  assertNoSecretExposure(text, input.secret);

  if (!input.expectedStatuses.includes(response.status)) {
    throw new Error(`${input.name} returned ${response.status}; expected ${input.expectedStatuses.join("/")}.`);
  }

  let json = null;
  if (text) {
    json = JSON.parse(text);
  }

  return {
    name: input.name,
    status: response.status,
    ok: response.ok,
    json,
  };
}

function assertCronResultShape(check) {
  const json = check.json ?? {};
  const numericFields = ["processed", "failed", "released"];

  for (const field of numericFields) {
    if (typeof json[field] !== "number") {
      throw new Error(`${check.name} did not return numeric ${field}.`);
    }
  }
}

async function main() {
  loadLocalEnv();

  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    throw new Error("CRON_SECRET is required for cron smoke checks.");
  }

  const baseUrl = normalizeBaseUrl(process.env.SMOKE_BASE_URL || process.env.NEXT_PUBLIC_APP_URL);
  const authHeaders = {
    Authorization: `Bearer ${cronSecret}`,
    "Content-Type": "application/json",
  };
  const invalidHeaders = {
    Authorization: "Bearer invalid-cron-secret",
    "Content-Type": "application/json",
  };
  const checks = [];

  checks.push(await requestCheck({
    name: "app health",
    baseUrl,
    secret: cronSecret,
    path: "/api/health",
    expectedStatuses: [200],
  }));
  checks.push(await requestCheck({
    name: "worker health rejects missing secret",
    baseUrl,
    secret: cronSecret,
    path: "/api/worker/health",
    expectedStatuses: [401],
  }));
  checks.push(await requestCheck({
    name: "scheduler health rejects missing secret",
    baseUrl,
    secret: cronSecret,
    path: "/api/scheduler/health",
    expectedStatuses: [401],
  }));
  checks.push(await requestCheck({
    name: "worker process rejects invalid secret",
    baseUrl,
    secret: cronSecret,
    path: "/api/worker/process",
    method: "POST",
    headers: invalidHeaders,
    body: { limit: 1, dryRun: true, jobTypes: ["publish_post"] },
    expectedStatuses: [401],
  }));
  checks.push(await requestCheck({
    name: "scheduler process rejects invalid secret",
    baseUrl,
    secret: cronSecret,
    path: "/api/scheduler/process-due-posts",
    method: "POST",
    headers: invalidHeaders,
    body: { limit: 1, dryRun: true },
    expectedStatuses: [401],
  }));
  checks.push(await requestCheck({
    name: "vercel worker bridge rejects missing secret",
    baseUrl,
    secret: cronSecret,
    path: "/api/cron/worker",
    expectedStatuses: [401],
  }));
  checks.push(await requestCheck({
    name: "vercel scheduler bridge rejects missing secret",
    baseUrl,
    secret: cronSecret,
    path: "/api/cron/scheduler",
    expectedStatuses: [401],
  }));

  const workerDryRun = await requestCheck({
    name: "worker publish dry-run",
    baseUrl,
    secret: cronSecret,
    path: "/api/worker/process",
    method: "POST",
    headers: authHeaders,
    body: { limit: 1, dryRun: true, jobTypes: ["publish_post"] },
    expectedStatuses: [200],
  });
  assertCronResultShape(workerDryRun);
  checks.push(workerDryRun);

  const schedulerDryRun = await requestCheck({
    name: "scheduler due-post dry-run",
    baseUrl,
    secret: cronSecret,
    path: "/api/scheduler/process-due-posts",
    method: "POST",
    headers: authHeaders,
    body: { limit: 1, dryRun: true },
    expectedStatuses: [200],
  });
  assertCronResultShape(schedulerDryRun);
  checks.push(schedulerDryRun);

  console.log(JSON.stringify({
    ok: true,
    baseUrl,
    checks: checks.map((check) => ({ name: check.name, status: check.status })),
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    message: error instanceof Error ? error.message : "Cron smoke failed.",
  }, null, 2));
  process.exitCode = 1;
});
