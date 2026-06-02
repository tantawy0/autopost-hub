import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

import { scoreContent } from "@/lib/content-scoring";
import { scoreAndPersistContent } from "@/lib/server/ai/content-score-service";

export function buildAssistantSuggestions(caption: string) {
  const score = scoreContent({ caption });

  return [
    score.hookScore < 70 ? "Rewrite the first line as a direct benefit or tension point." : "Keep the hook direct and visual.",
    score.clarityScore < 70 ? "Cut filler and separate the idea into short readable beats." : "Caption structure is readable.",
    score.viralScore < 70 ? "Add a save-worthy takeaway and one light call to action." : "This is ready for a posting window test.",
  ];
}

/** @deprecated Use scoreAndPersistContent from lib/server/ai/content-score-service */
export async function persistContentScore(
  client: SupabaseClient,
  user: User,
  input: {
    postId?: string | null;
    caption: string;
    platform?: string | null;
  },
) {
  return scoreAndPersistContent(client, user, input);
}
