import Anthropic from "@anthropic-ai/sdk";
import { db, type GlossaryTerm, type Source } from "./db";
import { HAWLER_OFFSET_MS, hawlerMidnight } from "./schedule";
import { attachPhoto, sourcePhotoCandidates, type PhotoCandidate } from "./photo";
import { needsSecondSource, primaryReport, relatedCandidates, significantTokens, totalSourceChars, type Report } from "./cluster";
import {
  CATEGORIES,
  SAME_STORY_SYSTEM,
  SAME_STORY_TOOL,
  SameStorySchema,
  sameStoryUserMessage,
  REPEAT_SYSTEM,
  REPEAT_TOOL,
  RepeatSchema,
  repeatUserMessage,
  SCORE_SYSTEM,
  SCORE_TOOL,
  ScoreSchema,
  STORY_TOOL,
  StorySchema,
  scoreUserMessage,
  writeSystem,
  writeUserMessage,
} from "./prompts";

type Category = (typeof CATEGORIES)[number];

/** Reads back what scoreNew stored: "<category> · sensitive · <reason>". */
export function parseScoreReason(reason: string): { category: Category; sensitive: boolean } {
  const parts = reason.split(" · ");
  const category = (CATEGORIES as readonly string[]).includes(parts[0]) ? (parts[0] as Category) : "korea_news";
  return { category, sensitive: parts[1] === "sensitive" };
}

export const SCORE_MODEL = process.env.KUREAN_SCORE_MODEL ?? "claude-haiku-5-5";
export const WRITE_MODEL = process.env.KUREAN_WRITE_MODEL ?? "claude-sonnet-5-5";

/** Ordinary stories prepared per day, counted from midnight in Hawler (Shwan raised it from 8 to 12 on 30 Oct). */
export const DAILY_LIMIT = Number(process.env.KUREAN_DAILY_LIMIT ?? 12);
/** Urgent stories (results, official announcements) have their own reserve on top (Shwan, 17 Nov). */
export const URGENT_LIMIT = Number(process.env.KUREAN_URGENT_LIMIT ?? 10);
/** Lowest score worth writing. */
export const MIN_SCORE = Number(process.env.KUREAN_MIN_SCORE ?? 7);
/** Stories written per run, so one run stays well inside the time limit (the chain runs every 15 minutes). */
const PER_RUN = 2;
const URGENT_PER_RUN = 2;

/**
 * The daily limit spread over the day (Shwan, 17 Nov): by a given Hawler hour, only that share of the day's
 * ordinary stories may be written, so the evening (when Korean awards and shows happen) never finds it used up.
 * 07:00 → 15 %, rising evenly to 100 % at 22:00.
 */
export function allowedSoFar(now = new Date(), limit = DAILY_LIMIT): number {
  const h = (now.getTime() + HAWLER_OFFSET_MS) % 86_400_000 / 3600_000;
  const share = Math.min(1, Math.max(0.15, (h - 7) / 15));
  return Math.max(1, Math.ceil(limit * share));
}

let anthropic: Anthropic | null = null;
function ai(): Anthropic {
  return (anthropic ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }));
}

export async function callTool<T>(opts: {
  model: string;
  system: string;
  user: string;
  tool: { name: string; description: string; input_schema: Anthropic.Tool.InputSchema };
  maxTokens: number;
  parse: (input: unknown) => T;
}): Promise<T> {
  const request = (toolChoice: Anthropic.MessageCreateParams["tool_choice"]) =>
    ai().messages.create({
      model: opts.model,
      max_tokens: opts.maxTokens,
      system: `${opts.system}\n\nAlways answer by calling the ${opts.tool.name} tool exactly once.`,
      tools: [opts.tool],
      tool_choice: toolChoice,
      messages: [{ role: "user", content: opts.user }],
    });

  let res: Anthropic.Message;
  try {
    res = await request({ type: "tool", name: opts.tool.name });
  } catch (e) {
    // Some models refuse a forced tool choice; let them choose, the prompt still requires the tool.
    if (!isForcedToolUnsupported(e)) throw e;
    res = await request({ type: "auto" });
  }
  const block = res.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new Error("model returned no tool call");
  return opts.parse(block.input);
}

export function isForcedToolUnsupported(e: unknown): boolean {
  const message = e instanceof Error ? e.message : String(e);
  return message.includes("tool_choice") && message.includes("not supported");
}

