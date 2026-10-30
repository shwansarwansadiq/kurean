import { NextResponse } from "next/server";

/** Short links used on stories and cards: kurean.news/n/124 → the article. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const target = Number.isSafeInteger(id) && id > 0 ? `/news/${id}` : "/";
  return NextResponse.redirect(new URL(target, req.url), 308);
}
