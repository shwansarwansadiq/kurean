import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isVideoWorker, videoDone } from "@/lib/video";

export const runtime = "nodejs";

/** For the GitHub video workflow only: a video was uploaded for this version of the story. */
export async function POST(req: Request) {
  if (!(await isVideoWorker(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { id?: number; hash?: string; path?: string; target?: string } | null;
  if (!body?.id || !body.hash || !body.path) return NextResponse.json({ error: "id, hash and path are needed" }, { status: 400 });
  const ok = await videoDone(body.id, body.hash, body.path, body.target === "scenery" ? "scenery" : "story");
  if (ok) {
    revalidatePath("/admin/tiktok");
    revalidatePath("/admin/scenery");
  }
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}
