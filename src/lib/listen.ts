/**
 * Where fans can listen to each chart song: the official YouTube video (played inside Kurean with YouTube's own
 * embedded player) and the Spotify track (a link out). We never host or copy any audio.
 * - YouTube: Data API v3 (YOUTUBE_API_KEY). A search costs 100 of the 10,000 daily quota units, so at most
 *   SEARCHES_PER_RUN songs are searched a day; stored videos are re-checked every 30 days (1 unit per 50 videos),
 *   as YouTube's API policies ask.
 * - Spotify: Web API search with the app's own client credentials (SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET).
 * Only official uploads count: the artist's own channel, its "- Topic" channel, or a known label channel, and the
 * video title must name the song. Covers, lyric videos, fancams and reactions are refused.
 */
import { db } from "./db";
import { normName } from "./commons";

export const SEARCHES_PER_RUN = 40;
const RECHECK_DAYS = 30;
const HANGUL_RE = /[\uac00-\ud7a3]/;

/** Official label and distributor channels that upload K-pop music videos. Lower-case, compared after normName. */
export const LABEL_CHANNELS = [
  "HYBE LABELS", "BIGHIT MUSIC", "SMTOWN", "JYP Entertainment", "YG ENTERTAINMENT", "1theK (원더케이)", "1theK",
  "Stone Music Entertainment", "genie music", "Kakao Entertainment", "starshipTV", "THEBLACKLABEL", "Mnet K-POP",
  "MOST CONTENTS", "Warner Music Korea", "Universal Music Korea", "Sony Music Korea", "ANTENNA", "Antenna Music",
  "WAKEONE", "CUBE ENTERTAINMENT", "FNC ENTERTAINMENT", "Woollim Entertainment", "KQ ENTERTAINMENT", "RBW",
  "P NATION", "PLEDIS ENTERTAINMENT", "ADOR", "BELIFT LAB", "KOZ ENTERTAINMENT", "SOURCE MUSIC", "Dreamus",
  "MAGIC STRAWBERRY SOUND", "CJ ENM MUSIC", "Danal Entertainment", "Kakao M", "THE BLACK LABEL", "AOMG", "H1GHR MUSIC",
  "EDAM Entertainment", "MODHAUS", "ATRP", "Blockberry Creative", "VLAST", "Mystic Story", "Mystic89",
].map(normName);

const NOT_OFFICIAL = /\b(cover|covered|reaction|react|fancam|fan ?cam|lyrics?|karaoke|instrumental|inst\.?|piano|remix|slowed|sped ?up|8d|nightcore|dance practice|tutorial|mirrored|1 ?hour|loop)\b|직캠|가사|노래방|커버/i;

type Hit = { videoId: string; title: string; channelTitle: string };

/** Words of a name, for "does this title name the song" checks: Latin and Hangul, no brackets or credits. */
export function keyWords(s: string): string[] {
  const base = s.replace(/\((feat|prod|narr|with)\.?[^)]*\)/gi, " ").replace(/[()[\]'’`"!?.,:~-]/g, " ");
  return base
    .split(/\s+/)
    .map((w) => w.toLowerCase())
    .filter((w) => w.length > 1 || /[가-힣]/.test(w));
}

/** The artist names a chart line lists: "로제 (ROSE), Bruno Mars" → ["로제", "rose", "bruno mars"]. */
export function artistNames(...names: (string | null | undefined)[]): string[] {
  const out = new Set<string>();
  for (const n of names) {
    for (const part of (n ?? "").split(/\s*[,&X×]\s+|\s*,\s*/)) {
      const outside = part.replace(/\([^)]*\)/g, "").trim();
      const inside = /\(([^)]+)\)/.exec(part)?.[1]?.trim();
      for (const v of [outside, inside]) {
        if (v && (normName(v).length >= 2 || HANGUL_RE.test(v))) out.add(v.toLowerCase());
      }
    }
  }
  return [...out];
}

const norm = (s: string) => s.toLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}]/gu, "");

