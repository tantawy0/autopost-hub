import { agent, tool } from "@21st-sdk/agent";
import { z } from "zod";

const platformSchema = z.enum(["Instagram", "Facebook", "TikTok"]);

function text(content: unknown) {
  return { content: [{ type: "text" as const, text: typeof content === "string" ? content : JSON.stringify(content) }] };
}

export default agent({
  runtime: "claude-code",
  model: "claude-sonnet-4-6",
  permissionMode: "bypassPermissions",
  maxTurns: 25,
  systemPrompt:
    "You are my-agent, the AutoPost Hub assistant for creators, agencies, and social media managers. Help with captions, scheduling, hashtags, analytics summaries, and draft planning. Return concise, actionable output.",
  tools: {
    generateCaption: tool({
      description: "Generate a creator-ready social caption from a short brief.",
      inputSchema: z.object({
        brief: z.string().min(3),
        tone: z.string().default("premium, clear, creator-focused"),
        platform: platformSchema.default("Instagram"),
      }),
      execute: async ({ brief, tone, platform }) =>
        text({
          platform,
          caption: `${brief}\n\nBuilt for ${platform} with a ${tone} tone.\n\nSave this, share it, or send it to someone who needs it today.`,
        }),
    }),
    rewriteCaptionForPlatform: tool({
      description: "Rewrite a caption for a specific social platform.",
      inputSchema: z.object({
        caption: z.string().min(1),
        platform: platformSchema,
      }),
      execute: async ({ caption, platform }) =>
        text({
          platform,
          rewritten: platform === "TikTok" ? `${caption}\n\nMake it fast, visual, and hook-led.` : `${caption}\n\nOptimized for ${platform}.`,
        }),
    }),
    suggestHashtags: tool({
      description: "Suggest relevant hashtags for a post.",
      inputSchema: z.object({
        topic: z.string().min(2),
        platform: platformSchema.default("Instagram"),
      }),
      execute: async ({ topic, platform }) =>
        text({
          platform,
          hashtags: [
            `#${topic.toLowerCase().replace(/[^a-z0-9]+/g, "")}`,
            "#creatorworkflow",
            "#socialmedia",
            "#contentstrategy",
            "#brandgrowth",
          ],
        }),
    }),
    suggestBestPostTime: tool({
      description: "Suggest a safe best-time posting window.",
      inputSchema: z.object({
        platform: platformSchema.default("Instagram"),
        timezone: z.string().default("Africa/Cairo"),
      }),
      execute: async ({ platform, timezone }) =>
        text({
          platform,
          timezone,
          windows: ["11:00-13:00", "18:00-21:00"],
          note: "Use real account analytics when available; this is a safe starter recommendation.",
        }),
    }),
    summarizeAnalytics: tool({
      description: "Summarize analytics numbers into clear next actions.",
      inputSchema: z.object({
        impressions: z.number().nonnegative().default(0),
        engagement: z.number().nonnegative().default(0),
        clicks: z.number().nonnegative().default(0),
      }),
      execute: async ({ impressions, engagement, clicks }) =>
        text({
          summary: `Impressions ${impressions}, engagement ${engagement}, clicks ${clicks}.`,
          nextActions: ["Repeat the best creative angle", "Test one stronger CTA", "Schedule follow-up content within 48 hours"],
        }),
    }),
    createPostDraft: tool({
      description: "Create a backend-ready post draft payload without publishing it.",
      inputSchema: z.object({
        caption: z.string().min(1),
        platform: platformSchema.default("Instagram"),
        firstComment: z.string().optional(),
      }),
      execute: async ({ caption, platform, firstComment }) =>
        text({
          status: "Draft",
          caption,
          platforms: [platform],
          firstComment: firstComment ?? "",
          scheduledFor: null,
        }),
    }),
  },
});
