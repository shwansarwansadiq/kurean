/**
 * Free photos from Wikimedia Commons, used before a source's own (copyrighted) photo.
 * "Same person or place" is decided by names only: the Commons category must match the name exactly
 * (ignoring case, spaces and hyphens) and the file's own title must contain that name. No face matching.
 */

const API = "https://commons.wikimedia.org/w/api.php";
const UA = "KureanBot/1.0 (+https://kurean.vercel.app; Kurdish K-culture news)";

/** Long side at least this many pixels, short side at least MIN_SHORT: "very high resolution". */
export const MIN_LONG = 1600;
export const MIN_SHORT = 900;

export const normName = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "");

/** Licences that allow use on a commercial site with credit (Commons accepts no NC/ND files). */
export function isAllowedLicense(short: string | undefined): boolean {
  const l = (short ?? "").toLowerCase().trim();
  if (!l || /(^|[\s-])(nc|nd)([\s-]|$)/.test(l)) return false;
  return /^(cc0|cc by|cc-by|public domain|pd|kogl type 1)/.test(l);
}

export const plain = (html: string | undefined) =>
  (html ?? "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

/** Names worth searching for: Latin names in the headline, without «quoted titles». */
export function photoSubjects(latinRuns: string[]): string[] {
  const out: string[] = [];
  for (const raw of latinRuns) {
    const t = raw.trim();
    if (!t || t.startsWith("«") || t.endsWith("»")) continue; // drama/film/song titles: posters are copyrighted
    const name = t.replace(/\b(19|20)\d{2}\b/g, "").replace(/['’]s$/, "").trim();
    if (name.length < 2 || /^\d+$/.test(name)) continue;
    if (!out.some((o) => normName(o) === normName(name))) out.push(name);
  }
  return out.slice(0, 3);
}

export type CommonsFile = {
  title: string;
  width: number;
  height: number;
  mime: string;
  thumburl: string;
  descriptionurl: string;
  license: string;
  artist: string;
  date: string;
};

/** Scores a candidate: solo photos named after the subject, recent, large. Null when it doesn't qualify. */
export function scoreFile(f: CommonsFile, name: string, year: number): number | null {
  const title = f.title.replace(/^File:/, "").replace(/\.[a-z]+$/i, "");
  if (!normName(title).includes(normName(name))) return null; // the subject must be named in the file itself
  if (!/^image\/(jpeg|png|webp)$/.test(f.mime)) return null;
  if (/signature|logo|autograph|poster|album cover/i.test(title)) return null;
  if (!isAllowedLicense(f.license)) return null;
  const long = Math.max(f.width, f.height);
  const short = Math.min(f.width, f.height);
  if (long < MIN_LONG || short < MIN_SHORT) return null;
  const others = (title.match(/,| and | with | & /gi) ?? []).length;
  const photoYear = Number(/\b(19|20)\d{2}\b/.exec(f.date || title)?.[0] ?? 0);
  const age = photoYear ? Math.max(0, year - photoYear) : 6;
  return 100 - others * 15 - age * 6 + Math.min(20, (long - MIN_LONG) / 200);
}

async function api(params: Record<string, string>): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${API}?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`, {
      headers: { "User-Agent": UA, "Api-User-Agent": UA },
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok ? ((await res.json()) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** The Commons category whose name is exactly this person, group or place, if there is one. */
async function exactCategory(name: string): Promise<string | null> {
  const data = await api({ action: "query", list: "search", srnamespace: "14", srsearch: name, srlimit: "10" });
  const hits = ((data?.query as { search?: { title: string }[] })?.search ?? []).map((h) => h.title);
  return hits.find((t) => normName(t.replace(/^Category:/, "")) === normName(name)) ?? null;
}

async function filesIn(category: string): Promise<CommonsFile[]> {
  const data = await api({
    action: "query",
    generator: "categorymembers",
    gcmtitle: category,
    gcmtype: "file",
    gcmlimit: "50",
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: "2400",
    iiextmetadatafilter: "LicenseShortName|Artist|DateTimeOriginal",
  });
  const pages = ((data?.query as { pages?: unknown[] })?.pages ?? []) as {
    title: string;
    imageinfo?: {
      width: number;
      height: number;
      mime: string;
      url: string;
      thumburl?: string;
      descriptionurl: string;
      extmetadata?: Record<string, { value?: string }>;
    }[];
  }[];
  return pages.flatMap((p) => {
    const i = p.imageinfo?.[0];
    if (!i) return [];
    const m = i.extmetadata ?? {};
    return [
      {
        title: p.title,
        width: i.width,
        height: i.height,
        mime: i.mime,
        thumburl: i.thumburl ?? i.url,
        descriptionurl: i.descriptionurl,
        license: m.LicenseShortName?.value ?? "",
        artist: plain(m.Artist?.value).slice(0, 80) || "Wikimedia Commons",
        date: plain(m.DateTimeOriginal?.value),
      },
    ];
  });
}

export type FreePhoto = { image: string; page: string; credit: string; license: string };

/** Best free, high-resolution photo of one of the subjects, or null. Looks at the last five years first. */
export async function findFreePhoto(subjects: string[], now = new Date()): Promise<FreePhoto | null> {
  const year = now.getUTCFullYear();
  for (const name of subjects) {
    const cat = await exactCategory(name);
    if (!cat) continue;
    const cats = [0, 1, 2, 3, 4].map((d) => `${cat} in ${year - d}`).concat(cat);
    let best: { f: CommonsFile; s: number } | null = null;
    for (const c of cats) {
      for (const f of await filesIn(c)) {
        const s = scoreFile(f, name, year);
        if (s !== null && (!best || s > best.s)) best = { f, s };
      }
      if (best && best.s >= 80) break; // a good recent solo photo: stop looking
    }
    if (best) {
      return {
        image: best.f.thumburl,
        page: best.f.descriptionurl,
        credit: `${best.f.artist} · ${best.f.license} · Wikimedia Commons`,
        license: best.f.license,
      };
    }
  }
  return null;
}