type ItemRow = {
  id: string;
  url: string;
  title: string;
  summary: string | null;
  image_url?: string | null;
  sources: Pick<Source, "name" | "trust">;
};

/** Scores up to 40 new headlines in one call. */
export async function scoreNew(): Promise<number> {
  const { data, error } = await db()
    .from("raw_items")
    .select("id, url, title, summary, sources(name, trust)")
    .eq("status", "new")
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) throw error;
  // Headline-only items are scored too: another source may carry the details of the same news.
  const items = (data ?? []) as unknown as ItemRow[];
  if (!items.length) return 0;

  const out = await callTool({
    model: SCORE_MODEL,
    system: SCORE_SYSTEM,
    user: scoreUserMessage(items.map((i) => ({ title: i.title, summary: i.summary, source: i.sources.name }))),
    tool: SCORE_TOOL,
    maxTokens: 4000,
    parse: (x) => ScoreSchema.parse(x),
  });

  for (const s of out.items) {
    const item = items[s.index];
    if (!item) continue;
    await db()
      .from("raw_items")
      .update({
        // An urgent item is worth writing a notch lower: results matter even for less famous names.
        status: s.score >= MIN_SCORE || (s.urgent && s.score >= MIN_SCORE - 1) ? "scored" : "skipped",
        score: s.score,
        urgent: s.urgent,
        score_reason: `${s.category}${s.sensitive ? " · sensitive" : ""} · ${s.reason}`,
      })
      .eq("id", item.id);
  }
  return out.items.length;
}

/** Minimum source text (beyond headlines), across all reports, needed to write an article without padding. */
export const MIN_SOURCE_CHARS = 120;

export function hasEnoughSourceText(summary: string | null): boolean {
  return (summary?.trim().length ?? 0) >= MIN_SOURCE_CHARS;
}

type PoolRow = ItemRow & { source_id: string; status: string };

/** Reports of the same news from other sources in the last 48 hours, confirmed by the model. */
async function findSameStory(item: ItemRow & { source_id: string }): Promise<PoolRow[]> {
  const since = new Date(Date.now() - 48 * 3600_000).toISOString();
  const { data, error } = await db()
    .from("raw_items")
    .select("id, url, title, summary, image_url, status, source_id, sources(name, trust)")
    .neq("source_id", item.source_id)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(400);
  if (error) throw error;
  const candidates = relatedCandidates(item.title, (data ?? []) as unknown as PoolRow[]).map((c) => c.item);
  if (!candidates.length) return [];

  const out = await callTool({
    model: SCORE_MODEL,
    system: SAME_STORY_SYSTEM,
    user: sameStoryUserMessage(
      item,
      candidates.map((c) => ({ title: c.title, summary: c.summary, source: c.sources.name })),
    ),
    tool: SAME_STORY_TOOL,
    maxTokens: 1000,
    parse: (x) => SameStorySchema.parse(x),
  });
  return [...new Set(out.same)].map((i) => candidates[i]).filter((c): c is PoolRow => Boolean(c));
}

const toReport = (r: ItemRow): Report => ({
  id: r.id,
  source: r.sources.name,
  trust: r.sources.trust,
  url: r.url,
  title: r.title,
  summary: r.summary,
});

/** Stories written since midnight in Hawler: ordinary ones and urgent ones (chart and live event stories don't count). */
async function storiesToday(urgent: boolean): Promise<number> {
  const start = hawlerMidnight(new Date());
  const { count, error } = await db()
    .from("stories")
    .select("id", { count: "exact", head: true })
    .gte("created_at", start.toISOString())
    .eq("kind", "news")
    .is("event_id", null)
    .eq("urgent", urgent);
  if (error) throw error;
  return count ?? 0;
}

type RecentStory = { id: number; status: string; headline: string; body: string; live_until: string | null; sources: { name: string; url: string }[] };

/**
 * The 7-day repeat check (Shwan, 17 Nov): is this report a story we already have, news to add to one, or new?
 * A cheap word match picks up to 8 recent stories (titles of the reports they were written from, plus live
 * event stories); the model decides. Names spelled differently are matched by the model.
 */
