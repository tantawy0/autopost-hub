import type { Platform } from "@/lib/types";

export interface ContentScoreInput {
  caption: string;
  platform?: Platform | null;
}

export interface ContentScoreResult {
  viralScore: number;
  clarityScore: number;
  hookScore: number;
  recommendations: string[];
  scoringVersion: "heuristic-v1";
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function scoreContent(input: ContentScoreInput): ContentScoreResult {
  const caption = input.caption.trim();
  const words = caption.split(/\s+/).filter(Boolean);
  const hasQuestion = /\?/.test(caption);
  const hasHashtag = /#[a-z0-9_]+/i.test(caption);
  const hasCTA = /\b(comment|save|share|follow|try|watch|dm|tap|join)\b/i.test(caption);
  const hasHook = words.length > 0 && words.slice(0, 12).some((word) => /^(how|why|this|stop|start|before|after|what|here)/i.test(word));
  const lengthScore = caption.length < 40 ? 40 : caption.length < 320 ? 82 : caption.length < 900 ? 68 : 45;

  const hookScore = clamp((hasHook ? 72 : 40) + (hasQuestion ? 12 : 0) + (words.length < 8 ? -12 : 0));
  const clarityScore = clamp(lengthScore + (caption.includes("\n") ? 6 : 0) + (words.length > 160 ? -15 : 0));
  const viralScore = clamp(hookScore * 0.42 + clarityScore * 0.32 + (hasCTA ? 12 : 0) + (hasHashtag ? 7 : 0) + (hasQuestion ? 6 : 0));
  const recommendations: string[] = [];

  if (!hasHook) recommendations.push("Open with a sharper hook in the first 8-12 words.");
  if (!hasCTA) recommendations.push("Add one calm call to action: save, comment, share, or DM.");
  if (!hasHashtag && input.platform !== "Facebook") recommendations.push("Add 2-5 specific hashtags instead of broad generic tags.");
  if (caption.length > 900) recommendations.push("Tighten the caption for short-form reading speed.");

  return {
    viralScore,
    clarityScore,
    hookScore,
    recommendations,
    scoringVersion: "heuristic-v1",
  };
}
