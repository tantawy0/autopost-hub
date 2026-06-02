import { getClientUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { SocialPostDTO } from "@/lib/types";
import { normalizePlatform } from "@/lib/types";

type SocialPostRow = {
  id: string;
  connected_account_id: string;
  platform: string;
  account_name?: string | null;
  external_post_id: string;
  caption?: string | null;
  media_type?: string | null;
  media_url?: string | null;
  permalink?: string | null;
  timestamp?: string | null;
  like_count?: number | null;
  comments_count?: number | null;
  reactions_count?: number | null;
  engagement_rate?: number | null;
  views_count?: number | null;
  shares_count?: number | null;
  saves_count?: number | null;
  follows_count?: number | null;
  reach_count?: number | null;
};

function toSocialPostDTO(row: SocialPostRow): SocialPostDTO {
  const platform = normalizePlatform(row.platform);

  return {
    id: row.id,
    connectedAccountId: row.connected_account_id,
    platform,
    accountName: row.account_name ?? `${platform} Account`,
    externalPostId: row.external_post_id,
    caption: row.caption ?? "",
    mediaType: row.media_type ?? null,
    mediaUrl: row.media_url ?? null,
    permalink: row.permalink ?? null,
    timestamp: row.timestamp ?? null,
    likeCount: row.like_count ?? null,
    commentsCount: row.comments_count ?? null,
    reactionsCount: row.reactions_count ?? row.like_count ?? null,
    engagementRate: row.engagement_rate ?? null,
    viewsCount: row.views_count ?? null,
    sharesCount: row.shares_count ?? null,
    savesCount: row.saves_count ?? null,
    followsCount: row.follows_count ?? null,
    reachCount: row.reach_count ?? null,
  };
}

export async function listImportedSocialPosts(): Promise<SocialPostDTO[]> {
  const user = await getClientUser();
  let { data, error } = await supabase
    .from("social_posts")
    .select("id, connected_account_id, platform, account_name, external_post_id, caption, media_type, media_url, permalink, timestamp, like_count, comments_count, reactions_count, engagement_rate, views_count, shares_count, saves_count, follows_count, reach_count")
    .eq("user_id", user.id)
    .order("timestamp", { ascending: false, nullsFirst: false });

  if (error && /reactions_count|engagement_rate|views_count|shares_count|saves_count|follows_count|reach_count|schema cache/i.test(error.message)) {
    const legacy = await supabase
      .from("social_posts")
      .select("id, connected_account_id, platform, account_name, external_post_id, caption, media_type, media_url, permalink, timestamp, like_count, comments_count")
      .eq("user_id", user.id)
      .order("timestamp", { ascending: false, nullsFirst: false });

    data = legacy.data as typeof data;
    error = legacy.error;
  }

  if (error) {
    if (/relation .*social_posts|schema cache|does not exist/i.test(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => toSocialPostDTO(row as SocialPostRow));
}
