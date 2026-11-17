/**
 * The awards calendar (Shwan, 17 Nov): around each awards night or year-end show the news chain runs every
 * 5 minutes instead of 15, and for awards a LIVE story is written 2 hours before the start (pending, like every
 * story: Shwan approves it, ideally before the show). Winners reported during the night are added to it as
 * updates by the repeat check (it sees live stories first). Events are kept in /admin/events.
 */
import { db } from "./db";
import { glossary, callTool, WRITE_MODEL } from "./writer";
import { liveSystem, liveUserMessage, STORY_TOOL, StorySchema } from "./prompts";
import { hawlerTime } from "./schedule";

export type KEvent = {
  id: number;
  name: string;
  name_ckb: string;
  kind: "awards" | "festival";
  starts_at: string;
  ends_at: string;
  place: string | null;
  source_name: string | null;
  source_url: string | null;
  story_id: number | null;
};

/** Fast mode: from 1 hour before an event until 3 hours after it (results keep coming after the end). */
const BEFORE_MS = 3600_000;
const AFTER_MS = 3 * 3600_000;
/** The live story is written this long before the start, so Shwan can approve it in time. */
const LIVE_LEAD_MS = 2 * 3600_000;

export async function activeEvents(now = new Date()): Promise<KEvent[]> {
  const { data } = await db()
    .from("events")
    .select("*")
    .lte("starts_at", new Date(now.getTime() + LIVE_LEAD_MS).toISOString())
    .gte("ends_at", new Date(now.getTime() - AFTER_MS).toISOString());
  return (data ?? []) as KEvent[];
}

/** Is any event in its fast window right now? */
export function inFastWindow(events: KEvent[], now = new Date()): boolean {
  return events.some((e) => now.getTime() >= new Date(e.starts_at).getTime() - BEFORE_MS && now.getTime() <= new Date(e.ends_at).getTime() + AFTER_MS);
}

const kst = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + 9 * 3600_000);
  return `${d.toISOString().slice(0, 10)} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
};

/** Writes the live story for awards nights starting within 2 hours that don't have one yet. */
export async function openLiveStories(events: KEvent[], now = new Date()): Promise<number> {
  let made = 0;
  for (const e of events) {
    if (e.kind !== "awards" || e.story_id) continue;
    if (new Date(e.starts_at).getTime() - now.getTime() > LIVE_LEAD_MS) continue;
    // Claim it with a placeholder, so two runs never write two live stories.
    const { data: claim } = await db().from("events").update({ story_id: -1 }).eq("id", e.id).is("story_id", null).select("id");
    if (!claim?.length) continue;
    const category = /film|drama|apan|baeksang/i.test(e.name) ? ("kdrama_film" as const) : ("kpop" as const);
    try {
      const story = await callTool({
        model: WRITE_MODEL,
        system: liveSystem(await glossary()),
        user: liveUserMessage({ category, name: e.name, place: e.place, startsKst: kst(e.starts_at), startsHawler: hawlerTime(e.starts_at), source: e.source_name ?? "Kurean" }),
        tool: STORY_TOOL,
        maxTokens: 6000,
        parse: (x) => StorySchema.parse(x),
      });
      const { data: inserted, error } = await db()
        .from("stories")
        .insert({
          category,
          ...story,
          event_id: e.id,
          urgent: true,
          live_until: e.ends_at ? new Date(new Date(e.ends_at).getTime() + AFTER_MS).toISOString() : null,
          source_name: e.source_name ?? "Kurean",
          source_url: e.source_url ?? "https://kurean.news",
          sources: [{ name: e.source_name ?? "Kurean", url: e.source_url ?? "https://kurean.news", trust: 2 }],
          photo_checked_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) throw error;
      await db().from("events").update({ story_id: inserted.id }).eq("id", e.id);
      await import("./telegram").then((t) => t.alertStory(inserted.id as number)).catch(() => null);
      made++;
    } catch (err) {
      console.error("live story failed", e.id, err);
      await db().from("events").update({ story_id: null }).eq("id", e.id).eq("story_id", -1);
    }
  }
  return made;
}