/** Scores a YouTube search hit for a chart song; null when it is not an official upload of this song. */
export function scoreVideo(hit: Hit, song: { titles: string[]; artists: string[] }): number | null {
  const t = hit.title.toLowerCase();
  if (NOT_OFFICIAL.test(hit.title)) return null;
  const channel = norm(hit.channelTitle.replace(/\s*-\s*topic$/i, ""));
  const isTopic = /-\s*topic$/i.test(hit.channelTitle);
  const artistChannel = song.artists.some((a) => {
    const n = norm(a);
    return n.length >= 2 && (channel === n || channel === `${n}official` || channel === `official${n}` || channel.startsWith(n));
  });
  const labelChannel = LABEL_CHANNELS.includes(normName(hit.channelTitle)) || LABEL_CHANNELS.includes(channel);
  if (!artistChannel && !labelChannel) return null;
  // The song must be named in the video title (all its key words, in any of its spellings).
  const named = song.titles.some((title) => {
    const words = keyWords(title);
    return words.length > 0 && words.every((w) => norm(t).includes(norm(w)));
  });
  if (!named) return null;
  let score = 50;
  if (artistChannel) score += 20;
  if (isTopic) score -= 5; // official audio: fine, but the video is nicer
  if (/\b(m\/?v|music video|official video)\b/i.test(hit.title)) score += 20;
  if (/\b(teaser|trailer|preview|highlight|live|performance|stage|ver\.?)\b/i.test(hit.title)) score -= 25;
  return score;
}

async function getJson(url: string, init: RequestInit = {}): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000), cache: "no-store" });
    return res.ok ? ((await res.json()) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export type SongForLookup = { id: string; title: string; artist: string; title_latin: string | null; artist_latin: string | null };

const titlesOf = (s: SongForLookup) => [s.title, s.title_latin ?? ""].filter(Boolean);
const artistsOf = (s: SongForLookup) => artistNames(s.artist, s.artist_latin);

/** The official video, null when there is none, or "unavailable" when YouTube did not answer (quota used up, outage). */
export async function findYouTube(s: SongForLookup, key: string): Promise<{ id: string; channel: string } | null | "unavailable"> {
  const main = artistsOf(s).find((a) => !/[가-힣]/.test(a)) ?? s.artist;
  // The title as the chart writes it (often Korean): official uploads are titled that way.
  const q = `${main} ${s.title.replace(/\((feat|prod|narr|with)\.?[^)]*\)/gi, "").trim()} MV`;
  const params = new URLSearchParams({ part: "snippet", type: "video", videoEmbeddable: "true", maxResults: "8", q, key });
  const data = await getJson(`https://www.googleapis.com/youtube/v3/search?${params}`);
  if (!data) return "unavailable";
  const items = (data?.items as { id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string } }[]) ?? [];
  let best: { hit: Hit; s: number } | null = null;
  for (const it of items) {
    const hit = { videoId: it.id?.videoId ?? "", title: decode(it.snippet?.title ?? ""), channelTitle: it.snippet?.channelTitle ?? "" };
    if (!hit.videoId) continue;
    const score = scoreVideo(hit, { titles: titlesOf(s), artists: artistsOf(s) });
    if (score !== null && (!best || score > best.s)) best = { hit, s: score };
  }
  return best ? { id: best.hit.videoId, channel: best.hit.channelTitle } : null;
}

const decode = (s: string) => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

/** Which stored videos still exist and can still be embedded (1 quota unit per 50 videos). */
async function stillEmbeddable(ids: string[], key: string): Promise<Set<string> | null> {
  const ok = new Set<string>();
  for (let i = 0; i < ids.length; i += 50) {
    const params = new URLSearchParams({ part: "status", id: ids.slice(i, i + 50).join(","), key });
    const data = await getJson(`https://www.googleapis.com/youtube/v3/videos?${params}`);
    if (!data) return null; // could not check: keep what we have
    for (const v of (data.items as { id: string; status?: { embeddable?: boolean; privacyStatus?: string } }[]) ?? []) {
      if (v.status?.embeddable !== false && v.status?.privacyStatus !== "private") ok.add(v.id);
    }
  }
  return ok;
}

// ---------- Spotify ----------

let spotifyToken: { value: string; until: number } | null = null;

async function spotifyAuth(): Promise<string | null> {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (spotifyToken && spotifyToken.until > Date.now()) return spotifyToken.value;
  const data = await getJson("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}` },
    body: "grant_type=client_credentials",
  });
  const token = data?.access_token as string | undefined;
  if (!token) return null;
  spotifyToken = { value: token, until: Date.now() + (Number(data?.expires_in ?? 3600) - 60) * 1000 };
  return token;
}

type SpotifyTrack = { id: string; name: string; artists: { name: string }[] };

