import "server-only";

export type EnvSeverity = "required" | "recommended" | "optional";

export type EnvCheck = {
  key: string;
  severity: EnvSeverity;
  configured: boolean;
  scope: "client" | "server";
  purpose: string;
};

export type EnvIssue = {
  key: string;
  severity: EnvSeverity;
  code:
    | "placeholder_value"
    | "invalid_url"
    | "secret_too_short"
    | "redirect_uri_mismatch"
    | "unsupported_provider"
    | "provider_key_missing"
    | "invalid_graph_version";
};

type EnvSource = Record<string, string | undefined>;

const ENV_CHECKS: Array<Omit<EnvCheck, "configured">> = [
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    severity: "required",
    scope: "client",
    purpose: "Browser and server Supabase project URL.",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    severity: "required",
    scope: "client",
    purpose: "Browser Supabase anon key protected by RLS.",
  },
  {
    key: "NEXT_PUBLIC_APP_URL",
    severity: "required",
    scope: "client",
    purpose: "Canonical app URL for OAuth callbacks and provider referer headers.",
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    severity: "required",
    scope: "server",
    purpose: "Server route handlers, cron jobs, workers, and service-role storage/database operations.",
  },
  {
    key: "CRON_SECRET",
    severity: "required",
    scope: "server",
    purpose: "Authorization for scheduler and worker cron endpoints.",
  },
  {
    key: "TOKEN_ENCRYPTION_KEY",
    severity: "required",
    scope: "server",
    purpose: "Stable encryption key for OAuth token ciphertext.",
  },
  {
    key: "META_APP_ID",
    severity: "required",
    scope: "server",
    purpose: "Meta OAuth app id for Facebook and Instagram authorization.",
  },
  {
    key: "META_APP_SECRET",
    severity: "required",
    scope: "server",
    purpose: "Meta OAuth app secret and appsecret_proof signing.",
  },
  {
    key: "META_REDIRECT_URI",
    severity: "required",
    scope: "server",
    purpose: "Production Meta OAuth callback URL.",
  },
  {
    key: "LINKEDIN_CLIENT_ID",
    severity: "recommended",
    scope: "server",
    purpose: "LinkedIn OAuth client id for member profile publishing.",
  },
  {
    key: "LINKEDIN_CLIENT_SECRET",
    severity: "recommended",
    scope: "server",
    purpose: "LinkedIn OAuth client secret for callback token exchange and state signing.",
  },
  {
    key: "LINKEDIN_REDIRECT_URI",
    severity: "recommended",
    scope: "server",
    purpose: "LinkedIn OAuth callback URL registered in the LinkedIn Developer Portal.",
  },
  {
    key: "OPENROUTER_API_KEY",
    severity: "optional",
    scope: "server",
    purpose: "Optional OpenRouter provider key for /api/ai routes.",
  },
  {
    key: "GEMINI_API_KEY",
    severity: "optional",
    scope: "server",
    purpose: "Optional Gemini provider key for free-tier-friendly /api/ai routes.",
  },
  {
    key: "API_KEY_21ST",
    severity: "recommended",
    scope: "server",
    purpose: "21st SDK token routes and deployed agent integration.",
  },
  {
    key: "META_GRAPH_VERSION",
    severity: "optional",
    scope: "server",
    purpose: "Override Meta Graph API version.",
  },
  {
    key: "META_SCOPES",
    severity: "optional",
    scope: "server",
    purpose: "Override requested Meta OAuth scopes.",
  },
  {
    key: "LINKEDIN_API_VERSION",
    severity: "optional",
    scope: "server",
    purpose: "Override LinkedIn versioned REST API header.",
  },
  {
    key: "LINKEDIN_SCOPES",
    severity: "optional",
    scope: "server",
    purpose: "Override LinkedIn OAuth scopes.",
  },
  {
    key: "OPENROUTER_BASE_URL",
    severity: "optional",
    scope: "server",
    purpose: "Override OpenRouter API base URL.",
  },
  {
    key: "AI_PRIMARY_PROVIDER",
    severity: "optional",
    scope: "server",
    purpose: "Force AI provider selection: heuristic, gemini, or openrouter.",
  },
  {
    key: "GEMINI_MODEL",
    severity: "optional",
    scope: "server",
    purpose: "Gemini model id allowlisted by provider config.",
  },
  {
    key: "AI_MODEL_ASSISTANT",
    severity: "optional",
    scope: "server",
    purpose: "Assistant model id allowlisted by provider config.",
  },
  {
    key: "AI_REQUEST_TIMEOUT_MS",
    severity: "optional",
    scope: "server",
    purpose: "AI provider request timeout.",
  },
  {
    key: "AI_MAX_RETRIES",
    severity: "optional",
    scope: "server",
    purpose: "AI provider retry limit.",
  },
];

