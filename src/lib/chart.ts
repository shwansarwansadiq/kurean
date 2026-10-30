/**
 * The weekly Korea chart in the site footer: Circle Chart's Digital Chart (Korea Music Content Association), top 100.
 * Read once a day from Circle Chart's public chart page, the same request its own page makes; nothing is worked
 * around (one polite request with our own user agent, and any refusal means we keep last week's chart).
 * Song and artist names are written for Kurdish readers once per song and reused while it stays in the chart.
 */
import { z } from "zod";
import { db } from "./db";
import { FIXTURE_CHART, fixturesOn } from "./fixtures";
import { callTool, SCORE_MODEL } from "./writer";
import { refreshListenLinks } from "./listen";

const ORIGIN = "https://circlechart.kr";
const PAGE = `${ORIGIN}/page_chart/onoff.circle?nationGbn=T&serviceGbn=ALL`;
const UA = "KureanBot/1.0 (+https://kurean.news)";
export const CHART_ID = "circle-digital";
export const CHART_SIZE = 100;

export type Move = "up" | "down" | "same" | "new";

export type ChartEntry = {
  rank: number;
  prev: number | null;
  move: Move;
  change: number;
  id: string;
  title: string;
  artist: string;
  cover: string | null;
  title_latin?: string | null;
  title_ckb?: string | null;
  artist_latin?: string | null;
  artist_ckb?: string | null;
  youtube_id?: string | null;
  spotify_id?: string | null;
};

export type ChartWeek = { id: string; year: number; week: number; period: string; entries: ChartEntry[]; fetched_at: string };

// ---------- Reading Circle Chart ----------

/** The week Circle Chart's page currently shows: its own script carries hitYear and targetTime, the select its dates. */
export function parseChartPage(html: string): { year: number; week: number; period: string } | null {
  const year = Number(/var\s+hitYear\s*=\s*"(\d{4})"/.exec(html)?.[1]);
  const week = Number(/var\s+targetTime\s*=\s*"(\d{1,2})"/.exec(html)?.[1]);
  if (!year || !week) return null;
  const key = `${year}${String(week).padStart(2, "0")}`;
  const period =
    new RegExp(`value="${key}"[^>]*>\\s*(\\d{4}\\.\\d{2}\\.\\d{2}\\s*~\\s*\\d{4}\\.\\d{2}\\.\\d{2})`).exec(html)?.[1] ??
    /(\d{4}\.\d{2}\.\d{2}\s*~\s*\d{4}\.\d{2}\.\d{2})/.exec(html)?.[1] ??
    "";
  return { year, week, period: period.replace(/\s+/g, "") };
}

type Row = Record<string, string | number | null | undefined>;

