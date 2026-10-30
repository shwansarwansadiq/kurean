/**
 * Scenery stories (Shwan's request): between the news on Instagram and Facebook stories, one photo or short clip of
 * Korea's nature or landmarks from Pexels, in Kurean's design with royalty-free music Kurean owns.
 * - Weekly: `refreshScenery()` finds new candidates by named place (vertical, at least 1080×1920) → /admin/scenery.
 * - Shwan approves or rejects each one. Approved ones are rendered into an 8.5 s clip by the video workflow.
 * - After a story is published to Instagram/Facebook, `queueSceneryAfter()` puts one approved clip 20 minutes later;
 *   the 5-minute publish job posts it (`postDueScenery()`). No item repeats within 60 days.
 * Pexels rules followed: credit the photographer, our own design on top, no bulk copying, never used to train models.
 */
import { db } from "./db";
import { facebookVideoStory, instagramVideoStory, metaTargets } from "./meta";
import { MUSIC, PLACES, type Place } from "./places";

const API = "https://api.pexels.com";
export const REPEAT_DAYS = 60;
export const GAP_AFTER_NEWS_MS = 20 * 60_000;

type PexelsPhoto = { id: number; width: number; height: number; url: string; alt?: string; photographer: string; photographer_url: string; src: { original: string } };
type PexelsVideo = {
  id: number;
  width: number;
  height: number;
  duration: number;
  url: string;
  user: { name: string; url: string };
  video_files: { link: string; width: number | null; height: number | null; file_type: string; quality: string | null }[];
};

export type Candidate = {
  pexels_id: number;
  kind: "photo" | "video";
  url: string;
  page_url: string;
  width: number;
  height: number;
  duration: number | null;
  photographer: string;
  photographer_url: string | null;
  place_en: string;
  place_ckb: string;
};

/** Does the Pexels description or page address name this place? (Never guess a place from the picture.) */
export function namesPlace(text: string, place: Place): boolean {
  const t = text.toLowerCase().replace(/[-_/]+/g, " ");
  return place.must.some((w) => t.includes(w));
}

export function photoCandidate(p: PexelsPhoto, place: Place): Candidate | null {
  if (p.height < 1920 || p.width < 1080 || p.height <= p.width) return null;
  if (!namesPlace(`${p.alt ?? ""} ${p.url}`, place)) return null;
  return {
    pexels_id: p.id,
    kind: "photo",
    url: p.src.original,
    page_url: p.url,
    width: p.width,
    height: p.height,
    duration: null,
    photographer: p.photographer,
    photographer_url: p.photographer_url,
    place_en: place.en,
    place_ckb: place.ckb,
  };
}

/** A vertical clip with a file of at least 1080×1920 (the smallest such file, to keep renders quick). */
export function videoCandidate(v: PexelsVideo, place: Place): Candidate | null {
  if (v.height <= v.width || v.duration < 6) return null;
  if (!namesPlace(v.url, place)) return null;
  const file = v.video_files
    .filter((f) => f.file_type === "video/mp4" && (f.width ?? 0) >= 1080 && (f.height ?? 0) >= 1920)
    .sort((a, b) => (a.width ?? 0) - (b.width ?? 0))[0];
  if (!file) return null;
  return {
    pexels_id: v.id,
    kind: "video",
    url: file.link,
    page_url: v.url,
    width: file.width!,
    height: file.height!,
    duration: v.duration,
    photographer: v.user.name,
    photographer_url: v.user.url,
    place_en: place.en,
    place_ckb: place.ckb,
  };
}

