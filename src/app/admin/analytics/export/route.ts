import { NextResponse } from "next/server";
import { analytics, headlines } from "@/lib/analytics";
import { CATEGORY_KEYS, type CategoryKey } from "@/lib/site";

/** Raw numbers (no compact formatting) for the top articles and the daily series. /admin is protected by middleware. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const from = new Date(q.get("from") ?? ""), to = new Date(q.get("to") ?? "");
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return NextResponse.json({ error: "bad range" }, { status: 400 });
  const cat = CATEGORY_KEYS.includes(q.get("cat") as CategoryKey) ? q.get("cat") : null;
  const a = await analytics({ key: "export", from, to, days: 0, label: "" }, cat);
  const heads = await headlines(a.articles.map((x) => x.story_id));
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    `# Kurean analytics ${from.toISOString()} to ${to.toISOString()}${cat ? ` category ${cat}` : ""}; generated ${a.generated_at}`,
    "story_id,headline,category,pageviews,visitors,avg_engaged_seconds,avg_scroll_percent",
    ...a.articles.map((r) => [r.story_id, esc(heads.get(r.story_id)), r.category, r.pageviews, r.visitors, r.avg_engaged_ms === null ? "" : (r.avg_engaged_ms / 1000).toFixed(1), r.avg_scroll === null ? "" : r.avg_scroll.toFixed(1)].join(",")),
    "",
    "day,pageviews,visitors",
    ...a.daily.map((d) => [d.day, d.pageviews, d.visitors].join(",")),
  ];
  return new NextResponse("﻿" + lines.join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="kurean-analytics-${from.toISOString().slice(0, 10)}.csv"` },
  });
}
