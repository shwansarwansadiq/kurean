import { NextResponse } from "next/server";
import { collectAll } from "@/lib/collector";
import { isAuthorizedCron } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const results = await collectAll();
  return NextResponse.json({ ok: true, results });
}
