import { NextResponse } from "next/server";
import { publishedStories } from "@/lib/site";

export const dynamic = "force-dynamic";

/** For the Instagram bio: always the newest published story. */
export async function GET(req: Request) {
  const [latest] = await publishedStories({ limit: 1 });
  return NextResponse.redirect(new URL(latest ? `/news/${latest.id}` : "/", req.url), 307);
}