async function repeatCheck(item: ItemRow): Promise<{ decision: "new" | "update" | "duplicate"; story?: RecentStory }> {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data } = await db()
    .from("stories")
    .select("id, status, headline, body, live_until, sources")
    .in("status", ["pending", "approved", "published"])
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(120);
  const stories = (data ?? []) as RecentStory[];
  if (!stories.length) return { decision: "new" };
  const urls = stories.flatMap((st) => st.sources.map((x) => x.url));
  const { data: raws } = await db().from("raw_items").select("url, title").in("url", urls.slice(0, 400));
  const titleOf = new Map((raws ?? []).map((r: { url: string; title: string }) => [r.url, r.title]));
  const target = significantTokens(item.title);
  const now = Date.now();
  const scored = stories
    .map((st) => {
      const titles = st.sources.map((x) => titleOf.get(x.url)).filter(Boolean) as string[];
      let shared = 0;
      for (const t of significantTokens(`${titles.join(" ")} ${st.headline}`)) if (target.has(t)) shared++;
      const live = !!st.live_until && new Date(st.live_until).getTime() > now;
      return { st, titles, shared, live };
    })
    .filter((x) => x.shared >= 1 || x.live)
    .sort((a, b) => Number(b.live) - Number(a.live) || b.shared - a.shared)
    .slice(0, 8);
  if (!scored.length) return { decision: "new" };
  const out = await callTool({
    model: SCORE_MODEL,
    system: REPEAT_SYSTEM,
    user: repeatUserMessage(item, scored.map((x) => ({ headline: x.st.headline, reports: x.titles, live: x.live }))),
    tool: REPEAT_TOOL,
    maxTokens: 400,
    parse: (x) => RepeatSchema.parse(x),
  });
  const story = out.story !== null ? scored[out.story]?.st : undefined;
  if (out.decision !== "new" && !story) return { decision: "new" };
  return { decision: out.decision, story };
}

export async function glossary(): Promise<GlossaryTerm[]> {
  const { data, error } = await db().from("glossary").select("english, sorani, note").order("english");
  if (error) throw error;
  return (data ?? []) as GlossaryTerm[];
}

/**
 * Writes the best scored items into stories: urgent ones first (their own daily reserve), then ordinary ones
 * within the share of the day's limit allowed so far. Each report is first checked against the last 7 days:
 * a duplicate is skipped, an update to a published story waits for approval as an update, an update to a story
 * not yet published is folded into it.
 */
