import Anthropic from "@anthropic-ai/sdk";
import { db, type GlossaryTerm, type Source } from "./db";
import { attachPhoto, sourcePhotoCandidates, type PhotoCandidate } from "./photo";
import { needsSecondSource, primaryReport, relatedCandidates, totalSourceChars, type Report } from "./cluster";
import {
  CATEGORIES,
  SAME_STORY_SYSTEM,
  SAME_STORY_TOOL,
  SameStorySchema,
  sameStoryUserMessage,
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

/** Stories prepared per day (the plan: 5-8). */
export const DAILY_LIMIT = Number(process.env.KUREAN_DAILY_LIMIT ?? 8);
/** Lowest score worth writing. */
export const MIN_SCORE = Number(process.env.KUREAN_MIN_SCORE ?? 7);
/** Stories written per run, so one run stays well inside the time limit. */
const PER_RUN = 2;

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
        status: s.score >= MIN_SCORE ? "scored" : "skipped",
        score: s.score,
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

async function storiesToday(): Promise<number> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const { count, error } = await db()
    .from("stories")
    .select("id", { count: "exact", head: true })
    .gte("created_at", start.toISOString());
  if (error) throw error;
  return count ?? 0;
}

export async function glossary(): Promise<GlossaryTerm[]> {
  const { data, error } = await db().from("glossary").select("english, sorani, note").order("english");
  if (error) throw error;
  return (data ?? []) as GlossaryTerm[];
}

/** Writes the best scored items into stories, within the daily limit. */
export async function writeBest(): Promise<{ written: number; failed: number }> {
  const room = Math.min(PER_RUN, DAILY_LIMIT - (await storiesToday()));
  if (room <= 0) return { written: 0, failed: 0 };

  // Take extra candidates: some turn out to be duplicates or too thin and are skipped.
  const { data, error } = await db()
    .from("raw_items")
    .select("id, url, title, summary, image_url, score_reason, source_id, sources(name, trust)")
    .eq("status", "scored")
    .order("score", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(room * 4);
  if (error) throw error;
  const items = (data ?? []) as unknown as (ItemRow & { score_reason: string; source_id: string })[];
  if (!items.length) return { written: 0, failed: 0 };

  const terms = await glossary();
  const handled = new Set<string>();
  let written = 0;
  let failed = 0;

  for (const item of items) {
    if (written >= room) break;
    if (handled.has(item.id)) continue;
    handled.add(item.id);
    const { category, sensitive } = parseScoreReason(item.score_reason);
    try {
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
    } catch (e) {
      console.error("write failed", item.id, e);
      await db().from("raw_items").update({ status: "failed" }).eq("id", item.id);
      failed++;
    }
  }
  return { written, failed };
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
