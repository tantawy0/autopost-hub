import "server-only";

const CLIENT_VISIBLE_ENV_KEYS = new Set([
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_APP_URL",
]);

const FORBIDDEN_CLIENT_PREFIXES = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENROUTER_API_KEY",
  "GEMINI_API_KEY",
  "API_KEY_21ST",
  "META_APP_SECRET",
  "CRON_SECRET",
  "TOKEN_ENCRYPTION_KEY",
];

export function isClientVisibleEnvKey(key: string): boolean {
  return CLIENT_VISIBLE_ENV_KEYS.has(key);
}

export function assertNoSecretEnvKeysExposed(keys: string[]): string[] {
  return keys.filter(
    (key) =>
      !isClientVisibleEnvKey(key) &&
      (FORBIDDEN_CLIENT_PREFIXES.includes(key) || (!key.startsWith("NEXT_PUBLIC_") && key.includes("KEY"))),
  );
}

export function getServerSecretEnvKeys(): string[] {
  return FORBIDDEN_CLIENT_PREFIXES.filter((key) => Boolean(process.env[key]));
}