export async function writeBest(now = new Date()): Promise<{ written: number; updates: number; failed: number }> {
  // A run that died mid-write leaves its claim behind: give such reports back after 15 minutes.
  await db()
    .from("raw_items")
    .update({ status: "scored" })
    .eq("status", "writing")
    .lt("claimed_at", new Date(now.getTime() - 15 * 60_000).toISOString());
  const urgentRoom = Math.min(URGENT_PER_RUN, URGENT_LIMIT - (await storiesToday(true)));
  const normalRoom = Math.min(PER_RUN, allowedSoFar(now) - (await storiesToday(false)));
  if (urgentRoom <= 0 && normalRoom <= 0) return { written: 0, updates: 0, failed: 0 };

  // Take extra candidates: some turn out to be duplicates or too thin and are skipped.
  const { data, error } = await db()
    .from("raw_items")
    .select("id, url, title, summary, image_url, score_reason, urgent, source_id, sources(name, trust)")
    .eq("status", "scored")
    .order("urgent", { ascending: false })
    .order("score", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(16);
  if (error) throw error;
  const items = (data ?? []) as unknown as (ItemRow & { score_reason: string; source_id: string; urgent: boolean })[];
  if (!items.length) return { written: 0, updates: 0, failed: 0 };

  const terms = await glossary();
  const handled = new Set<string>();
  let urgentLeft = Math.max(0, urgentRoom);
  let normalLeft = Math.max(0, normalRoom);
  let written = 0;
  let updates = 0;
  let failed = 0;

  for (const item of items) {
    if (urgentLeft + normalLeft <= 0) break;
    if (handled.has(item.id)) continue;
    // An urgent item with no urgent room left waits for ordinary room; an ordinary one never uses the urgent reserve.
    const asUrgent = item.urgent && urgentLeft > 0;
    if (!asUrgent && normalLeft <= 0) continue;
    handled.add(item.id);
    // Claim it, so two overlapping runs never write the same report.
    const { data: claimed } = await db().from("raw_items").update({ status: "writing", claimed_at: new Date().toISOString() }).eq("id", item.id).eq("status", "scored").select("id");
    if (!claimed?.length) continue;
    const { category, sensitive } = parseScoreReason(item.score_reason);
    try {
      const repeat = await repeatCheck(item);
      if (repeat.decision === "duplicate") {
        await db().from("raw_items").update({ status: "skipped", score_reason: `${item.score_reason} · already covered (#${repeat.story?.id})` }).eq("id", item.id);
        continue;
      }
      if (repeat.decision === "update" && repeat.story) {
        const { addUpdate } = await import("./updates");
        const done = await addUpdate(repeat.story, item, terms);
        await db().from("raw_items").update({ status: done ? "written" : "skipped", score_reason: `${item.score_reason} · update of #${repeat.story.id}` }).eq("id", item.id);
        if (done) updates++;
        continue;
      }

      const same = await findSameStory(item);
      // Another source's report of this news is already in a story: don't write it twice.
      if (same.some((s) => s.status === "written")) {
        await db().from("raw_items").update({ status: "skipped", score_reason: `${item.score_reason} · already covered` }).eq("id", item.id);
        continue;
      }

      const reports = [toReport(item), ...same.map(toReport)];
      if (totalSourceChars(reports) < MIN_SOURCE_CHARS) {
        await db().from("raw_items").update({ status: "skipped", score_reason: `${item.score_reason} · no source text` }).eq("id", item.id);
        continue;
      }
      const primary = primaryReport(reports);
      // Most trusted, most detailed report first, so the writer leans on it.
      const ordered = [primary, ...reports.filter((r) => r !== primary)];

      const story = await callTool({
        model: WRITE_MODEL,
        system: writeSystem(terms),
        user: writeUserMessage({ category, sensitive, reports: ordered }),
        tool: STORY_TOOL,
        maxTokens: 8000,
        parse: (x) => StorySchema.parse(x),
      });

      const { data: inserted, error: insertError } = await db().from("stories").insert({
        raw_item_id: item.id,
        category,
        ...story,
        urgent: asUrgent,
        source_name: primary.source,
        source_url: primary.url,
        sources: ordered.map((r) => ({ name: r.source, url: r.url, trust: r.trust })),
        needs_second_source: needsSecondSource(sensitive, reports),
      }).select("id").single();
      if (insertError) throw insertError;

      // The photo as the source posted it, most trusted report first.
      const rows = [item, ...same];
      const byId = new Map(rows.map((r) => [r.id, r]));
      await attachPhoto(inserted.id, story.headline, ordered.map((r) => photoCandidate(byId.get(r.id)!))).catch((e) =>
        console.error("photo failed", inserted.id, e),
      );

      const ids = reports.map((r) => r.id);
      ids.forEach((id) => handled.add(id));
      await db().from("raw_items").update({ status: "written" }).in("id", ids);
      written++;
      if (asUrgent) urgentLeft--;
      else normalLeft--;
      // Tell Shwan on his phone, with one-tap buttons.
      await import("./telegram").then((t) => t.alertStory(inserted.id)).catch((e) => console.error("telegram", e));
    } catch (e) {
      console.error("write failed", item.id, e);
      await db().from("raw_items").update({ status: "failed" }).eq("id", item.id);
      failed++;
    }
  }
  if (written) await import("./video").then((v) => v.kickVideos()).catch(() => false);
  return { written, updates, failed };
}

const photoCandidate = (r: ItemRow): PhotoCandidate => ({ image_url: r.image_url ?? null, url: r.url, source: r.sources.name });

type StoryRow = {
  id: number;
  category: Category;
  raw_item_id: string | null;
  sources: { name: string; url: string; trust: number }[];
};

/** Rewrites a pending story from the same source reports (the dashboard's Regenerate). */
export async function regenerate(storyId: number): Promise<void> {
  const { data: kind } = await db().from("stories").select("kind, chart_week").eq("id", storyId).single<{ kind: string; chart_week: string | null }>();
  if (kind?.kind === "chart" && kind.chart_week) {
    const [{ rewriteChartStory }, { chartWeek }] = await Promise.all([import("./chart-story"), import("./chart")]);
    return rewriteChartStory(storyId, kind.chart_week, chartWeek);
  }
  const { data: story, error } = await db()
    .from("stories")
    .select("id, category, raw_item_id, sources")
    .eq("id", storyId)
    .single<StoryRow>();
  if (error) throw error;
  const urls = story.sources.map((s) => s.url);
  const { data, error: rawError } = await db()
    .from("raw_items")
    .select("id, url, title, summary, image_url, score_reason, sources(name, trust)")
    .in("url", urls);
  if (rawError) throw rawError;
  const rows = (data ?? []) as unknown as (ItemRow & { score_reason: string | null })[];
  if (!rows.length) throw new Error("the source reports for this story are gone");
  const main = rows.find((r) => r.id === story.raw_item_id) ?? rows[0];
  const sensitive = main.score_reason ? parseScoreReason(main.score_reason).sensitive : false;
  const reports = rows.map(toReport);
  const primary = primaryReport(reports);
  const ordered = [primary, ...reports.filter((r) => r !== primary)];

  const written = await callTool({
    model: WRITE_MODEL,
    system: writeSystem(await glossary()),
    user: writeUserMessage({ category: story.category, sensitive, reports: ordered }),
    tool: STORY_TOOL,
    maxTokens: 8000,
    parse: (x) => StorySchema.parse(x),
  });
  const { error: updateError } = await db()
    .from("stories")
    .update({ ...written, edited_at: null, status: "pending" })
    .eq("id", storyId);
  if (updateError) throw updateError;

  const byId = new Map(rows.map((r) => [r.id, r]));
  await attachPhoto(storyId, written.headline, ordered.map((r) => photoCandidate(byId.get(r.id)!))).catch(() => null);
}

/**
 * Photo pass for stories not checked yet (and ones asked to be checked again from /admin):
 * looks for a free photo of the same subject first, then the source's photo.
 */
export async function backfillPhotos(limit = 4): Promise<number> {
  const { data, error } = await db()
    .from("stories")
    .select("id, headline, sources")
    .is("photo_checked_at", null)
    .in("status", ["pending", "published"])
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw error;
  let done = 0;
  for (const s of (data ?? []) as { id: number; headline: string; sources: { name: string; url: string }[] }[]) {
    const urls = s.sources.map((x) => x.url);
    const { data: raws } = await db().from("raw_items").select("url, image_url").in("url", urls);
    const img = new Map((raws ?? []).map((r: { url: string; image_url: string | null }) => [r.url, r.image_url]));
    const result = await attachPhoto(
      s.id,
      s.headline,
      s.sources.map((x) => ({ image_url: img.get(x.url) ?? null, url: x.url, source: x.name })),
    ).catch(() => null);
    if (result) done++;
  }
  return done;
}

/** /admin "find another photo": free photo of the same subject first, then the source's photo. */
export async function refreshPhoto(storyId: number): Promise<string | null> {
  const { data, error } = await db().from("stories").select("id, headline, sources").eq("id", storyId).single();
  if (error) throw error;
  const s = data as { id: number; headline: string; sources: { name: string; url: string }[] };
  const { data: raws } = await db().from("raw_items").select("url, image_url").in("url", s.sources.map((x) => x.url));
  const img = new Map((raws ?? []).map((r: { url: string; image_url: string | null }) => [r.url, r.image_url]));
  return attachPhoto(s.id, s.headline, s.sources.map((x) => ({ image_url: img.get(x.url) ?? null, url: x.url, source: x.name })));
}

/** /admin "find more photos": refreshes the story's photo options from its source articles without changing the main photo. */
export async function collectPhotoOptions(storyId: number): Promise<number> {
  const { data, error } = await db().from("stories").select("sources").eq("id", storyId).single();
  if (error) throw error;
  const sources = (data as { sources: { name: string; url: string }[] }).sources;
  const { data: raws } = await db().from("raw_items").select("url, image_url").in("url", sources.map((x) => x.url));
  const img = new Map((raws ?? []).map((r: { url: string; image_url: string | null }) => [r.url, r.image_url]));
  const found = await sourcePhotoCandidates(sources.map((x) => ({ image_url: img.get(x.url) ?? null, url: x.url, source: x.name })));
  const options = [...found.main, ...found.extra].map((c) => ({ url: c.image, page: c.page, credit: c.credit }));
  await db().from("stories").update({ photo_options: options }).eq("id", storyId);
  return options.length;
}
