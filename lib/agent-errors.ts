const SECRET_NAME_PATTERN =
  /\b(?:API_KEY_21ST|OPENROUTER_API_KEY|GEMINI_API_KEY|SUPABASE_SERVICE_ROLE_KEY|META_APP_SECRET|CRON_SECRET|TOKEN_ENCRYPTION_KEY)\b/g;
const SECRET_VALUE_PATTERN = /\b(?:sk-(?:or-v1|proj|live|test)-|whsec_|21st_sk_)[A-Za-z0-9_-]{20,}\b/g;

function redactAgentError(message: string) {
  return message
    .replace(SECRET_NAME_PATTERN, "server credential")
    .replace(SECRET_VALUE_PATTERN, "redacted credential");
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) return redactAgentError(error.message);
  if (typeof error === "string") return redactAgentError(error);
  return "Unknown 21st agent error";
}

export function getAgentSetupHint(message: string) {
  if (/not found/i.test(message)) {
    return "Agent my-agent is not deployed yet. Run npx @21st-sdk/cli deploy --agent my-agent.";
  }
  if (/unauthorized|invalid|api key|401|403/i.test(message)) {
    return "The server-side 21st token is missing or invalid. Rotate/check it, then restart the server.";
  }
  if (/openrouter|external api key/i.test(message)) {
    return "Configure a valid external model provider key in the 21st dashboard for my-agent, or use the local /api/ai fallback routes.";
  }
  if (/sandbox/i.test(message)) {
    return "Sandbox could not be created. Check the 21st deployment and account limits.";
  }
  return "Check dev-server.log for the full server-side error.";
}
