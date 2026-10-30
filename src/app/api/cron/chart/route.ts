import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { refreshChart } from "@/lib/chart";
import { isAuthorizedCron } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Daily: stores Circle Chart's newest weekly top 100 when it changes (?force=1 rewrites the current week). */
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const force = new URL(req.url).searchParams.get("force") === "1";
  const result = await refreshChart({ force });
  if (result.stored || result.links?.youtube || result.links?.spotify || result.links?.rechecked) revalidatePath("/", "layout");
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
