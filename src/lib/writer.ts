import Anthropic from "@anthropic-ai/sdk";
import { db, type GlossaryTerm, type Source } from "./db";
import {
  CATEGORIES,
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

const SCORE_MODEL = process.env.KUREAN_SCORE_MODEL ?? "claude-haiku-5-5";
const WRITE_MODEL = process.env.KUREAN_WRITE_MODEL ?? "claude-sonnet-5-5";

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

async function callTool<T>(opts: {
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

async function glossary(): Promise<GlossaryTerm[]> {
  const { data, error } = await db().from("glossary").select("english, sorani, note").order("english");
  if (error) throw error;
  return (data ?? []) as GlossaryTerm[];
}

/** Writes the best scored items into stories, within the daily limit. */
export async function writeBest(): Promise<{ written: number; failed: number }> {
  const room = Math.min(PER_RUN, DAILY_LIMIT - (await storiesToday()));
  if (room <= 0) return { written: 0, failed: 0 };

  const { data, error } = await db()
    .from("raw_items")
    .select("id, url, title, summary, score_reason, sources(name, trust)")
    .eq("status", "scored")
    .order("score", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(room);
  if (error) throw error;
  const items = (data ?? []) as unknown as (ItemRow & { score_reason: string })[];
  if (!items.length) return { written: 0, failed: 0 };

  const terms = await glossary();
  let written = 0;
  let failed = 0;

  for (const item of items) {
    const { category, sensitive } = parseScoreReason(item.score_reason);
    try {
      const story = await callTool({
        model: WRITE_MODEL,
        system: writeSystem(terms),
        user: writeUserMessage({
          title: item.title,
          summary: item.summary,
          url: item.url,
          source: item.sources.name,
          category,
          sensitive,
        }),
        tool: STORY_TOOL,
        maxTokens: 8000,
        parse: (x) => StorySchema.parse(x),
      });

      const { error: insertError } = await db().from("stories").insert({
        raw_item_id: item.id,
        category,
        ...story,
        source_name: item.sources.name,
        source_url: item.url,
        needs_second_source: sensitive && item.sources.trust < 3,
      });
      if (insertError) throw insertError;
      await db().from("raw_items").update({ status: "written" }).eq("id", item.id);
      written++;
    } catch (e) {
      console.error("write failed", item.id, e);
      await db().from("raw_items").update({ status: "failed" }).eq("id", item.id);
      failed++;
    }
  }
  return { written, failed };
}
