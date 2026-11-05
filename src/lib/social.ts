import { db } from "./db";
import { facebookFeed, facebookStory, facebookVideoStory, instagramStory, instagramVideoStory, metaTargets } from "./meta";
import { renderCards } from "./render-card";

export type SocialResult = { platform: string; kind: "feed" | "story"; ok: boolean; id?: string; error?: string };

type StoryRow = { id: number; caption_instagram: string; caption_facebook: string; image_credit?: string | null };

const shortLink = (id: number) => `https://kurean.news/n/${id}`;

/** Facebook links are clickable in posts; Instagram's are not, so the caption points to the link in the design. */
export function captions(s: StoryRow) {
  // The photo credit is no longer printed on the image (Shwan, 30 Oct), so it goes at the end of the caption.
  const credit = s.image_credit ? `\n📷 ${s.image_credit}` : "";
  return {
    facebook: `${s.caption_facebook.trim()}\n\n${shortLink(s.id)}${credit}`,
    instagram: `${s.caption_instagram.trim()}\n\nهەواڵی تەواو: kurean.news/n/${s.id}${credit}`,
  };
}

async function record(storyId: number, r: SocialResult) {
  await db().from("social_posts").insert({ story_id: storyId, platform: r.platform, kind: r.kind, ok: r.ok, external_id: r.id ?? null, error: r.error ?? null });
}

/**
 * Posts an approved story to the chosen platforms: a feed post and a story on each. Runs only after Shwan publishes
 * or schedules it. Every attempt is recorded in social_posts; one failure does not stop the others.
 * `kinds` limits it (a retry of what failed). The story card is left out when the motion video will be the story.
 */
export async function publishSocial(storyId: number, platforms: string[], kinds: ("feed" | "story")[] = ["feed", "story"]): Promise<SocialResult[]> {
  const wanted = platforms.filter((p) => p === "instagram" || p === "facebook");
  if (!wanted.length) return [];
  const { data, error } = await db().from("stories").select("id, caption_instagram, caption_facebook, image_credit").eq("id", storyId).single<StoryRow>();
  if (error) throw error;
  const cap = captions(data);

  const results: SocialResult[] = [];
  const save = async (r: SocialResult) => {
    results.push(r);
    await record(storyId, r);
  };
  const attempt = async (platform: string, kind: "feed" | "story", fn: () => Promise<string>) => {
    if (!kinds.includes(kind)) return;
    try {
      await save({ platform, kind, ok: true, id: await fn() });
    } catch (e) {
      await save({ platform, kind, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  };
  if (!kinds.length) return results;

  let cards: Awaited<ReturnType<typeof renderCards>>;
  let targets: Awaited<ReturnType<typeof metaTargets>>;
  try {
    const formats = (["feed", "story"] as const).filter((f) => kinds.includes(f));
    [cards, targets] = await Promise.all([renderCards(storyId, [...formats]), metaTargets()]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    for (const p of wanted) for (const k of kinds) await save({ platform: p, kind: k, ok: false, error: msg });
    return results;
  }

  if (wanted.includes("instagram")) {
    // No Instagram feed photo per story (Shwan, 6 Nov): the day's stories go to the feed together at 21:00 (roundup.ts).
    await attempt("instagram", "story", () => instagramStory(targets, cards.story));
  }
  if (wanted.includes("facebook")) {
    await attempt("facebook", "feed", () => facebookFeed(targets, cards.feed, cap.facebook));
    await attempt("facebook", "story", () => facebookStory(targets, cards.story));
  }
  return results;
}

/** The story's motion video as its Instagram and Facebook story (never a feed post or Reel; Shwan, 2 Nov). */
export async function publishVideoStory(storyId: number, platforms: string[], videoUrl: string): Promise<SocialResult[]> {
  const wanted = platforms.filter((p) => p === "instagram" || p === "facebook");
  const results: SocialResult[] = [];
  const attempt = async (platform: string, fn: () => Promise<string>) => {
    let r: SocialResult;
    try {
      r = { platform, kind: "story", ok: true, id: await fn() };
    } catch (e) {
      r = { platform, kind: "story", ok: false, error: e instanceof Error ? e.message : String(e) };
    }
    results.push(r);
    await record(storyId, r);
  };
  let t: Awaited<ReturnType<typeof metaTargets>>;
  try {
    t = await metaTargets();
  } catch (e) {
    for (const p of wanted) await attempt(p, () => Promise.reject(e));
    return results;
  }
  if (wanted.includes("instagram")) await attempt("instagram", () => instagramVideoStory(t, videoUrl));
  if (wanted.includes("facebook")) await attempt("facebook", () => facebookVideoStory(t, videoUrl));
  return results;
}