/** Picks the track whose artist and title match the chart line. */
export function pickTrack(tracks: SpotifyTrack[], s: SongForLookup): string | null {
  const artists = artistsOf(s).map(norm);
  const titles = titlesOf(s).map((t) => norm(t.replace(/\((feat|prod|narr|with)\.?[^)]*\)/gi, "")));
  for (const t of tracks) {
    const artistOk = t.artists.some((a) => artists.includes(norm(a.name)) || artists.some((x) => x.length >= 3 && norm(a.name).includes(x)));
    const name = norm(t.name.replace(/\((feat|prod|narr|with)\.?[^)]*\)/gi, "").replace(/\s-\s.*$/, ""));
    const titleOk = titles.some((x) => x && (name === x || name.startsWith(x) || x.startsWith(name)));
    if (artistOk && titleOk) return t.id;
  }
  return null;
}

export async function findSpotify(s: SongForLookup): Promise<string | null> {
  const token = await spotifyAuth();
  if (!token) return null;
  const main = artistsOf(s).find((a) => !/[가-힣]/.test(a)) ?? s.artist;
  for (const title of [s.title, s.title_latin].filter(Boolean) as string[]) {
    const q = `${title.replace(/\((feat|prod|narr|with)\.?[^)]*\)/gi, "").trim()} ${main}`;
    const params = new URLSearchParams({ q, type: "track", market: "KR", limit: "10" });
    const data = await getJson(`https://api.spotify.com/v1/search?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    const id = pickTrack(((data?.tracks as { items?: SpotifyTrack[] })?.items ?? []) as SpotifyTrack[], s);
    if (id) return id;
  }
  return null;
}

// ---------- The daily pass ----------

type LinkRow = SongForLookup & { youtube_id: string | null; spotify_id: string | null; links_checked_at: string | null; youtube_checked_at: string | null };

/** Finds listening links for this week's songs that have none yet, and re-checks videos older than 30 days. */
export async function refreshListenLinks(songIds: string[]): Promise<{ youtube: number; spotify: number; rechecked: number; searched: number }> {
  const out = { youtube: 0, spotify: 0, rechecked: 0, searched: 0 };
  if (!songIds.length) return out;
  const key = process.env.YOUTUBE_API_KEY;
  const { data } = await db()
    .from("chart_songs")
    .select("id, title, artist, title_latin, artist_latin, youtube_id, spotify_id, links_checked_at, youtube_checked_at")
    .in("id", songIds);
  const rows = (data ?? []) as LinkRow[];
  const order = new Map(songIds.map((id, i) => [id, i]));
  rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)); // highest in the chart first
  const now = new Date();
  const weekAgo = now.getTime() - 7 * 86_400_000;

  // Songs never looked up, or looked up over a week ago without finding everything.
  const todo = rows.filter(
    (r) => !r.links_checked_at || ((!r.youtube_id || !r.spotify_id) && new Date(r.links_checked_at).getTime() < weekAgo),
  );
  let searches = 0;
  for (const r of todo) {
    // Out of YouTube searches for today: the rest wait for tomorrow's run, untouched.
    if (key && !r.youtube_id && searches >= SEARCHES_PER_RUN) break;
    const patch: Record<string, string | null> = { links_checked_at: now.toISOString() };
    if (key && !r.youtube_id) {
      searches++;
      const yt = await findYouTube(r, key);
      // YouTube did not answer (usually the daily quota): stop and try these songs again tomorrow.
      if (yt === "unavailable") break;
      if (yt) {
        patch.youtube_id = yt.id;
        patch.youtube_channel = yt.channel;
        patch.youtube_checked_at = now.toISOString();
        out.youtube++;
      }
    }
    if (!r.spotify_id) {
      const sp = await findSpotify(r);
      if (sp) {
        patch.spotify_id = sp;
        out.spotify++;
      }
    }
    await db().from("chart_songs").update(patch).eq("id", r.id);
  }
  out.searched = searches;

  // Videos stored over 30 days ago: confirm they still exist and can be embedded, else forget them.
  if (key) {
    const stale = rows.filter((r) => r.youtube_id && (!r.youtube_checked_at || now.getTime() - new Date(r.youtube_checked_at).getTime() > RECHECK_DAYS * 86_400_000));
    if (stale.length) {
      const ok = await stillEmbeddable(stale.map((r) => r.youtube_id!), key);
      if (ok) {
        for (const r of stale) {
          const keep = ok.has(r.youtube_id!);
          await db()
            .from("chart_songs")
            .update(keep ? { youtube_checked_at: now.toISOString() } : { youtube_id: null, youtube_channel: null, youtube_checked_at: null, links_checked_at: null })
            .eq("id", r.id);
          out.rechecked++;
        }
      }
    }
  }
  return out;
}
