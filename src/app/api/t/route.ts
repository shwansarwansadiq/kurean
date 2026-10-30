import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { isAdminToken } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { isBot, parseUA, trafficSource } from "@/lib/ua";

export const runtime = "nodejs";

const clip = (v: unknown, n = 200) => (typeof v === "string" && v ? v.slice(0, n) : null);
const CATEGORIES = new Set(["kpop", "kdrama_film", "culture", "korea_news"]);

/**
 * First-party analytics collector. Stores no IP address and sets no cookie. Without consent a visitor is a hash of
 * the day, IP and browser (it changes every day); with consent it is a hash of a random ID kept in the browser.
 */
export async function POST(req: Request) {
  const ua = req.headers.get("user-agent") ?? "";
  if (isBot(ua)) return new NextResponse(null, { status: 204 });
  // Shwan's own visits (signed in to /admin) are internal traffic.
  const cookie = /(?:^|;\s*)kurean_admin=([^;]+)/.exec(req.headers.get("cookie") ?? "")?.[1];
  if (cookie && (await isAdminToken(decodeURIComponent(cookie)))) return new NextResponse(null, { status: 204 });

  let b: Record<string, unknown>;
  try {
    b = JSON.parse((await req.text()).slice(0, 4000));
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const type = b.t === "engage" ? "engage" : b.t === "pageview" ? "pageview" : null;
  const path = clip(b.p, 300);
  if (!type || !path || path.startsWith("/admin") || path.startsWith("/card")) return new NextResponse(null, { status: 204 });

  const salt = process.env.CRON_SECRET ?? "kurean";
  const day = new Date().toISOString().slice(0, 10);
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  const consent = b.c === 1 && typeof b.v === "string" && /^[a-z0-9]{8,40}$/i.test(b.v);
  const visitor = createHash("sha256")
    .update(consent ? `${salt}|v|${b.v}` : `${salt}|${day}|${ip}|${ua}`)
    .digest("hex")
    .slice(0, 32);

  let referrerHost: string | null = null;
  try {
    referrerHost = b.r ? new URL(String(b.r)).hostname.replace(/^www\./, "") : null;
  } catch {
    referrerHost = null;
  }
  const { device, os, browser } = parseUA(ua);
  const storyId = Number(b.s);
  const category = typeof b.k === "string" && CATEGORIES.has(b.k) ? b.k : null;
  const city = req.headers.get("x-vercel-ip-city");

  await db()
    .from("analytics_events")
    .insert({
      type,
      visitor,
      consent,
      session: clip(b.n, 40),
      pv: clip(b.i, 40),
      path,
      story_id: Number.isSafeInteger(storyId) && storyId > 0 ? storyId : null,
      category,
      source: trafficSource({ utmSource: clip(b.us), referrerHost, ua, ownHost: "kurean.news" }),
      referrer_host: referrerHost === "kurean.news" ? null : referrerHost,
      utm_source: clip(b.us, 80),
      utm_medium: clip(b.um, 80),
      utm_campaign: clip(b.uc, 120),
      country: req.headers.get("x-vercel-ip-country"),
      city: city ? decodeURIComponent(city) : null,
      device,
      os,
      browser,
      lang: clip(b.l, 12),
      engaged_ms: type === "engage" ? Math.max(0, Math.min(Number(b.e) || 0, 3_600_000)) : null,
      scroll: type === "engage" ? Math.max(0, Math.min(Number(b.d) || 0, 100)) : null,
    });
  return new NextResponse(null, { status: 204 });
}
