import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isAdminToken, sameString } from "@/lib/admin-auth";
import { connect } from "@/lib/tiktok";

export const runtime = "nodejs";

/** TikTok sends Shwan back here after he allows Kurean; the one-time code becomes the stored tokens. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const jar = await cookies();
  const back = (tt: string) => {
    const res = NextResponse.redirect(new URL(`/admin/tiktok?tt=${tt}`, req.url));
    res.cookies.delete({ name: "kurean_tt_state", path: "/api/tiktok" });
    return res;
  };
  if (!(await isAdminToken(jar.get(ADMIN_COOKIE)?.value))) return NextResponse.redirect(new URL("/admin/login", req.url));
  const state = url.searchParams.get("state") ?? "";
  const expected = jar.get("kurean_tt_state")?.value ?? "";
  if (!expected || !sameString(state, expected)) return back("bad-state");
  const code = url.searchParams.get("code");
  if (!code) return back(url.searchParams.get("error") === "access_denied" ? "denied" : "no-code");
  try {
    await connect(code);
    return back("connected");
  } catch (e) {
    console.error("tiktok connect", e);
    return back("failed");
  }
}
