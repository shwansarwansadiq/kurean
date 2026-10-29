import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { scoreNew, writeBest } from "@/lib/writer";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const scored = await scoreNew();
  const result = await writeBest();
  return NextResponse.json({ ok: true, scored, ...result });
}
