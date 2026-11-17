import { NextResponse } from "next/server";
import { collectAll } from "@/lib/collector";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { activeEvents, inFastWindow, openLiveStories } from "@/lib/events";
import { backfillPhotos, scoreNew, writeBest } from "@/lib/writer";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * The news chain (Shwan, 17 Nov): collect → score → write in one run. Supabase calls it every 5 minutes; it works
 * every 15 minutes, or on every call while an awards night or year-end show is on (see lib/events.ts).
 * ?force=1 runs it at once (from the SQL editor, by hand).
 */
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const now = new Date();
  const events = await activeEvents(now).catch(() => []);
  const fast = inFastWindow(events, now);
  const force = new URL(req.url).searchParams.has("force");
  if (!force && !fast && now.getUTCMinutes() % 15 >= 5) return NextResponse.json({ ok: true, skipped: "not this run" });

  const live = await openLiveStories(events, now).catch((e) => (console.error("live stories", e), 0));
  const collected = await collectAll().catch((e) => (console.error("collect", e), []));
  const added = collected.reduce((n, r) => n + r.added, 0);
  const scored = await scoreNew().catch((e) => (console.error("score", e), 0));
  const result = await writeBest(now);
  const photos = await backfillPhotos(2).catch(() => 0);
  return NextResponse.json({ ok: true, fast, live, added, scored, ...result, photos, feeds: collected.filter((r) => r.error).map((r) => `${r.source}: ${r.error}`) });
}
