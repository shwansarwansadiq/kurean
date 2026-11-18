/**
 * Storage clean-up (Shwan, 19 Nov: Supabase free plan went over its 1 GB of storage). Every time a story changes its
 * video is made again under a new name, and the old versions stayed in storage. This removes video files that no
 * story, round-up or scenery item points to any more. Files made in the last 6 hours are kept (a video being rendered
 * is uploaded before it is recorded). Current videos are never touched. Runs daily with the chart job.
 */
import { db } from "./db";

const BUCKET = "story-images";
const KEEP_RECENT_MS = 6 * 3600_000;

type Obj = { name: string; created_at: string | null; metadata: { size?: number } | null };

async function listVideos(): Promise<Obj[]> {
  const all: Obj[] = [];
  for (let offset = 0; offset < 20_000; offset += 1000) {
    const { data, error } = await db().storage.from(BUCKET).list("video", { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw error;
    all.push(...((data ?? []) as Obj[]));
    if (!data || data.length < 1000) break;
  }
  return all;
}

async function videosInUse(): Promise<Set<string>> {
  const [stories, roundups, scenery] = await Promise.all([
    db().from("stories").select("video_url").not("video_url", "is", null),
    db().from("roundups").select("video_url").not("video_url", "is", null),
    db().from("scenery").select("video_url").not("video_url", "is", null),
  ]);
  for (const r of [stories, roundups, scenery]) if (r.error) throw r.error;
  const names = new Set<string>();
  for (const r of [stories, roundups, scenery])
    for (const row of (r.data ?? []) as { video_url: string }[]) {
      const m = row.video_url.match(/\/video\/([^/?#]+\.mp4)/);
      if (m) names.add(m[1]);
    }
  return names;
}

/** Pure: which listed files can go. */
export function unusedVideos(files: Obj[], inUse: Set<string>, now = Date.now()): Obj[] {
  return files.filter(
    (f) => f.name.endsWith(".mp4") && !inUse.has(f.name) && (!f.created_at || now - new Date(f.created_at).getTime() > KEEP_RECENT_MS),
  );
}

export async function removeUnusedVideos(): Promise<{ removed: number; mb: number; kept: number }> {
  const [files, inUse] = await Promise.all([listVideos(), videosInUse()]);
  const gone = unusedVideos(files, inUse);
  for (let i = 0; i < gone.length; i += 100) {
    const { error } = await db().storage.from(BUCKET).remove(gone.slice(i, i + 100).map((f) => `video/${f.name}`));
    if (error) throw error;
  }
  const bytes = gone.reduce((s, f) => s + (f.metadata?.size ?? 0), 0);
  return { removed: gone.length, mb: Math.round(bytes / 1048576), kept: files.length - gone.length };
}
