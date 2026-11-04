import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isAdminToken } from "@/lib/admin-auth";
import { authorizeUrl, tiktokConfigured } from "@/lib/tiktok";

export const runtime = "nodejs";

/** Shwan only: start TikTok's login, so the site may send drafts to @kurean.news's inbox. */
export async function GET(req: Request) {
  const jar = await cookies();
  if (!(await isAdminToken(jar.get(ADMIN_COOKIE)?.value))) return NextResponse.redirect(new URL("/admin/login", req.url));
  if (!tiktokConfigured()) return NextResponse.redirect(new URL("/admin/tiktok?tt=no-key", req.url));
  const state = crypto.randomUUID();
  const res = NextResponse.redirect(authorizeUrl(state));
  res.cookies.set("kurean_tt_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/api/tiktok", maxAge: 600 });
  return res;
}
