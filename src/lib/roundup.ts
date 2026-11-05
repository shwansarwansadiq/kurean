/**
 * The daily Instagram round-up (Shwan, 6 Nov): instead of one feed photo per story, at 21:00 Hawler the day's
 * published news goes out as
 *   1. one carousel (1080×1350): a cover listing the headlines, one slide per story (its feed card), an end slide;
 *   2. one video (9:16, Kurean's own music) of the same stories, as a Reel;
 * and each also as an Instagram story (the cover image, then the video).
 * Only stories Shwan published that day with Instagram ticked are in it (nothing new is ever published by it).
 * The 5-minute publish job keeps today's row in `roundups` up to date until 21:00 (so the video is made in advance),
 * then freezes the list, posts the carousel, and posts the video once it matches the frozen list.
 */
import { db } from "./db";
import { CATEGORY_META, type CategoryKey } from "./site";
import { HAWLER_OFFSET_MS, hawlerMidnight } from "./schedule";

export const ROUNDUP_HOUR = Number(process.env.KUREAN_ROUNDUP_HOUR ?? 21);
/** Instagram carousels take at most 10 items: a cover, up to 8 stories, an end slide. */
export const MAX_STORIES = 8;
/** The video may be late (a story published just before 21:00); after this long the Reel is given up. */
const VIDEO_WAIT_MS = 3 * 3600_000;

export type RoundupStory = {
  id: number;
  category: CategoryKey;
  card_headline: string;
  image_url: string | null;
  image_credit: string | null;
  published_at: string;
};

export type Roundup = {
  day: string;
  story_ids: number[];
  status: "collecting" | "posting" | "video" | "done" | "empty";
  video_url: string | null;
  video_hash: string | null;
  carousel_result: string | null;
  story_result: string | null;
  reel_result: string | null;
};

/** "2026-11-06": the Hawler calendar day of a moment. */
export function hawlerDay(d: Date): string {
  return new Date(d.getTime() + HAWLER_OFFSET_MS).toISOString().slice(0, 10);
}

const WEEKDAYS = ["یەکشەممە", "دووشەممە", "سێشەممە", "چوارشەممە", "پێنجشەممە", "هەینی", "شەممە"];
const MONTHS = ["کانوونی دووەم", "شوبات", "ئازار", "نیسان", "ئایار", "حوزەیران", "تەممووز", "ئاب", "ئەیلوول", "تشرینی یەکەم", "تشرینی دووەم", "کانوونی یەکەم"];
const KU = "٠١٢٣٤٥٦٧٨٩";
export const kuDigits = (n: number | string) => String(n).replace(/\d/g, (d) => KU[Number(d)]);

