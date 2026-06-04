import fs from "node:fs";

const repoRoot = process.cwd();

function loadLocalEnv() {
  for (const filename of [".env.local", ".env"]) {
    const fullPath = `${repoRoot}/${filename}`;
    if (!fs.existsSync(fullPath)) continue;

    for (const line of fs.readFileSync(fullPath, "utf8").split(/\r?\n/)) {
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

      process.env[key] ??= value;
    }
  }
}

function normalizeBaseUrl(value) {
  return (value || "https://autopost-hub.vercel.app").replace(/\/+$/, "");
}

async function getJson(url, init) {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({}));

  return { response, body };
}

async function main() {
  loadLocalEnv();

  const appId = process.env.META_APP_ID?.trim();
  const appSecret = process.env.META_APP_SECRET?.trim();
  const version = process.env.META_GRAPH_VERSION || "v25.0";
  const baseUrl = normalizeBaseUrl(process.env.SMOKE_BASE_URL || process.env.NEXT_PUBLIC_APP_URL);
  const expected = {
    appDomain: new URL(baseUrl).hostname,
    website: baseUrl,
    privacy: `${baseUrl}/privacy`,
    terms: `${baseUrl}/terms`,
    dataDeletionInstructions: `${baseUrl}/data-deletion`,
    dataDeletionCallback: `${baseUrl}/api/meta/data-deletion`,
    oauthCallback: `${baseUrl}/api/meta/callback`,
  };
  const requiredPermissions = [
    "pages_show_list",
    "pages_read_engagement",
    "pages_manage_posts",
    "instagram_basic",
    "instagram_content_publish",
  ];

  if (!appId || !appSecret) {
    throw new Error("META_APP_ID and META_APP_SECRET are required.");
  }

  const appAccessToken = `${appId}|${appSecret}`;
  const appFields = [
    "id",
    "name",
    "app_domains",
    "privacy_policy_url",
    "terms_of_service_url",
    "website_url",
    "category",
    "deauth_callback_url",
  ].join(",");
  const appResult = await getJson(
    `https://graph.facebook.com/${version}/${appId}?fields=${encodeURIComponent(
      appFields,
    )}&access_token=${encodeURIComponent(appAccessToken)}`,
  );

  if (!appResult.response.ok) {
    throw new Error(appResult.body?.error?.message || "Unable to read Meta app settings.");
  }

  const permissionsResult = await getJson(
    `https://graph.facebook.com/${version}/${appId}/permissions?access_token=${encodeURIComponent(
      appAccessToken,
    )}`,
  );
  const returnedPermissions = Array.isArray(permissionsResult.body.data)
    ? permissionsResult.body.data
    : [];
  const permissionChecks = requiredPermissions.map((permission) => {
    const match = returnedPermissions.find((row) => row.permission === permission);

    return {
      permission,
      present: Boolean(match),
      status: match?.status ?? null,
      ready: match?.status === "live" || match?.status === "approved",
    };
  });
  const publicChecks = await Promise.all(
    [expected.privacy, expected.terms, expected.dataDeletionInstructions].map(async (url) => {
      const response = await fetch(url, { redirect: "manual" }).catch(() => null);

      return {
        url,
        ok: Boolean(response && response.status >= 200 && response.status < 400),
        status: response?.status ?? null,
      };
    }),
  );
  const app = appResult.body;
  const checks = {
    appDomain: Array.isArray(app.app_domains) && app.app_domains.includes(expected.appDomain),
    privacy: app.privacy_policy_url === expected.privacy,
    terms: app.terms_of_service_url === expected.terms,
    website: app.website_url === expected.website,
    permissionCoverage: permissionChecks.every((check) => check.ready),
    publicPolicyPages: publicChecks.every((check) => check.ok),
  };
  const manualActions = [];

  if (!checks.website) manualActions.push(`Set Website URL to ${expected.website}`);
  manualActions.push(`Verify User Data Deletion instructions URL is ${expected.dataDeletionInstructions}`);
  manualActions.push(`Verify User Data Deletion callback URL is ${expected.dataDeletionCallback}`);
  manualActions.push(`Verify Valid OAuth Redirect URI includes ${expected.oauthCallback}`);

  for (const permission of permissionChecks.filter((check) => !check.ready)) {
    manualActions.push(`Request Advanced Access/App Review for ${permission.permission}`);
  }

  console.log(JSON.stringify({
    ok: Object.values(checks).every(Boolean),
    app: {
      id: app.id,
      name: app.name,
      category: app.category ?? null,
    },
    checks,
    permissions: permissionChecks,
    publicPages: publicChecks,
    expected,
    manualActions,
    note: "Meta App Review submission and Advanced Access requests must be completed in the Meta dashboard.",
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    message: error instanceof Error ? error.message : "Meta App Review readiness check failed.",
  }, null, 2));
  process.exitCode = 1;
});
