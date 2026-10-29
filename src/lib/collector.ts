import Parser from "rss-parser";
import { db, type Source } from "./db";
import { isFresh, normalizeEntry, type FeedEntry } from "./feed";

const parser: Parser<object, FeedEntry> = new Parser({
  timeout: 15_000,
  headers: { "User-Agent": "KureanBot/1.0 (+https://kurean.news)" },
  customFields: { item: [["media:content", "mediaContent"]] },
});

export type CollectResult = { source: string; found: number; added: number; error?: string };

/** Reads every active source once and stores headlines it has not seen before. */
export async function collectAll(): Promise<CollectResult[]> {
  const { data: sources, error } = await db().from("sources").select("*").eq("active", true);
  if (error) throw error;
  const results: CollectResult[] = [];
  for (const source of (sources ?? []) as Source[]) {
    results.push(await collectSource(source));
  }
  return results;
}

async function collectSource(source: Source): Promise<CollectResult> {
  const now = new Date();
  try {
    const feed = await parser.parseURL(source.feed_url);
    const items = feed.items
      .map(normalizeEntry)
      .filter((i): i is NonNullable<typeof i> => i !== null && isFresh(i, now));

    let added = 0;
    if (items.length) {
      const { data, error } = await db()
        .from("raw_items")
        .upsert(
          items.map((i) => ({ ...i, source_id: source.id })),
          { onConflict: "url_hash", ignoreDuplicates: true },
        )
        .select("id");
      if (error) throw error;
      added = data?.length ?? 0;
    }

    await db()
      .from("sources")
      .update({
        last_checked_at: now.toISOString(),
        ...(added ? { last_item_at: now.toISOString() } : {}),
      })
      .eq("id", source.id);

    return { source: source.name, found: items.length, added };
  } catch (e) {
    await db().from("sources").update({ last_checked_at: now.toISOString() }).eq("id", source.id);
    return { source: source.name, found: 0, added: 0, error: e instanceof Error ? e.message : String(e) };
  }
}