/** Turns Circle Chart's list into our entries: rank, movement, names and cover, top 100 only. */
export function parseChartList(json: unknown): ChartEntry[] {
  const list = (json as { List?: Record<string, Row> | Row[] })?.List;
  if (!list) return [];
  const rows = Array.isArray(list) ? list : Object.values(list);
  const s = (v: unknown) => (v == null ? "" : String(v)).trim();
  const out: ChartEntry[] = [];
  for (const r of rows) {
    const rank = Number(s(r.SERVICE_RANKING));
    const id = s(r.SEQ_MOM);
    const title = s(r.SONG_NAME).replace(/`/g, "’");
    const artist = s(r.ARTIST_NAME);
    if (!rank || rank > CHART_SIZE || !id || !title) continue;
    const prev = Number(s(r.PRE_SERVICE_RANKING)) || null;
    const status = s(r.RankStatus).toLowerCase();
    // "hot" is a big jump back into the chart; it is a climb like any other.
    const move: Move = !prev || status === "new" ? "new" : prev > rank ? "up" : prev < rank ? "down" : "same";
    const img = s(r.ALBUMIMG);
    out.push({
      rank,
      prev,
      move,
      change: prev ? Math.abs(prev - rank) : 0,
      id,
      title,
      artist,
      cover: /^\/uploadDir\/[\w/.-]+\.(jpe?g|png|webp)$/i.test(img) ? `${ORIGIN}${img}` : null,
    });
  }
  return out.sort((a, b) => a.rank - b.rank);
}

async function circle(url: string, init: RequestInit = {}): Promise<Response | null> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: { "User-Agent": UA, Accept: "text/html,application/json", ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    return res.ok ? res : null; // a refusal keeps the chart we have
  } catch {
    return null;
  }
}

export async function fetchCircleChart(): Promise<{ year: number; week: number; period: string; entries: ChartEntry[] } | null> {
  const page = await circle(PAGE);
  const meta = page ? parseChartPage(await page.text()) : null;
  if (!meta) return null;
  const body = new URLSearchParams({
    nationGbn: "T",
    serviceGbn: "ALL",
    termGbn: "week",
    hitYear: String(meta.year),
    targetTime: String(meta.week),
    yearTime: "3",
    curUrl: PAGE.replace(/^https:\/\//, ""),
  });
  const res = await circle(`${ORIGIN}/data/api/chart/onoff`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", Referer: PAGE, "X-Requested-With": "XMLHttpRequest" },
    body,
  });
  const entries = res ? parseChartList(await res.json().catch(() => null)) : [];
  return entries.length >= 50 ? { ...meta, entries } : null;
}

// ---------- Names for Kurdish readers ----------

const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힯]/;

const INITIAL = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
const MEDIAL = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
const FINAL = ["", "k", "k", "k", "n", "n", "n", "t", "l", "k", "m", "l", "l", "l", "p", "l", "m", "p", "p", "t", "t", "ng", "t", "t", "k", "t", "p", "t"];

/** Plain Revised Romanization, syllable by syllable: the backstop when no Latin name is available. */
export function romanize(text: string): string {
  let out = "";
  let word = true;
  for (const ch of text) {
    const c = ch.codePointAt(0)!;
    if (c >= 0xac00 && c <= 0xd7a3) {
      const i = c - 0xac00;
      let syl = INITIAL[Math.floor(i / 588)] + MEDIAL[Math.floor((i % 588) / 28)] + FINAL[i % 28];
      if (word) syl = syl.charAt(0).toUpperCase() + syl.slice(1);
      out += syl;
      word = false;
    } else {
      out += ch;
      word = /\s|\(/.test(ch);
    }
  }
  return out;
}

/** A Latin name: the one given, else the Latin part of the original, else its romanization. */
export const latinName = (given: string | null | undefined, original: string) =>
  given && !HANGUL.test(given) ? given : latinPart(original) ?? romanize(original);

/** "소연 (SOYEON)" → "SOYEON"; "IVE (아이브)" → "IVE"; plain Latin stays as it is. Null when only Korean is given. */
export function latinPart(name: string): string | null {
  if (!HANGUL.test(name)) return name.trim();
  const parts = name.split(/\s*,\s*/).map((p) => {
    if (!HANGUL.test(p)) return p.trim();
    const inBrackets = /\(([^()]*[A-Za-z][^()]*)\)/.exec(p)?.[1];
    if (inBrackets && !HANGUL.test(inBrackets)) return inBrackets.trim();
    const outside = p.replace(/\([^()]*\)/g, "").trim();
    return outside && !HANGUL.test(outside) ? outside : null;
  });
  return parts.every(Boolean) ? parts.join(", ") : null;
}

export const NAMES_TOOL = {
  name: "record_names",
  description: "Record Latin and Sorani names for every song.",
  input_schema: {
    type: "object" as const,
    properties: {
      songs: {
        type: "array",
        items: {
          type: "object",
          properties: {
            index: { type: "integer" },
            title_latin: { type: "string", description: "Official English/Latin title if the given title contains one, else Revised Romanization of the Korean title" },
            artist_latin: { type: "string", description: "The artist's official Latin name (as in the brackets when given), else Revised Romanization" },
            artist_ckb: { type: "string", description: "The artist name spelled in Sorani Kurdish letters, as Kurdish K-pop fans would write it" },
          },
          required: ["index", "title_latin", "artist_latin", "artist_ckb"],
        },
      },
    },
    required: ["songs"],
  },
};

const NamesSchema = z.object({
  songs: z.array(
    z.object({
      index: z.number().int(),
      title_latin: z.string(),
      artist_latin: z.string(),
      artist_ckb: z.string(),
    }),
  ),
});

const NAMES_SYSTEM = `You prepare a Korean music chart for Kurdish (Sorani) K-pop fans aged 15-30.
For each song you get the title and artist exactly as the Korean chart writes them.
- Latin names: use the official English/Latin name when the text contains one (often in brackets). Otherwise use
  Revised Romanization. Never invent an English title that is not in the text; credits such as "(Feat. X)" or
  "(Narr. X)" stay, romanized.
- artist_ckb: the artist name in Sorani letters by sound (e.g. IVE → ئایڤ, aespa → ئێسپا, IU → ئایو).
- title_latin and artist_latin must contain no Korean letters at all.
Use only the text you are given; add nothing else.`;

/** Both Latin names present and free of Hangul. */
export const isRomanized = (n: { title_latin?: string | null; artist_latin?: string | null }) =>
  !!n.title_latin && !!n.artist_latin && !HANGUL.test(n.title_latin) && !HANGUL.test(n.artist_latin);

type Names = Pick<ChartEntry, "title_latin" | "title_ckb" | "artist_latin" | "artist_ckb" | "youtube_id" | "spotify_id">;

async function writeNames(songs: { title: string; artist: string }[]): Promise<Names[]> {
  const fallback = songs.map((s) => ({ title_latin: latinName(null, s.title), title_ckb: null, artist_latin: latinName(null, s.artist), artist_ckb: null }));
  if (!songs.length || !process.env.ANTHROPIC_API_KEY) return fallback;
  try {
    const out = await callTool({
      model: SCORE_MODEL,
      system: NAMES_SYSTEM,
      user: songs.map((s, i) => `${i}. title: ${s.title} | artist: ${s.artist}`).join("\n"),
      tool: NAMES_TOOL,
      maxTokens: 12_000,
      parse: (input) => NamesSchema.parse(input),
    });
    return fallback.map((f, i) => {
      const n = out.songs.find((x) => x.index === i);
      if (!n) return f;
      const clean = (v: string) => v.trim() || null;
      return {
        title_latin: !HANGUL.test(songs[i].title) ? songs[i].title : latinName(clean(n.title_latin), songs[i].title),
        title_ckb: null, // Shwan, 30 Oct: no translated title meanings in the chart
        artist_latin: f.artist_latin ?? latinName(clean(n.artist_latin), songs[i].artist),
        artist_ckb: clean(n.artist_ckb),
      };
    });
  } catch {
    return fallback;
  }
}

// ---------- Refresh (cron) and read (site) ----------

/** Reads the current week; stores it when it is new or still missing names. Returns what happened. */
type RefreshResult = { ok: boolean; id?: string; stored?: boolean; named?: number; reason?: string; links?: Awaited<ReturnType<typeof refreshListenLinks>> };

export async function refreshChart(opts: { force?: boolean } = {}): Promise<RefreshResult> {
  const chart = await fetchCircleChart();
  if (!chart) return { ok: false, reason: "Circle Chart did not answer; kept the chart we have" };
  const id = `${CHART_ID}-${chart.year}-${chart.week}`;
  const { data: have } = await db().from("chart_weeks").select("id").eq("id", id).maybeSingle();

  const ids = chart.entries.map((e) => e.id);
  const { data: known } = await db().from("chart_songs").select("id, title_latin, artist_latin").in("id", ids);
  // Songs whose stored names are still in Korean letters are asked again.
  const knownIds = new Set((known ?? []).filter((k) => isRomanized(k)).map((k) => k.id as string));
  const fresh = chart.entries.filter((e) => !knownIds.has(e.id));
  if (have && !fresh.length && !opts.force) return { ok: true, id, stored: false, named: 0, links: await refreshListenLinks(ids) };

  // New songs get their Kurdish-reader names in batches of 50.
  let named = 0;
  for (let i = 0; i < fresh.length; i += 50) {
    const batch = fresh.slice(i, i + 50);
    const names = await writeNames(batch);
    // A name still in Korean letters is not stored, so the song is asked again on the next run.
    const rows = batch
      .map((e, j) => ({ id: e.id, title: e.title, artist: e.artist, ...names[j], updated_at: new Date().toISOString() }))
      .filter((r) => isRomanized(r));
    const { error } = await db().from("chart_songs").upsert(rows);
    if (!error) named += rows.length;
  }

  const { error } = await db().from("chart_weeks").upsert({
    id,
    chart: CHART_ID,
    year: chart.year,
    week: chart.week,
    period: chart.period,
    entries: chart.entries,
    fetched_at: new Date().toISOString(),
  });
  if (error) return { ok: false, id, reason: error.message };
  return { ok: true, id, stored: true, named, links: await refreshListenLinks(ids) };
}

/** The newest stored week with names joined in, or null. */
export async function latestChart(): Promise<ChartWeek | null> {
  if (fixturesOn()) return FIXTURE_CHART;
  try {
    const { data } = await db()
      .from("chart_weeks")
      .select("id, year, week, period, entries, fetched_at")
      .eq("chart", CHART_ID)
      .order("year", { ascending: false })
      .order("week", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    const week = data as ChartWeek;
    const { data: names } = await db()
      .from("chart_songs")
      .select("id, title_latin, artist_latin, artist_ckb, youtube_id, spotify_id")
      .in("id", week.entries.map((e) => e.id));
    const byId = new Map((names ?? []).map((n) => [n.id as string, n as Names]));
    week.entries = week.entries.map((e) => {
      const n = byId.get(e.id);
      return { ...e, ...n, title_latin: latinName(n?.title_latin, e.title), artist_latin: latinName(n?.artist_latin, e.artist) };
    });
    return week;
  } catch {
    return null; // the footer never breaks a page
  }
}

/** "2026.10.18~2026.10.24" → dates, for the Sorani heading. */
export function periodDates(period: string): { from: Date; to: Date } | null {
  const m = /(\d{4})\.(\d{2})\.(\d{2})~(\d{4})\.(\d{2})\.(\d{2})/.exec(period);
  if (!m) return null;
  const d = (y: string, mo: string, da: string) => new Date(Date.UTC(+y, +mo - 1, +da, 3));
  return { from: d(m[1], m[2], m[3]), to: d(m[4], m[5], m[6]) };
}
