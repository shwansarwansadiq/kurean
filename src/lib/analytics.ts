import { db } from "./db";
import { fixturesOn } from "./fixtures";

export type Row = { key: string; pageviews?: number; visitors?: number; avg_engaged_ms?: number | null; [k: string]: unknown };

export type Analytics = {
  totals: {
    pageviews: number;
    visitors: number;
    sessions: number;
    pages_per_session: number | null;
    bounce_pct: number | null;
    avg_engaged_ms: number | null;
    avg_scroll: number | null;
    consented_visitors: number;
    returning_visitors: number;
    consent_pct: number | null;
  };
  daily: { day: string; pageviews: number; visitors: number }[];
  categories: Row[];
  sources: Row[];
  referrers: Row[];
  campaigns: Row[];
  devices: Row[];
  os: Row[];
  browsers: Row[];
  langs: Row[];
  countries: Row[];
  cities: Row[];
  heatmap: { dow: number; hour: number; pageviews: number }[];
  scroll: { reached25?: number; reached50?: number; reached75?: number; reached100?: number };
  articles: { story_id: number; category: string; pageviews: number; visitors: number; avg_engaged_ms: number | null; avg_scroll: number | null }[];
  exits: Row[];
  first_event: string | null;
  generated_at: string;
};

export type Range = { key: string; from: Date; to: Date; days: number; label: string };

const DAY = 86_400_000;
const OFFSET = 3 * 3_600_000; // Asia/Baghdad, UTC+3, no daylight saving

/** Start of the given Baghdad day, as a UTC instant. */
function baghdadMidnight(d: Date): Date {
  const local = new Date(d.getTime() + OFFSET);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - OFFSET);
}

/** today | 7d | 30d | 90d | custom (from/to as YYYY-MM-DD, Baghdad days, inclusive). */
export function parseRange(p: { r?: string; from?: string; to?: string }, now = new Date()): Range {
  const today = baghdadMidnight(now);
  if (p.r === "custom" && p.from && p.to && /^\d{4}-\d{2}-\d{2}$/.test(p.from) && /^\d{4}-\d{2}-\d{2}$/.test(p.to)) {
    const from = new Date(Date.parse(`${p.from}T00:00:00Z`) - OFFSET);
    const to = new Date(Date.parse(`${p.to}T00:00:00Z`) - OFFSET + DAY);
    if (to > from) return { key: "custom", from, to, days: Math.round((to.getTime() - from.getTime()) / DAY), label: `${p.from} → ${p.to}` };
  }
  const days = p.r === "today" ? 1 : p.r === "30d" ? 30 : p.r === "90d" ? 90 : 7;
  const key = p.r === "today" || p.r === "30d" || p.r === "90d" ? p.r : "7d";
  return { key, from: new Date(today.getTime() - (days - 1) * DAY), to: new Date(today.getTime() + DAY), days, label: key };
}

/** The same length of time just before the range, for comparison. */
export function previousRange(r: Range): Range {
  const len = r.to.getTime() - r.from.getTime();
  return { ...r, key: "prev", from: new Date(r.from.getTime() - len), to: r.from };
}

/** True when the range reaches into the future (today is still running) or starts before data collection began. */
export function incomplete(r: Range, firstEvent: string | null, now = new Date()): boolean {
  return r.to > now || !firstEvent || new Date(firstEvent) > r.from;
}

export async function analytics(r: Range, category: string | null): Promise<Analytics> {
  if (fixturesOn()) return sampleAnalytics(r, r.key === "prev" ? 0.8 : 1);
  const { data, error } = await db().rpc("kurean_analytics", {
    p_from: r.from.toISOString(),
    p_to: r.to.toISOString(),
    p_category: category,
  });
  if (error) throw error;
  return data as Analytics;
}

/** Headlines for the top-articles table. */
export async function headlines(ids: number[]): Promise<Map<number, string>> {
  if (!ids.length) return new Map();
  if (fixturesOn()) return new Map(ids.map((id) => [id, `هەواڵی نموونە #${id}`]));
  const { data } = await db().from("stories").select("id, headline").in("id", ids);
  return new Map((data ?? []).map((s: { id: number; headline: string }) => [s.id, s.headline]));
}

