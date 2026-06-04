import "server-only";

import { AgentClient } from "@21st-sdk/node";

/** 21st agent runtime — provider keys (e.g. OpenRouter) are configured in 21st dashboard, not exposed to client. */
export const agentClient = new AgentClient({
  apiKey: process.env.API_KEY_21ST ?? "",
});
