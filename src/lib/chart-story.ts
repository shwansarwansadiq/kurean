/**
 * The weekly chart news: when a new Circle Chart week is stored, Kurean writes a Sorani story about the top 10
 * and prepares top-10 feed and story cards. It waits in /admin as a pending story like any other: nothing is
 * published without Shwan's approval. Publishing posts the article, the feed post and the story.
 */
import { db } from "./db";
import { latinName, type ChartEntry, type ChartWeek, periodDates } from "./chart";
import { STORY_TOOL, StorySchema, writeSystem } from "./prompts";
import { callTool, glossary, WRITE_MODEL } from "./writer";

export const CHART_PAGE = "https://circlechart.kr/page_chart/onoff.circle?nationGbn=T&serviceGbn=ALL";

/** What the cards and the article show for each of the top 10, frozen at the time of writing. */
export type ChartTopItem = { rank: number; title: string; artist: string; artist_ckb: string | null; move: ChartEntry["move"]; change: number };

export function topTen(week: ChartWeek): ChartTopItem[] {
  return week.entries.slice(0, 10).map((e) => ({
    rank: e.rank,
    title: latinName(e.title_latin, e.title),
    artist: latinName(e.artist_latin, e.artist),
    artist_ckb: e.artist_ckb ?? null,
    move: e.move,
    change: e.change,
  }));
}

const moveText = (e: { move: string; change: number; prev?: number | null }) =>
  e.move === "new" ? "NEW entry this week" : e.move === "same" ? "same place as last week" : `${e.move === "up" ? "up" : "down"} ${e.change} (was #${e.prev})`;

/** The facts the writer may use, and nothing else. */
export function chartFacts(week: ChartWeek): string {
  const p = periodDates(week.period);
  const top = week.entries.slice(0, 10);
  const lines = top.map(
    (e) => `#${e.rank}. "${latinName(e.title_latin, e.title)}" (Korean title: ${e.title}) by ${latinName(e.artist_latin, e.artist)}${e.artist_ckb ? ` [Sorani spelling: ${e.artist_ckb}]` : ""}: ${moveText(e)}`,
  );
  const all = week.entries;
  const newcomers = all.filter((e) => e.move === "new");
  const climber = all.filter((e) => e.move === "up").sort((a, b) => b.change - a.change)[0];
  return `Chart: Circle Chart weekly Digital Chart (Korea Music Content Association), the official national chart of South Korea.
It ranks songs by combined streaming, download and BGM use in Korea.
Week ${week.week} of ${week.year}${p ? `, ${p.from.toISOString().slice(0, 10)} to ${p.to.toISOString().slice(0, 10)}` : ""}.

Top 10:
${lines.join("\n")}

Across the whole top 100: ${newcomers.length} new entries${newcomers.length ? ` (highest new entry: #${newcomers[0].rank} "${latinName(newcomers[0].title_latin, newcomers[0].title)}" by ${latinName(newcomers[0].artist_latin, newcomers[0].artist)})` : ""}.
${climber ? `Biggest climb in the top 100: "${latinName(climber.title_latin, climber.title)}" by ${latinName(climber.artist_latin, climber.artist)}, up ${climber.change} to #${climber.rank}.` : ""}`;
}

const CHART_RULES = `

This story is the WEEKLY CHART ROUNDUP, not a news report from a site:
- Headline: name the number one song and artist and say it is this week's Korean chart (ڕیزبەندیی هەفتانەی کۆریا).
  Call it ڕیزبەندی, never چارت.
- Body (120-220 words): who is number one and whether it held or took the spot, the notable climbs, falls and new
  entries in the top 10, then one line on the rest of the top 100 if the facts give one. End by inviting readers to
  play the whole top 100 on Kurean (لە کوریەن هەموو ١٠٠ گۆرانییەکە ببینە و بیکەرەوە).
- Use only the facts given. No streaming numbers, no chart history, no reasons for a song's success: none are given.
- Song titles: use the Latin title given, in «» quotes. Never translate song titles.
- key_points: three short lines about the top 10.
- Captions end with "سەرچاوە: Circle Chart".`;

async function write(week: ChartWeek) {
  return callTool({
    model: WRITE_MODEL,
    system: writeSystem(await glossary()) + CHART_RULES,
    user: chartFacts(week),
    tool: STORY_TOOL,
    maxTokens: 6000,
    parse: (x) => StorySchema.parse(x),
  });
}

/** Writes the week's chart story once, as a pending story. Returns its id, or null if it already exists. */
export async function prepareChartStory(week: ChartWeek): Promise<number | null> {
  const { data: have } = await db().from("stories").select("id").eq("chart_week", week.id).maybeSingle();
  if (have) return null;
  const story = await write(week);
  const { data, error } = await db()
    .from("stories")
    .insert({
      category: "kpop",
      ...story,
      kind: "chart",
      chart_week: week.id,
      chart_top: topTen(week),
      source_name: "Circle Chart",
      source_url: CHART_PAGE,
      sources: [{ name: "Circle Chart", url: CHART_PAGE, trust: 3 }],
      needs_second_source: false,
      photo_checked_at: new Date().toISOString(), // no photo: the chart cards are the design
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as number;
}

/** The dashboard's Regenerate for a chart story: same week, new wording. */
export async function rewriteChartStory(storyId: number, weekId: string, load: (id: string) => Promise<ChartWeek | null>): Promise<void> {
  const week = await load(weekId);
  if (!week) throw new Error("that chart week is no longer stored");
  const story = await write(week);
  const { error } = await db()
    .from("stories")
    .update({ ...story, chart_top: topTen(week), edited_at: null, status: "pending" })
    .eq("id", storyId);
  if (error) throw error;
}
