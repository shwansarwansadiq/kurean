import { NextResponse } from "next/server";
import { removeUnusedVideos } from "@/lib/cleanup";
import { isAuthorizedCron } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Removes video files nothing points to any more (also runs daily inside the chart job). */
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, ...(await removeUnusedVideos()) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
