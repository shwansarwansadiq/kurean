import { db } from "./db";
import { FIXTURES, fixturesOn } from "./fixtures";
import type { CategoryKey, SourceRef } from "./site";

export const PLATFORMS = ["website", "instagram", "facebook", "tiktok"] as const;
export const PLATFORM_LABEL: Record<(typeof PLATFORMS)[number], string> = {
  website: "Website",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
};

export type AdminStory = {
  id: number;
  category: CategoryKey;
  headline: string;
  card_headline: string;
  body: string;
  key_points: string[];
  caption_instagram: string;
  caption_facebook: string;
  caption_tiktok: string;
  hashtags: string[];
  source_name: string;
  source_url: string;
  sources: SourceRef[];
  needs_second_source: boolean;
  status: string;
  image_url: string | null;
  image_credit: string | null;
  image_source: string | null;
  image_license: string | null;
  platforms: string[];
  sticker_done: boolean;
  edited_at: string | null;
  published_at: string | null;
  created_at: string;
  raw_items: { score_reason: string | null } | null;
};

const FIELDS = "*, raw_items(score_reason)";

export async function storiesByStatus(status: string, limit = 50): Promise<AdminStory[]> {
  if (fixturesOn()) return status === "pending" ? FIXTURES.map((s) => ({ ...s, status: "pending" })) : status === "published" ? FIXTURES : [];
  const { data, error } = await db()
    .from("stories")
    .select(FIELDS)
    .eq("status", status)
    .order(status === "published" ? "published_at" : "created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AdminStory[];
}

export async function adminStory(id: number): Promise<AdminStory | null> {
  if (fixturesOn()) return FIXTURES.find((s) => s.id === id) ?? null;
  const { data, error } = await db().from("stories").select(FIELDS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data as AdminStory | null;
}

export async function counts(): Promise<Record<string, number>> {
  if (fixturesOn()) return { pending: FIXTURES.length, published: FIXTURES.length, skipped: 0, stickers: 2 };
  const out: Record<string, number> = {};
  for (const s of ["pending", "published", "skipped"]) {
    const { count } = await db().from("stories").select("id", { count: "exact", head: true }).eq("status", s);
    out[s] = count ?? 0;
  }
  const { count } = await db()
    .from("stories")
    .select("id", { count: "exact", head: true })
    .eq("status", "published")
    .eq("sticker_done", false)
    .contains("platforms", ["instagram"]);
  out.stickers = count ?? 0;
  return out;
}

export const isSensitive = (s: AdminStory) => (s.raw_items?.score_reason ?? "").split(" · ")[1] === "sensitive";

/** What the dashboard says about a story's photo and its copyright risk. */
export function photoStatus(s: Pick<AdminStory, "image_url" | "image_license">): { label: string; tone: "ok" | "warn" | "risk" | "none" } {
  const l = s.image_license ?? "";
  if (l.startsWith("free:")) return { label: `وێنەی ئازاد · ${l.slice(5)}`, tone: "ok" };
  if (l === "source-agency") return { label: "وێنەی ئاژانس: مەترسی کۆپیرایتی زۆرە", tone: "risk" };
  if (l === "too-small") return { label: "وێنەی سەرچاوە زۆر بچووک بوو: کارتی براند", tone: "none" };
  if (l === "removed") return { label: "وێنە لابرا: کارتی براند", tone: "none" };
  if (s.image_url) return { label: "وێنەی سەرچاوە: کۆپیرایتی هەیە", tone: "warn" };
  return { label: "بێ وێنە: کارتی براند", tone: "none" };
}

export type SocialPost = { story_id: number; platform: string; kind: string; ok: boolean; error: string | null; created_at: string };

/** Latest attempt per story, platform and kind. */
export async function socialPosts(storyIds: number[]): Promise<Map<number, SocialPost[]>> {
  const out = new Map<number, SocialPost[]>();
  if (!storyIds.length || fixturesOn()) return out;
  const { data } = await db()
    .from("social_posts")
    .select("story_id, platform, kind, ok, error, created_at")
    .in("story_id", storyIds)
    .order("created_at", { ascending: false });
  for (const p of (data ?? []) as SocialPost[]) {
    const list = out.get(p.story_id) ?? [];
    if (!list.some((x) => x.platform === p.platform && x.kind === p.kind)) list.push(p);
    out.set(p.story_id, list);
  }
  return out;
}
