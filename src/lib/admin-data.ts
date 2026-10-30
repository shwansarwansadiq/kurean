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
