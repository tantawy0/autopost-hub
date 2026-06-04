import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const clientRoots = ["app", "components"];
const sourceExtensions = new Set([".ts", ".tsx"]);

function collectSourceFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (fullPath.includes(`${path.sep}app${path.sep}api${path.sep}`)) return [];
      return collectSourceFiles(fullPath);
    }

    if (!sourceExtensions.has(path.extname(entry.name))) return [];

    return [fullPath];
  });
}

function isClientSurface(filePath: string, source: string) {
  const relative = path.relative(repoRoot, filePath).replaceAll(path.sep, "/");

  return (
    source.startsWith('"use client"') ||
    source.startsWith("'use client'") ||
    relative.startsWith("components/") ||
    /app\/[^/]+\/(?:page|layout)\.tsx$/.test(relative) ||
    relative === "app/page.tsx" ||
    relative === "app/layout.tsx"
  );
}

describe("client routes do not expose secrets", () => {
  test("client-facing source has no private env access or secret-shaped literals", () => {
    const files = clientRoots.flatMap((root) => collectSourceFiles(path.join(repoRoot, root)));
    const findings: string[] = [];
    const privateEnvAccess =
      /process\.env\.(?:SUPABASE_SERVICE_ROLE_KEY|OPENROUTER_API_KEY|API_KEY_21ST|META_APP_SECRET|CRON_SECRET|TOKEN_ENCRYPTION_KEY|WORKER_SECRET|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET)/g;
    const secretLiteral = /\b(?:sk-(?:or-v1|proj|live|test)-|whsec_|21st_sk_)[A-Za-z0-9_-]{20,}\b/g;

    for (const file of files) {
      const source = fs.readFileSync(file, "utf8");
      if (!isClientSurface(file, source)) continue;

      for (const pattern of [privateEnvAccess, secretLiteral]) {
        pattern.lastIndex = 0;
        const matches = source.match(pattern);
        if (matches?.length) {
          findings.push(`${path.relative(repoRoot, file)}: ${matches.join(", ")}`);
        }
      }
    }

    assert.deepEqual(findings, []);
  });

  test("client-facing source avoids unsafe HTML sinks and local draft persistence", () => {
    const files = clientRoots.flatMap((root) => collectSourceFiles(path.join(repoRoot, root)));
    const findings: string[] = [];

    for (const file of files) {
      const source = fs.readFileSync(file, "utf8");
      if (!isClientSurface(file, source)) continue;

      if (source.includes("dangerouslySetInnerHTML")) {
        findings.push(`${path.relative(repoRoot, file)}: dangerouslySetInnerHTML`);
      }

      if (source.includes("autopost:composer-draft")) {
        findings.push(`${path.relative(repoRoot, file)}: autopost:composer-draft`);
      }
    }

    assert.deepEqual(findings, []);
  });
});
