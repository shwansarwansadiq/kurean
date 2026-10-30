import { db } from "./db";

const UA = "KureanBot/1.0 (+https://kurean.news)";
const BUCKET = "story-images";
const MAX_BYTES = 8 * 1024 * 1024;

export type PhotoCandidate = { image_url: string | null; url: string; source: string };

/** og:image (or twitter:image) from an article page's HTML. */
export function ogImageFromHtml(html: string): string | null {
  const metas = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const key of ["og:image:secure_url", "og:image", "twitter:image"]) {
    for (const tag of metas) {
      const prop = /\b(?:property|name)=["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase();
      if (prop !== key) continue;
      const content = /\bcontent=["']([^"']+)["']/i.exec(tag)?.[1];
      if (content && /^https?:\/\//i.test(content)) return content.replace(/&amp;/g, "&");
    }
  }
  return null;
}

async function get(url: string, accept: string): Promise<Response | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: accept },
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });
    // A refusal (403, 429, a bot check) means no photo from this site: we never work around it.
    return res.ok ? res : null;
  } catch {
    return null;
  }
}

/** The photo the source posted with the story: the feed's image first, then the article page's og:image. */
export async function findPhoto(reports: PhotoCandidate[]): Promise<{ image: string; page: string; credit: string } | null> {
  for (const r of reports) {
    if (r.image_url) return { image: r.image_url, page: r.url, credit: r.source };
  }
  for (const r of reports) {
    const res = await get(r.url, "text/html");
    if (!res) continue;
    const og = ogImageFromHtml((await res.text()).slice(0, 300_000));
    if (og) return { image: og, page: r.url, credit: r.source };
  }
  return null;
}

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

/** Copies the photo into our storage so the site and social cards never depend on the source's server. */
export async function storePhoto(imageUrl: string, key: string): Promise<string | null> {
  const res = await get(imageUrl, "image/avif,image/webp,image/jpeg,image/png,image/*");
  if (!res) return null;
  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  const ext = EXT[type];
  if (!ext) return null;
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_BYTES) return null;
  const path = `${key}.${ext}`;
  const { error } = await db().storage.from(BUCKET).upload(path, bytes, { contentType: type, upsert: true });
  if (error) return null;
  return db().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Finds, copies and attaches the source photo to a story. Returns true when a photo was attached. */
export async function attachPhoto(storyId: number, reports: PhotoCandidate[]): Promise<boolean> {
  const found = await findPhoto(reports);
  if (!found) return false;
  const stored = await storePhoto(found.image, `story-${storyId}`);
  if (!stored) return false;
  const { error } = await db()
    .from("stories")
    .update({ image_url: stored, image_source: found.page, image_credit: found.credit })
    .eq("id", storyId);
  return !error;
}
