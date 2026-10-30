import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { publishDue } from "@/lib/publish";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Every 5 minutes (Supabase pg_cron): publishes the stories Shwan scheduled whose time has come. */
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const published = await publishDue();
  if (published.length) {
    revalidatePath("/", "layout");
    for (const id of published) revalidatePath(`/news/${id}`);
  }
  return NextResponse.json({ ok: true, published });
}