/** "هەینی ٦ی تشرینی دووەم" for "2026-11-06". */
export function dayLabel(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]} ${kuDigits(d.getUTCDate())}ی ${MONTHS[d.getUTCMonth()]}`;
}

/** The day's stories for the round-up: published that Hawler day before `until`, Instagram ticked, oldest first. */
export async function roundupStories(day: string, until: Date): Promise<RoundupStory[]> {
  const from = hawlerMidnight(new Date(`${day}T12:00:00Z`)).toISOString();
  const { data, error } = await db()
    .from("stories")
    .select("id, category, card_headline, image_url, image_credit, published_at, kind")
    .eq("status", "published")
    .gte("published_at", from)
    .lt("published_at", until.toISOString())
    .contains("platforms", ["instagram"])
    .order("published_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return ((data ?? []) as (RoundupStory & { kind: string | null })[])
    .filter((s) => s.kind !== "chart") // the weekly chart has its own post
    .slice(0, MAX_STORIES)
    .reverse();
}

/** Stories by id, in the given order (published ones only). */
export async function storiesByIds(ids: number[]): Promise<RoundupStory[]> {
  if (!ids.length) return [];
  const { data } = await db().from("stories").select("id, category, card_headline, image_url, image_credit, published_at").in("id", ids).eq("status", "published");
  const byId = new Map(((data ?? []) as RoundupStory[]).map((s) => [s.id, s]));
  return ids.map((id) => byId.get(id)).filter(Boolean) as RoundupStory[];
}

export async function getRoundup(day: string): Promise<Roundup | null> {
  const { data } = await db().from("roundups").select("*").eq("day", day).maybeSingle();
  return (data as Roundup | null) ?? null;
}

/** The cutoff moment (21:00 Hawler) of a day. */
export function cutoffOf(day: string): Date {
  return new Date(hawlerMidnight(new Date(`${day}T12:00:00Z`)).getTime() + ROUNDUP_HOUR * 3600_000);
}

/** Before 21:00: keep today's list current, so the video can be made ahead of time. */
export async function syncRoundup(now = new Date()): Promise<void> {
  const day = hawlerDay(now);
  if (now >= cutoffOf(day)) return;
  const ids = (await roundupStories(day, now)).map((s) => s.id);
  const row = await getRoundup(day);
  if (!row) {
    if (ids.length) await db().from("roundups").insert({ day, story_ids: ids });
    return;
  }
  if (row.status === "collecting" && row.story_ids.join() !== ids.join()) {
    await db().from("roundups").update({ story_ids: ids, updated_at: new Date().toISOString() }).eq("day", day).eq("status", "collecting");
  }
}

/** Captions: the headlines as a numbered list, the link, the photo credits (never on the images) and tags. */
export function roundupCaption(day: string, stories: RoundupStory[], kind: "carousel" | "reel"): string {
  const list = stories.map((s, i) => `${kuDigits(i + 1)}. ${s.card_headline.trim()}`).join("\n");
  const credits = [...new Set(stories.map((s) => s.image_credit).filter(Boolean))];
  const lead = kind === "carousel" ? "هەواڵەکانی ئەمڕۆی کۆریا بە کوردی 🇰🇷" : "هەواڵەکانی ئەمڕۆ لە یەک ڤیدیۆدا 🎬";
  const cats = [...new Set(stories.map((s) => s.category))];
  const tags = ["#کوریەن", "#کۆریا", ...cats.map((c) => (c === "kpop" ? "#kpop" : c === "kdrama_film" ? "#kdrama" : c === "culture" ? "#korea" : "#southkorea"))];
  return [
    `${lead}\n${dayLabel(day)}`,
    list,
    "هەواڵی تەواو: kurean.news",
    credits.length ? `📷 ${credits.join(" · ")}` : "",
    [...new Set(tags)].join(" "),
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 2100);
}

/** What the round-up video shows (also the input of its hash). */
export function roundupVideoProps(day: string, stories: RoundupStory[]) {
  const music = ["seoul-night", "han-river", "blossom", "jeju-breeze"][Number(day.slice(-2)) % 4];
  return {
    dateLabel: dayLabel(day),
    items: stories.map((s) => ({
      headline: s.card_headline,
      image: s.image_url,
      label: CATEGORY_META[s.category].label,
      colour: CATEGORY_META[s.category].colour,
    })),
    music,
  };
}

/** Row id for the video worker: the day as a number (20261106). */
export const roundupVideoId = (day: string) => Number(day.replace(/-/g, ""));
export const dayOfVideoId = (id: number) => {
  const s = String(id);
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
};

/**
 * The publish job's round-up pass. Returns true when it posted something (the run then does nothing else heavy).
 * From 21:00: freeze the list and post the carousel and the cover story; then post the video once it is ready.
 */
export async function postRoundup(now = new Date()): Promise<boolean> {
  // Today's round-up, or yesterday's if its video is still due (a run just after midnight).
  for (const day of [hawlerDay(now), hawlerDay(new Date(now.getTime() - 86_400_000))]) {
    const cutoff = cutoffOf(day);
    if (now < cutoff) continue;
    let row = await getRoundup(day);
    if (!row || row.status === "collecting") {
      const ids = (await roundupStories(day, cutoff)).map((s) => s.id);
      if (!row) {
        const { error } = await db().from("roundups").insert({ day, story_ids: ids, status: ids.length ? "collecting" : "empty" });
        if (error) continue; // another run made it
        if (!ids.length) continue;
      }
      // Claim it, so two runs never post the same round-up.
      const { data: claimed } = await db()
        .from("roundups")
        .update({ story_ids: ids, status: ids.length ? "posting" : "empty", updated_at: new Date().toISOString() })
        .eq("day", day)
        .eq("status", "collecting")
        .select("*");
      if (!claimed?.length || !ids.length) continue;
      row = claimed[0] as Roundup;
      const { postCarousel } = await import("./roundup-post");
      await postCarousel(row).catch((e) => console.error("roundup carousel", e));
      return true;
    }
    if (row.status === "video") {
      const { readyRoundupVideo } = await import("./video");
      const video = await readyRoundupVideo(row);
      if (!video) {
        if (now.getTime() - cutoff.getTime() > VIDEO_WAIT_MS) {
          await db().from("roundups").update({ status: "done", reel_result: "the video was not ready in time" }).eq("day", day).eq("status", "video");
        }
        continue;
      }
      const { data: claimed } = await db().from("roundups").update({ status: "done" }).eq("day", day).eq("status", "video").select("day");
      if (!claimed?.length) continue;
      const { postVideo } = await import("./roundup-post");
      await postVideo(row, video).catch((e) => console.error("roundup video", e));
      return true;
    }
  }
  return false;
}
