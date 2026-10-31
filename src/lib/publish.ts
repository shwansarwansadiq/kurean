import { db } from "./db";
import { publishReel, publishSocial } from "./social";
import { readyVideo } from "./video";

/** A reel whose video is still not ready this long after publishing is given up (the cards are already out). */
const REEL_WAIT_MS = 6 * 3600_000;
import { postDueScenery, queueSceneryAfter } from "./scenery";

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
  // The motion video goes out as a Reel by the 5-minute job. If it is already made, it is also the story
  // (instead of the still card); if not, the card story goes now and the Reel follows when the video is ready.
  const videoNow = social && (await readyVideo(id).catch(() => null)) !== null;
  if (social) await db().from("stories").update({ reel_status: "waiting", reel_story: videoNow }).eq("id", id);
  await publishSocial(id, list, videoNow ? ["feed"] : ["feed", "story"]);
  // news → scenery → news: one Korea scenery clip 20 minutes later, if one is approved and ready.
  await queueSceneryAfter(id, list).catch(() => null);
  return true;
}

/** The scheduler's pass: publishes approved stories whose time has come (oldest first, two at a time). */
export async function publishDue(now = new Date()): Promise<number[]> {
  await postDueScenery(now).catch((e) => console.error("scenery failed", e));
  await postDueReels(now).catch((e) => console.error("reels failed", e));
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

/** The publish job's pass for Reels: published stories whose motion video is now ready (one at a time). */
export async function postDueReels(now = new Date()): Promise<number[]> {
  const { data } = await db()
    .from("stories")
    .select("id, platforms, published_at, reel_story")
    .eq("status", "published")
    .eq("reel_status", "waiting")
    .order("published_at", { ascending: true })
    .limit(5);
  const done: number[] = [];
  for (const s of (data ?? []) as { id: number; platforms: string[] | null; published_at: string | null; reel_story: boolean }[]) {
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
    await publishReel(s.id, s.platforms ?? [], video, s.reel_story).catch((e) => console.error("reel", s.id, e));
    await db().from("stories").update({ reel_status: "done", reel_posted_at: new Date().toISOString() }).eq("id", s.id);
    done.push(s.id);
    break; // one per run: video posts take a minute or two each
  }
  return done;
}