function getValue(source: EnvSource, key: string) {
  return source[key]?.trim() ?? "";
}

function isPlaceholder(value: string) {
  return /^(?:your-|replace-with-|example-|changeme|todo|<)/i.test(value);
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export function getProductionEnvChecks(source: EnvSource = process.env): EnvCheck[] {
  return ENV_CHECKS.map((check) => ({
    ...check,
    configured: Boolean(getValue(source, check.key)) && !isPlaceholder(getValue(source, check.key)),
  }));
}

export function getMissingProductionEnv(
  severity: EnvSeverity = "required",
  source: EnvSource = process.env,
): EnvCheck[] {
  return getProductionEnvChecks(source).filter(
    (check) => check.severity === severity && !check.configured,
  );
}

export function validateProductionEnv(source: EnvSource = process.env) {
  const checks = getProductionEnvChecks(source);
  const checkByKey = new Map(checks.map((check) => [check.key, check]));
  const missingRequired = checks.filter(
    (check) => check.severity === "required" && !check.configured,
  );
  const issues: EnvIssue[] = [];
  const addIssue = (key: string, code: EnvIssue["code"]) => {
    const check = checkByKey.get(key);
    if (check) issues.push({ key, severity: check.severity, code });
  };

  for (const check of checks) {
    const value = getValue(source, check.key);
    if (value && isPlaceholder(value)) addIssue(check.key, "placeholder_value");
  }

  for (const key of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_APP_URL",
    "META_REDIRECT_URI",
    "LINKEDIN_REDIRECT_URI",
    "OPENROUTER_BASE_URL",
  ]) {
    const value = getValue(source, key);
    if (value && !isPlaceholder(value) && !isHttpUrl(value)) addIssue(key, "invalid_url");
  }

  for (const [key, minimumLength] of [
    ["CRON_SECRET", 32],
    ["TOKEN_ENCRYPTION_KEY", 32],
    ["SUPABASE_SERVICE_ROLE_KEY", 32],
    ["META_APP_SECRET", 16],
  ] as const) {
    const value = getValue(source, key);
    if (value && !isPlaceholder(value) && value.length < minimumLength) {
      addIssue(key, "secret_too_short");
    }
  }

  const appUrl = getValue(source, "NEXT_PUBLIC_APP_URL");
  const metaRedirectUri = getValue(source, "META_REDIRECT_URI");
  if (
    isHttpUrl(appUrl) &&
    isHttpUrl(metaRedirectUri) &&
    normalizeUrl(metaRedirectUri) !== `${normalizeUrl(appUrl)}/api/meta/callback`
  ) {
    addIssue("META_REDIRECT_URI", "redirect_uri_mismatch");
  }

  const linkedInRedirectUri = getValue(source, "LINKEDIN_REDIRECT_URI");
  if (
    linkedInRedirectUri &&
    isHttpUrl(appUrl) &&
    isHttpUrl(linkedInRedirectUri) &&
    normalizeUrl(linkedInRedirectUri) !== `${normalizeUrl(appUrl)}/api/linkedin/callback`
  ) {
    addIssue("LINKEDIN_REDIRECT_URI", "redirect_uri_mismatch");
  }

  const graphVersion = getValue(source, "META_GRAPH_VERSION");
  if (graphVersion && !/^v\d+\.\d+$/.test(graphVersion)) {
    addIssue("META_GRAPH_VERSION", "invalid_graph_version");
  }

  const provider = getValue(source, "AI_PRIMARY_PROVIDER");
  if (provider && !["heuristic", "gemini", "openrouter"].includes(provider)) {
    addIssue("AI_PRIMARY_PROVIDER", "unsupported_provider");
  }
  if (provider === "openrouter" && !checkByKey.get("OPENROUTER_API_KEY")?.configured) {
    addIssue("OPENROUTER_API_KEY", "provider_key_missing");
  }
  if (provider === "gemini" && !checkByKey.get("GEMINI_API_KEY")?.configured) {
    addIssue("GEMINI_API_KEY", "provider_key_missing");
  }

  const invalidRequired = issues.filter((issue) => issue.severity === "required");

  return {
    ok: missingRequired.length === 0 && invalidRequired.length === 0,
    missingRequired,
    issues,
    checks,
  };
}
