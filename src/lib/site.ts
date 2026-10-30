import { db } from "./db";
import { FIXTURES, fixturesOn } from "./fixtures";

export const CATEGORY_META = {
  kpop: { slug: "kpop", label: "کەی-پۆپ", colour: "var(--berry)", ink: "#fff", en: "K-pop" },
  kdrama_film: { slug: "kdrama-film", label: "دراما و فیلم", colour: "var(--lilac)", ink: "#fff", en: "K-drama & film" },
  culture: { slug: "culture", label: "کولتوور", colour: "var(--mint)", ink: "#fff", en: "Culture" },
  korea_news: { slug: "korea", label: "هەواڵی کۆریا", colour: "var(--blue)", ink: "#fff", en: "Korea news" },
} as const;

export type CategoryKey = keyof typeof CATEGORY_META;
export const CATEGORY_KEYS = Object.keys(CATEGORY_META) as CategoryKey[];

export function categoryFromSlug(slug: string): CategoryKey | null {
  return CATEGORY_KEYS.find((k) => CATEGORY_META[k].slug === slug) ?? null;
}

export type SourceRef = { name: string; url: string; trust?: number };

export type Story = {
  id: number;
  category: CategoryKey;
  headline: string;
  card_headline: string;
  body: string;
  key_points: string[];
  source_name: string;
  source_url: string;
  sources: SourceRef[];
  image_url: string | null;
  image_credit: string | null;
  image_source: string | null;
  gallery?: { url: string; credit: string | null; page: string | null }[];
  kind?: string | null;
  chart_week?: string | null;
  chart_top?: { rank: number; title: string; artist: string; artist_ckb: string | null; move: "up" | "down" | "same" | "new"; change: number }[] | null;
  published_at: string | null;
  created_at: string;
};

const LIST_FIELDS =
  "id, category, headline, card_headline, body, key_points, source_name, source_url, sources, image_url, image_credit, image_source, gallery, kind, chart_week, chart_top, published_at, created_at";

/** Published stories, newest first. */
export async function publishedStories(opts: { limit?: number; category?: CategoryKey } = {}): Promise<Story[]> {
  if (fixturesOn()) return FIXTURES.filter((s) => !opts.category || s.category === opts.category);
  let q = db()
    .from("stories")
    .select(LIST_FIELDS)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(opts.limit ?? 30);
  if (opts.category) q = q.eq("category", opts.category);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Story[];
}

export async function publishedStory(id: number): Promise<Story | null> {
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  if (fixturesOn()) return FIXTURES.find((s) => s.id === id) ?? null;
  const { data, error } = await db().from("stories").select(LIST_FIELDS).eq("id", id).eq("status", "published").maybeSingle();
  if (error) throw error;
  return (data as Story | null) ?? null;
}

/** Issue number: days since the first published story, counting that day as issue 1. */
export async function issueNumber(now = new Date()): Promise<number> {
  if (fixturesOn()) return 1;
  const { data } = await db()
    .from("stories")
    .select("published_at")
    .eq("status", "published")
    .order("published_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const first = data?.published_at ? new Date(data.published_at) : now;
  return issueFrom(first, now);
}

export function issueFrom(first: Date, now: Date): number {
  const day = (d: Date) => Math.floor((d.getTime() + 3 * 3600_000) / 86_400_000); // Kurdistan day (UTC+3)
  return Math.max(1, day(now) - day(first) + 1);
}

// ---------- Sorani formatting ----------

const DIGITS = "٠١٢٣٤٥٦٧٨٩";
export const ku = (n: number | string) => String(n).replace(/\d/g, (d) => DIGITS[Number(d)]);

const MONTHS = [
  "کانوونی دووەم", "شوبات", "ئازار", "نیسان", "ئایار", "حوزەیران",
  "تەممووز", "ئاب", "ئەیلوول", "تشرینی یەکەم", "تشرینی دووەم", "کانوونی یەکەم",
];
const DAYS = ["یەکشەممە", "دووشەممە", "سێشەممە", "چوارشەممە", "پێنجشەممە", "هەینی", "شەممە"];

/** "هەینی ٣٠ی تشرینی یەکەم" in Kurdistan time. */
export function soraniDate(iso: string | Date, withDay = true): string {
  const d = new Date(new Date(iso).getTime() + 3 * 3600_000); // UTC+3, no DST
  const date = `${ku(d.getUTCDate())}ی ${MONTHS[d.getUTCMonth()]}`;
  return withDay ? `${DAYS[d.getUTCDay()]} ${date}` : date;
}

/** Reading time in minutes at a relaxed phone pace. */
export function readingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 150));
}

export const paragraphs = (body: string) =>
  body
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter(Boolean);

export type Run = { text: string; latin: boolean };

/**
 * Splits Sorani text into runs so Latin names (with their «» quotes) are set in the Latin face and
 * isolated from the right-to-left text around them.
 */
export function bidiRuns(text: string): Run[] {
  const re = /«?[A-Za-z0-9][A-Za-z0-9.'’&:!?\-]*(?:\s+[A-Za-z0-9][A-Za-z0-9.'’&:!?\-]*)*»?/g;
  const out: Run[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const start = m.index ?? 0;
    // A run of digits alone (a year, a date) stays in the Sorani flow.
    if (!/[A-Za-z]/.test(m[0])) continue;
    if (start > last) out.push({ text: text.slice(last, start), latin: false });
    out.push({ text: m[0], latin: true });
    last = start + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), latin: false });
  return out;
}

export function siteUrl(): string {
  return process.env.KUREAN_SITE_URL ?? "https://kurean.news";
}
