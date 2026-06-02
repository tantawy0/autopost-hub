export function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown 21st agent error";
}

export function getAgentSetupHint(message: string) {
  if (/not found/i.test(message)) {
    return "Agent my-agent is not deployed yet. Run npx @21st-sdk/cli deploy --agent my-agent.";
  }
  if (/unauthorized|invalid|api key|401|403/i.test(message)) {
    return "API_KEY_21ST is missing or invalid. Rotate/check the key, then restart the server.";
  }
  if (/openrouter|external api key/i.test(message)) {
    return "Configure OPENROUTER_API_KEY in the 21st dashboard for my-agent, or set OPENROUTER_API_KEY in .env.local for /api/ai routes.";
  }
  if (/sandbox/i.test(message)) {
    return "Sandbox could not be created. Check the 21st deployment and account limits.";
  }
  return "Check dev-server.log for the full server-side error.";
}