async function pexels<T>(path: string, params: Record<string, string>): Promise<T | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${API}${path}?${new URLSearchParams(params)}`, { headers: { Authorization: key }, signal: AbortSignal.timeout(15_000) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Weekly: about `want` new candidates across rotating places, half photos and half clips, for Shwan to approve. */
export async function refreshScenery(want = 24, now = new Date()): Promise<{ added: number; reason?: string }> {
  if (!process.env.PEXELS_API_KEY) return { added: 0, reason: "PEXELS_API_KEY is not set in Vercel" };
  const { data: have } = await db().from("scenery").select("kind, pexels_id");
  const seen = new Set((have ?? []).map((r) => `${r.kind}:${r.pexels_id}`));
  // Start at a different place each week so the library stays varied.
  const week = Math.floor(now.getTime() / (7 * 86_400_000));
  const order = PLACES.map((_, i) => PLACES[(i + week * 5) % PLACES.length]);
  const found: Candidate[] = [];
  for (const place of order) {
    if (found.length >= want) break;
    const [photos, videos] = await Promise.all([
      pexels<{ photos: PexelsPhoto[] }>("/v1/search", { query: place.query, orientation: "portrait", size: "large", per_page: "15" }),
      pexels<{ videos: PexelsVideo[] }>("/videos/search", { query: place.query, orientation: "portrait", size: "large", per_page: "10" }),
    ]);
    const picks = [
      ...(photos?.photos ?? []).map((p) => photoCandidate(p, place)).filter(Boolean).slice(0, 1),
      ...(videos?.videos ?? []).map((v) => videoCandidate(v, place)).filter(Boolean).slice(0, 1),
    ] as Candidate[];
    for (const c of picks) {
      if (!seen.has(`${c.kind}:${c.pexels_id}`)) {
        seen.add(`${c.kind}:${c.pexels_id}`);
        found.push(c);
      }
    }
  }
  if (!found.length) return { added: 0 };
  const rows = found.slice(0, want).map((c, i) => ({ ...c, status: "pending", music: MUSIC[(week + i) % MUSIC.length] }));
  const { error } = await db().from("scenery").insert(rows);
  return error ? { added: 0, reason: error.message } : { added: rows.length };
}

/** After a story goes to Instagram/Facebook, line up one approved, rendered scenery clip for 20 minutes later. */
export async function queueSceneryAfter(storyId: number, platforms: string[], now = new Date()): Promise<number | null> {
  const social = platforms.filter((p) => p === "instagram" || p === "facebook");
  if (!social.length) return null;
  const { data: waiting } = await db().from("social_queue").select("scenery_id").is("done_at", null);
  // One scenery between two news stories: if one is already waiting, the next news story does not add another.
  if (waiting?.length) return null;
  const cutoff = new Date(now.getTime() - REPEAT_DAYS * 86_400_000).toISOString();
  const { data } = await db()
    .from("scenery")
    .select("id, last_posted_at")
    .eq("status", "approved")
    .not("video_url", "is", null)
    .or(`last_posted_at.is.null,last_posted_at.lt.${cutoff}`)
    .order("last_posted_at", { ascending: true, nullsFirst: true })
    .limit(20);
  const pick = (data ?? [])[0];
  if (!pick) return null;
  await db().from("social_queue").insert({ scenery_id: pick.id, after_story_id: storyId, platforms: social, due_at: new Date(now.getTime() + GAP_AFTER_NEWS_MS).toISOString() });
  return pick.id as number;
}

/** The publish job's pass: posts scenery clips whose time has come as Instagram and Facebook stories. */
export async function postDueScenery(now = new Date()): Promise<number> {
  const { data } = await db()
    .from("social_queue")
    .select("id, scenery_id, platforms, scenery(video_url, status)")
    .is("done_at", null)
    .lte("due_at", now.toISOString())
    .order("due_at")
    .limit(2);
  let posted = 0;
  for (const q of (data ?? []) as unknown as { id: number; scenery_id: number; platforms: string[]; scenery: { video_url: string | null; status: string } | null }[]) {
    // Claim it first, so two runs never post the same clip.
    const { data: claimed } = await db().from("social_queue").update({ done_at: new Date().toISOString(), result: "posting" }).eq("id", q.id).is("done_at", null).select("id");
    if (!claimed?.length) continue;
    const results: string[] = [];
    if (q.scenery?.video_url && q.scenery.status === "approved") {
      try {
        const t = await metaTargets();
        for (const p of q.platforms) {
          try {
            const id = p === "instagram" ? await instagramVideoStory(t, q.scenery.video_url) : await facebookVideoStory(t, q.scenery.video_url);
            results.push(`${p}: ok ${id}`);
          } catch (e) {
            results.push(`${p}: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      } catch (e) {
        results.push(e instanceof Error ? e.message : String(e));
      }
      await db().from("scenery").update({ last_posted_at: new Date().toISOString() }).eq("id", q.scenery_id);
      posted++;
    } else {
      results.push("skipped: the clip is no longer approved or ready");
    }
    await db().from("social_queue").update({ result: results.join(" · ").slice(0, 900) }).eq("id", q.id);
  }
  return posted;
}
