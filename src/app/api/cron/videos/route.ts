import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { dispatchVideos, videosWaiting } from "@/lib/video";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Every 15 minutes (Supabase pg_cron): if any video is waiting, start the GitHub video workflow now.
 * GitHub's own schedule runs irregularly (sometimes hours apart), so this is what keeps videos timely.
 */
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const waiting = await videosWaiting();
  if (!waiting) return NextResponse.json({ waiting: 0 });
  return NextResponse.json({ waiting, dispatch: await dispatchVideos() });
}
