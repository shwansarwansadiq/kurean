/** Posting the daily round-up (see roundup.ts): the carousel and cover story, then the video as a Reel and story. */
import { db } from "./db";
import { instagramCarousel, instagramReel, instagramStory, instagramVideoStory, metaTargets } from "./meta";
import { renderPages } from "./render-card";
import { siteUrl } from "./site";
import { roundupCaption, storiesByIds, type Roundup } from "./roundup";

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 400);

export async function postCarousel(row: Roundup): Promise<void> {
  const stories = await storiesByIds(row.story_ids);
  const base = siteUrl();
  let results: string[] = [];
  try {
    const slides = await renderPages([
      { url: `${base}/card/roundup/${row.day}?slide=cover&f=feed`, width: 1080, height: 1350, name: `roundup-${row.day}-cover` },
      ...stories.map((s) => ({ url: `${base}/card/${s.id}?f=feed`, width: 1080, height: 1350, name: `roundup-${row.day}-${s.id}` })),
      { url: `${base}/card/roundup/${row.day}?slide=end&f=feed`, width: 1080, height: 1350, name: `roundup-${row.day}-end` },
      { url: `${base}/card/roundup/${row.day}?slide=cover&f=story`, width: 1080, height: 1920, name: `roundup-${row.day}-cover-story` },
    ]);
    const storyCover = slides.pop()!;
    const t = await metaTargets();
    try {
      results.push(`carousel: ok ${await instagramCarousel(t, slides, roundupCaption(row.day, stories, "carousel"))}`);
    } catch (e) {
      results.push(`carousel: ${msg(e)}`);
    }
    try {
      await db().from("roundups").update({ story_result: `cover: ok ${await instagramStory(t, storyCover)}` }).eq("day", row.day);
    } catch (e) {
      await db().from("roundups").update({ story_result: `cover: ${msg(e)}` }).eq("day", row.day);
    }
  } catch (e) {
    results = [`carousel: ${msg(e)}`];
  }
  await db()
    .from("roundups")
    .update({ status: "video", carousel_result: results.join(" · "), posted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("day", row.day);
}

export async function postVideo(row: Roundup, videoUrl: string): Promise<void> {
  const stories = await storiesByIds(row.story_ids);
  const out: string[] = [];
  try {
    const t = await metaTargets();
    for (const [name, post] of [
      ["reel", () => instagramReel(t, videoUrl, roundupCaption(row.day, stories, "reel"))],
      ["story", () => instagramVideoStory(t, videoUrl)],
    ] as const) {
      try {
        out.push(`${name}: ok ${await post()}`);
      } catch (e) {
        out.push(`${name}: ${msg(e)}`);
      }
    }
  } catch (e) {
    out.push(msg(e));
  }
  await db().from("roundups").update({ reel_result: out.join(" · "), reel_posted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("day", row.day);
}