export const SOURCE_LABEL: Record<string, string> = {
  direct: "ڕاستەوخۆ",
  search: "گەڕان",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  social: "تۆڕی تر",
  referral: "ماڵپەڕی تر",
};
export const DEVICE_LABEL: Record<string, string> = { mobile: "مۆبایل", tablet: "تابلێت", desktop: "کۆمپیوتەر", unknown: "نەزانراو" };
export const DOW_LABEL = ["یەکشەممە", "دووشەممە", "سێشەممە", "چوارشەممە", "پێنجشەممە", "هەینی", "شەممە"];

/** Local preview only (KUREAN_FIXTURES=1): made-up numbers, never shown in production. */
function sampleAnalytics(r: Range, k: number): Analytics {
  const days = Array.from({ length: Math.min(r.days || 7, 90) }, (_, i) => {
    const d = new Date(r.from.getTime() + i * DAY + OFFSET).toISOString().slice(0, 10);
    const v = Math.round((120 + 60 * Math.sin(i / 2) + i * 4) * k);
    return { day: d, pageviews: Math.round(v * 2.3), visitors: v };
  });
  const sum = days.reduce((a, d) => a + d.pageviews, 0);
  return {
    totals: { pageviews: sum, visitors: Math.round(sum / 2.6), sessions: Math.round(sum / 1.9), pages_per_session: 1.9, bounce_pct: 54.2 / k, avg_engaged_ms: 71_000 * k, avg_scroll: 63 * k, consented_visitors: 400, returning_visitors: Math.round(140 * k), consent_pct: 61.5 },
    daily: days,
    categories: [
      { key: "kpop", pageviews: Math.round(sum * 0.46), avg_engaged_ms: 64_000 },
      { key: "kdrama_film", pageviews: Math.round(sum * 0.31), avg_engaged_ms: 82_000 },
      { key: "korea_news", pageviews: Math.round(sum * 0.12), avg_engaged_ms: 58_000 },
      { key: "culture", pageviews: Math.round(sum * 0.07), avg_engaged_ms: 90_000 },
      { key: "none", pageviews: Math.round(sum * 0.04), avg_engaged_ms: 20_000 },
    ],
    sources: [{ key: "instagram", pageviews: sum * 0.52 }, { key: "facebook", pageviews: sum * 0.21 }, { key: "tiktok", pageviews: sum * 0.12 }, { key: "direct", pageviews: sum * 0.1 }, { key: "search", pageviews: sum * 0.05 }],
    referrers: [{ key: "l.instagram.com", pageviews: 900 }, { key: "m.facebook.com", pageviews: 300 }],
    campaigns: [],
    devices: [{ key: "mobile", visitors: 820 }, { key: "desktop", visitors: 90 }, { key: "tablet", visitors: 30 }],
    os: [{ key: "Android", visitors: 520 }, { key: "iOS", visitors: 330 }, { key: "Windows", visitors: 60 }],
    browsers: [{ key: "Instagram app", visitors: 410 }, { key: "Chrome", visitors: 280 }, { key: "Safari", visitors: 140 }],
    langs: [{ key: "ar", visitors: 380 }, { key: "en-US", visitors: 300 }, { key: "ckb", visitors: 160 }],
    countries: [{ key: "IQ", visitors: 760 }, { key: "DE", visitors: 60 }, { key: "SE", visitors: 41 }, { key: "GB", visitors: 30 }],
    cities: [{ key: "Sulaymaniyah", country: "IQ", visitors: 330 }, { key: "Erbil", country: "IQ", visitors: 290 }, { key: "Duhok", country: "IQ", visitors: 80 }, { key: "Kirkuk", country: "IQ", visitors: 44 }],
    heatmap: Array.from({ length: 7 * 24 }, (_, i) => ({ dow: Math.floor(i / 24), hour: i % 24, pageviews: Math.round(Math.max(0, 30 * Math.sin(((i % 24) - 6) / 4)) + (i % 24 > 19 ? 25 : 0)) })),
    scroll: { reached25: 88, reached50: 71, reached75: 52, reached100: 31 },
    articles: [4, 7, 6, 5].map((id, i) => ({ story_id: id, category: ["kpop", "kdrama_film", "kdrama_film", "korea_news"][i], pageviews: 900 - i * 180, visitors: 400 - i * 70, avg_engaged_ms: 60_000 + i * 9000, avg_scroll: 70 - i * 6 })),
    exits: [{ key: "/news/4", exits: 210 }, { key: "/", exits: 120 }],
    first_event: new Date(r.from.getTime() - 30 * DAY).toISOString(),
    generated_at: new Date().toISOString(),
  };
}
