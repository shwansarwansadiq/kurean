import { db } from "./db";
import { facebookFeed, facebookStory, instagramFeed, instagramStory, metaTargets } from "./meta";
import { renderCards } from "./render-card";

export type SocialResult = { platform: string; kind: "feed" | "story"; ok: boolean; id?: string; error?: string };

type StoryRow = { id: number; caption_instagram: string; caption_facebook: string };

const shortLink = (id: number) => `https://kurean.news/n/${id}`;

/** Facebook links are clickable in posts; Instagram's are not, so the caption points to the link in the design. */
export function captions(s: StoryRow) {
  return {
    facebook: `${s.caption_facebook.trim()}\n\n${shortLink(s.id)}`,
    instagram: `${s.caption_instagram.trim()}\n\nهەواڵی تەواو: kurean.news/n/${s.id}`,
  };
}

/**
 * Posts an approved story to the chosen platforms: a feed post and a story on each. Runs only from the
 * dashboard's Publish button. Every attempt is recorded in social_posts; one failure does not stop the others.
 */
export async function publishSocial(storyId: number, platforms: string[]): Promise<SocialResult[]> {
  const wanted = platforms.filter((p) => p === "instagram" || p === "facebook");
  if (!wanted.length) return [];
  const { data, error } = await db().from("stories").select("id, caption_instagram, caption_facebook").eq("id", storyId).single<StoryRow>();
  if (error) throw error;
  const cap = captions(data);

  const results: SocialResult[] = [];
  const record = async (r: SocialResult) => {
    results.push(r);
    await db().from("social_posts").insert({ story_id: storyId, platform: r.platform, kind: r.kind, ok: r.ok, external_id: r.id ?? null, error: r.error ?? null });
  };
  const attempt = async (platform: string, kind: "feed" | "story", fn: () => Promise<string>) => {
    try {
      await record({ platform, kind, ok: true, id: await fn() });
    } catch (e) {
      await record({ platform, kind, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  };

  let cards: Awaited<ReturnType<typeof renderCards>>;
  let targets: Awaited<ReturnType<typeof metaTargets>>;
  try {
    [cards, targets] = await Promise.all([renderCards(storyId), metaTargets()]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    for (const p of wanted) for (const k of ["feed", "story"] as const) await record({ platform: p, kind: k, ok: false, error: msg });
    return results;
  }

  if (wanted.includes("instagram")) {
    await attempt("instagram", "feed", () => instagramFeed(targets, cards.feed, cap.instagram));
    await attempt("instagram", "story", () => instagramStory(targets, cards.story));
  }
  if (wanted.includes("facebook")) {
    await attempt("facebook", "feed", () => facebookFeed(targets, cards.feed, cap.facebook));
    await attempt("facebook", "story", () => facebookStory(targets, cards.story));
  }
  return results;
}
