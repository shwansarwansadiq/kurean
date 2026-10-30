import { createHash } from "node:crypto";

/** Tracking parameters stripped before hashing, so the same story from two links counts once. */
const TRACKING_PARAMS = /^(utm_|fbclid$|gclid$|ref$|ref_src$|from$)/i;

export function canonicalUrl(raw: string): string {
  const u = new URL(raw.trim());
  u.hash = "";
  for (const key of [...u.searchParams.keys()]) {
    if (TRACKING_PARAMS.test(key)) u.searchParams.delete(key);
  }
  u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");
  u.protocol = "https:";
  let s = u.toString();
  if (s.endsWith("/")) s = s.slice(0, -1);
  return s;
}

export function urlHash(raw: string): string {
  return createHash("sha256").update(canonicalUrl(raw)).digest("hex");
}

/** Plain text from an HTML snippet, collapsed and cut to a length the writer needs. */
export function plainText(html: string | undefined | null, max = 1200): string | null {
  if (!html) return null;
  const text = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  return text.length > max ? text.slice(0, max).replace(/\s\S*$/, "") + "…" : text;
}

export type FeedEntry = {
  link?: string;
  guid?: string;
  title?: string;
  contentSnippet?: string;
  content?: string;
  summary?: string;
  isoDate?: string;
  pubDate?: string;
  contentEncoded?: string;
  enclosure?: { url?: string; type?: string };
  mediaContent?: { $?: { url?: string } } | Array<{ $?: { url?: string } }>;
};

export type NormalizedItem = {
  url: string;
  url_hash: string;
  title: string;
  summary: string | null;
  published_at: string | null;
  image_url: string | null;
};

/** Turns one RSS entry into a row, or null when it has no usable link or title. */
export function normalizeEntry(e: FeedEntry): NormalizedItem | null {
  const link = e.link || (e.guid && /^https?:\/\//.test(e.guid) ? e.guid : undefined);
  const title = plainText(e.title, 300);
  if (!link || !title) return null;
  let url: string;
  try {
    url = canonicalUrl(link);
  } catch {
    return null;
  }
  const media = Array.isArray(e.mediaContent) ? e.mediaContent[0] : e.mediaContent;
  const image =
    (e.enclosure?.type?.startsWith("image") ? e.enclosure.url : undefined) ??
    media?.$?.url ??
    firstImageInHtml(e.contentEncoded ?? e.content) ??
    null;
  const date = e.isoDate || e.pubDate;
  const parsed = date ? new Date(date) : null;
  return {
    url,
    url_hash: urlHash(url),
    title,
    summary: plainText(e.contentSnippet || e.summary || e.content),
    published_at: parsed && !isNaN(parsed.getTime()) ? parsed.toISOString() : null,
    // The photo as the source posted it; the writer copies it with the story and credits the source.
    image_url: image ?? null,
  };
}

/** Keeps items from the last `hours` hours (items with no date are kept). */
export function isFresh(item: NormalizedItem, now = new Date(), hours = 48): boolean {
  if (!item.published_at) return true;
  return now.getTime() - new Date(item.published_at).getTime() <= hours * 3600_000;
}

/** First real image in an HTML snippet (skips tracking pixels and icons). */
export function firstImageInHtml(html: string | undefined | null): string | null {
  if (!html) return null;
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const src = /\bsrc=["']([^"']+)["']/i.exec(tag)?.[1];
    if (!src || !/^https?:\/\//i.test(src)) continue;
    const w = Number(/\bwidth=["']?(\d+)/i.exec(tag)?.[1] ?? 0);
    if (w && w < 200) continue;
    if (/(pixel|spacer|feeds\.feedburner|gravatar|emoji|\.gif(\?|$))/i.test(src)) continue;
    return src.replace(/&amp;/g, "&");
  }
  return null;
}
