import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { metaTargets, metaUsage } from "@/lib/meta";
import { debugCard, renderCards } from "@/lib/render-card";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Checks the Meta connection without posting anything: which Page and Instagram account the token reaches.
 * With ?render=<published story id> it also renders that story's cards (stored, not posted).
 * With ?usage=1 it shows Meta's rate-limit usage and Instagram's publishing quota.
 */
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const out: Record<string, unknown> = {};
  try {
    const t = await metaTargets();
    out.meta = { page: t.pageName, pageId: t.pageId, instagram: t.igUsername, instagramId: t.igId };
    if (new URL(req.url).searchParams.get("usage")) out.usage = await metaUsage(t).catch((e) => String(e));
  } catch (e) {
    out.meta = { error: e instanceof Error ? e.message : String(e) };
  }
  const render = Number(new URL(req.url).searchParams.get("render"));
  if (render) {
    try {
      out.cards = await renderCards(render);
    } catch (e) {
      out.cards = { error: e instanceof Error ? e.message : String(e) };
    }
  }
  const dbg = Number(new URL(req.url).searchParams.get("debug"));
  if (dbg) out.debug = await debugCard(dbg).catch((e) => String(e));
  return NextResponse.json(out);
}
