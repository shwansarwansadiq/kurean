import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { refreshScenery } from "@/lib/scenery";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Weekly (Supabase pg_cron): new Korea scenery candidates from Pexels for Shwan to approve. */
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await refreshScenery());
}
