import { db } from "./db";
import { publishSocial, publishVideoStory } from "./social";
import { readyVideo } from "./video";
import { sendTikTokDrafts } from "./tiktok";

/** A video story still not posted this long after publishing is given up. */
const REEL_WAIT_MS = 6 * 3600_000;
import { postDailySceneryFeed, postDueScenery, queueSceneryAfter } from "./scenery";
import { postRoundup, syncRoundup } from "./roundup";

/**
 * Publishes a story Shwan approved: the site first, then social media (the cards link back to the article).
 * Used by "publish now" in /admin and by the scheduler for stories he scheduled. Only moves a story that is still
 * in one of `from`, so a story is never published twice.
 */
export async function publishApproved(id: number, platforms: string[], from: string[]): Promise<boolean> {
  const list = platforms.includes("website") ? platforms : ["website", ...platforms];
  const { data, error } = await db()
    .from("stories")
    .update({ status: "published", published_at: new Date().toISOString(), platforms: list, scheduled_at: null })
    .eq("id", id)
    .in("status", from)
    .select("id");
  if (error) throw error;
  if (!data?.length) return false;
  const social = list.some((p) => p === "instagram" || p === "facebook");
  // The motion video is never a feed post (Shwan, 2 Nov): when it is already made, it is the story instead of the
  // still card, posted by the 5-minute job (video takes a minute or two); otherwise the card story goes now.
  const videoNow = social && (await readyVideo(id).catch(() => null)) !== null;
  if (videoNow) await db().from("stories").update({ reel_status: "waiting", reel_story: true }).eq("id", id);
  await publishSocial(id, list, videoNow ? ["feed"] : ["feed", "story"]);
  // news → scenery → news: one Korea scenery clip 20 minutes later, if one is approved and ready.
  await queueSceneryAfter(id, list).catch(() => null);
  return true;
}

/** The scheduler's pass: publishes approved stories whose time has come (oldest first, two at a time). */
export async function publishDue(now = new Date()): Promise<number[]> {
  // TikTok first: one quick upload to the inbox (drafts; Shwan posts them himself with a trending sound).
  await sendTikTokDrafts(now).catch((e) => console.error("tiktok failed", e));
  // The daily Instagram round-up (21:00): keep today's list current, then post it. Posting it fills a run.
  await syncRoundup(now).catch((e) => console.error("roundup sync failed", e));
  const roundup = await postRoundup(now).catch((e) => (console.error("roundup failed", e), false));
  // Video posts take a minute or two each; the run has 5 minutes, so the daily feed clip waits for a quiet run.
  const scenery = roundup ? 0 : await postDueScenery(now).catch((e) => (console.error("scenery failed", e), 0));
  const videos = roundup ? [0] : await postDueReels(now).catch((e) => (console.error("video stories failed", e), []));
  if (!roundup && !scenery && !videos.length) await postDailySceneryFeed(now).catch((e) => console.error("scenery feed failed", e));
  const { data, error } = await db()
    .from("stories")
    .select("id, platforms")
    .eq("status", "approved")
    .not("scheduled_at", "is", null)
    .lte("scheduled_at", now.toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(2);
  if (error) throw error;
  const done: number[] = [];
  for (const s of (data ?? []) as { id: number; platforms: string[] }[]) {
    if (await publishApproved(s.id, s.platforms ?? [], ["approved"])) done.push(s.id);
  }
  return done;
}

/** The publish job's pass for video stories: published stories waiting for theirs (one at a time). */
export async function postDueReels(now = new Date()): Promise<number[]> {
  const { data } = await db()
    .from("stories")
    .select("id, platforms, published_at")
    .eq("status", "published")
    .eq("reel_status", "waiting")
    .order("published_at", { ascending: true })
    .limit(5);
  const done: number[] = [];
  for (const s of (data ?? []) as { id: number; platforms: string[] | null; published_at: string | null }[]) {
    const video = await readyVideo(s.id);
    if (!video) {
      if (s.published_at && now.getTime() - new Date(s.published_at).getTime() > REEL_WAIT_MS) {
        await db().from("stories").update({ reel_status: "gave-up" }).eq("id", s.id).eq("reel_status", "waiting");
      }
      continue;
    }
    // Claim it first, so two runs never post the same Reel.
    const { data: claimed } = await db().from("stories").update({ reel_status: "posting" }).eq("id", s.id).eq("reel_status", "waiting").select("id");
    if (!claimed?.length) continue;
    await publishVideoStory(s.id, s.platforms ?? [], video).catch((e) => console.error("reel", s.id, e));
    await db().from("stories").update({ reel_status: "done", reel_posted_at: new Date().toISOString() }).eq("id", s.id);
    done.push(s.id);
    break; // one per run: video posts take a minute or two each
  }
  return done;
}
