import { db } from "./db";
import { findFreePhoto, photoSubjects } from "./commons";
import { bidiRuns } from "./site";

const UA = "KureanBot/1.0 (+https://kurean.vercel.app)";
const BUCKET = "story-images";
const MAX_BYTES = 12 * 1024 * 1024;

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

/** Photo agencies and outlets that license and enforce their photos. */
const AGENCY =
  /getty ?images|gettyimages|yonhap|yna\.co\.kr|newsen|\bosen\b|news1|newsis|xportsnews|dispatch|tenasia|sports ?chosun|sportschosun|sports ?seoul|ilgan|star ?news|my ?daily|edaily|joongang|chosun|\bap photo\b|associated press|reuters|\bafp\b|\bepa\b|shutterstock|imago/i;

/** Signs that a photo belongs to an agency: its address, or credit/copyright text embedded in the file. */
export function looksLikeAgencyPhoto(url: string, bytes?: Uint8Array): boolean {
  if (AGENCY.test(url)) return true;
  if (!bytes) return false;
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 131_072));
  const meta = head.match(/(copyright|credit|byline|rights|source|creator)[^\n]{0,160}/gi)?.join(" ") ?? "";
  return AGENCY.test(meta) || /<photoshop:Credit>[^<]*(getty|yonhap|newsen|osen|news1)/i.test(head);
}

async function get(url: string, accept: string): Promise<Response | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: accept },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
    // A refusal (403, 429, a bot check) means no photo from this site: we never work around it.
    return res.ok ? res : null;
  } catch {
    return null;
  }
}

/** The photo the source posted with the story: the feed's image first, then the article page's og:image. */
export async function findSourcePhoto(reports: PhotoCandidate[]): Promise<{ image: string; page: string; credit: string } | null> {
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

/** Downloads a photo and copies it into our storage, so the site and cards never depend on another server. */
async function storePhoto(imageUrl: string, key: string): Promise<{ url: string; bytes: Uint8Array } | null> {
  const res = await get(imageUrl, "image/avif,image/webp,image/jpeg,image/png,image/*");
  if (!res) return null;
  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  const ext = EXT[type];
  if (!ext) return null;
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_BYTES) return null;
  const path = `${key}-${Date.now().toString(36)}.${ext}`;
  const { error } = await db().storage.from(BUCKET).upload(path, bytes, { contentType: type, upsert: true });
  if (error) return null;
  return { url: db().storage.from(BUCKET).getPublicUrl(path).data.publicUrl, bytes };
}

/**
 * Attaches the best photo to a story:
 * 1. a free, high-resolution photo of the same person, group or place from Wikimedia Commons;
 * 2. otherwise the photo the source posted (Shwan's decision), marked "source" or "source-agency".
 * Whatever is chosen is credited, and can be removed from /admin if a rights holder asks.
 */
export async function attachPhoto(storyId: number, headline: string, reports: PhotoCandidate[]): Promise<string | null> {
  const now = new Date().toISOString();
  const subjects = photoSubjects(bidiRuns(headline).filter((r) => r.latin).map((r) => r.text));
  const free = subjects.length ? await findFreePhoto(subjects) : null;
  if (free) {
    const stored = await storePhoto(free.image, `story-${storyId}-free`);
    if (stored) {
      await db()
        .from("stories")
        .update({ image_url: stored.url, image_source: free.page, image_credit: free.credit, image_license: `free:${free.license}`, photo_checked_at: now })
        .eq("id", storyId);
      return "free";
    }
  }
  const found = await findSourcePhoto(reports);
  const stored = found ? await storePhoto(found.image, `story-${storyId}`) : null;
  if (!found || !stored) {
    await db().from("stories").update({ photo_checked_at: now }).eq("id", storyId);
    return null;
  }
  const license = looksLikeAgencyPhoto(found.image, stored.bytes) ? "source-agency" : "source";
  await db()
    .from("stories")
    .update({ image_url: stored.url, image_source: found.page, image_credit: found.credit, image_license: license, photo_checked_at: now })
    .eq("id", storyId);
  return license;
}
