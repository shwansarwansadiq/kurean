/**
 * Updates and live stories (Shwan, 17 Nov). When a new report adds facts to news Kurean already has:
 * - the story is not published yet → the report is folded into it (rewritten from all its reports, still pending);
 * - the story is published → a short Sorani update waits for Shwan's approval (dashboard or Telegram). Approved, it
 *   appears at the top of the article, the story shows "ڕاستەوخۆ" (live) for 12 hours, and the update goes out as an
 *   Instagram/Facebook story card on the platforms the story was published to.
 * Nothing new is ever published without Shwan's approval.
 */
import { db, type GlossaryTerm, type Source } from "./db";
import { facebookStory, instagramStory, metaTargets } from "./meta";
import { renderPages } from "./render-card";
import { siteUrl } from "./site";
import { callTool, regenerate, WRITE_MODEL } from "./writer";
import { UPDATE_TOOL, UpdateSchema, updateSystem, updateUserMessage } from "./prompts";

export const LIVE_HOURS = 12;

type StoryRef = { id: number; status: string; headline: string; body: string; sources: { name: string; url: string }[] };
type Item = { id: string; url: string; title: string; summary: string | null; sources: Pick<Source, "name" | "trust"> };

export type StoryUpdate = { id: number; story_id: number; text: string; card: string; status: string; created_at: string; sources: { name: string; url: string }[] };
export type PublishedUpdate = { at: string; text: string; card: string; sources: { name: string; url: string }[] };

/** Returns true when the report was used (folded in or turned into a pending update). */
export async function addUpdate(story: StoryRef, item: Item, terms: GlossaryTerm[]): Promise<boolean> {
  const source = { name: item.sources.name, url: item.url, trust: item.sources.trust };
  if (story.status !== "published") {
    // Not out yet: one story with every report, rewritten (it stays pending for Shwan).
    if (story.sources.some((s) => s.url === item.url)) return false;
    await db().from("stories").update({ sources: [...story.sources, source] }).eq("id", story.id);
    await regenerate(story.id);
    return true;
  }
  const out = await callTool({
    model: WRITE_MODEL,
    system: updateSystem(terms),
    user: updateUserMessage(story, { source: item.sources.name, title: item.title, summary: item.summary }),
    tool: UPDATE_TOOL,
    maxTokens: 1500,
    parse: (x) => UpdateSchema.parse(x),
  });
  const { data, error } = await db()
    .from("story_updates")
    .insert({ story_id: story.id, raw_item_ids: [item.id], text: out.text, card: out.card, sources: [source] })
    .select("id")
    .single();
  if (error) throw error;
  await import("./telegram").then((t) => t.alertUpdate(data.id as number)).catch((e) => console.error("telegram", e));
  return true;
}

export async function pendingUpdates(): Promise<(StoryUpdate & { headline: string })[]> {
  const { data } = await db()
    .from("story_updates")
    .select("id, story_id, text, card, status, created_at, sources, stories(headline)")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(30);
  return ((data ?? []) as unknown as (StoryUpdate & { stories: { headline: string } | null })[]).map((u) => ({ ...u, headline: u.stories?.headline ?? "" }));
}

/** Shwan approved an update: add it to the article, keep the story live, and post it as a story card. */
export async function publishUpdate(updateId: number): Promise<string> {
  const { data: claimed } = await db()
    .from("story_updates")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", updateId)
    .eq("status", "pending")
    .select("id, story_id, text, card, sources")
    .maybeSingle();
  if (!claimed) return "already handled";
  const u = claimed as StoryUpdate;
  const { data: story } = await db().from("stories").select("updates, platforms, sources").eq("id", u.story_id).single();
  const updates = [...((story?.updates as PublishedUpdate[] | null) ?? []), { at: new Date().toISOString(), text: u.text, card: u.card, sources: u.sources }];
  // The update's source is credited with the story's sources too.
  const known = new Set(((story?.sources as { url: string }[] | null) ?? []).map((s) => s.url));
  const sources = [...((story?.sources as object[] | null) ?? []), ...u.sources.filter((s) => !known.has(s.url))];
  await db()
    .from("stories")
    .update({ updates, sources, live_until: new Date(Date.now() + LIVE_HOURS * 3600_000).toISOString() })
    .eq("id", u.story_id);
  const result = await postUpdateCard(u.story_id, updates.length - 1, ((story?.platforms as string[] | null) ?? []));
  await db().from("story_updates").update({ social_result: result }).eq("id", updateId);
  return result;
}

export async function skipUpdate(updateId: number): Promise<void> {
  await db().from("story_updates").update({ status: "skipped" }).eq("id", updateId).eq("status", "pending");
}

/** The update as an Instagram/Facebook story card (the story's card with the update on it). */
async function postUpdateCard(storyId: number, index: number, platforms: string[]): Promise<string> {
  const wanted = platforms.filter((p) => p === "instagram" || p === "facebook");
  if (!wanted.length) return "site only";
  try {
    const [card] = await renderPages([{ url: `${siteUrl()}/card/${storyId}?f=story&u=${index}`, width: 1080, height: 1920, name: `update-${storyId}-${index}` }]);
    const t = await metaTargets();
    const out: string[] = [];
    for (const p of wanted) {
      try {
        out.push(`${p}: ok ${p === "instagram" ? await instagramStory(t, card) : await facebookStory(t, card)}`);
      } catch (e) {
        out.push(`${p}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    return out.join(" · ").slice(0, 600);
  } catch (e) {
    return (e instanceof Error ? e.message : String(e)).slice(0, 600);
  }
}
