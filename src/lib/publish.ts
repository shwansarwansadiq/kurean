import { db } from "./db";
import { publishSocial } from "./social";
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
  await publishSocial(id, list);
  // news → scenery → news: one Korea scenery clip 20 minutes later, if one is approved and ready.
  await queueSceneryAfter(id, list).catch(() => null);
  return true;
}

/** The scheduler's pass: publishes approved stories whose time has come (oldest first, two at a time). */
export async function publishDue(now = new Date()): Promise<number[]> {
  await postDueScenery(now).catch((e) => console.error("scenery failed", e));
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
