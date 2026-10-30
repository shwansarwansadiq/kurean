import { NextResponse } from "next/server";
import { isVideoWorker, videoJobs } from "@/lib/video";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** For the GitHub video workflow only: the videos to make, each with a one-time upload address. */
export async function GET(req: Request) {
  if (!(await isVideoWorker(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ jobs: await videoJobs(3) });
}
