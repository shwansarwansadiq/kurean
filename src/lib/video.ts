/**
 * Motion videos (9:16 MP4) for TikTok and Reels. The site only says which videos are needed and stores the
 * results; the rendering runs in GitHub Actions (`video/`, `.github/workflows/render-videos.yml`), which proves who
 * it is with GitHub's own OIDC token, so no secret is shared between GitHub and the site.
 */
import { createHash } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { db } from "./db";
import { CATEGORY_META, type CategoryKey } from "./site";

export const REPO = "shwansarwansadiq/kurean";
const ISSUER = "https://token.actions.githubusercontent.com";
const JWKS = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks`));
const BUCKET = "story-images";

/** True only for a token GitHub issued to this repository's video workflow on main. */
export async function isVideoWorker(req: Request, audience = "https://kurean.news"): Promise<boolean> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, JWKS, { issuer: ISSUER, audience });
    return (
      payload.repository === REPO &&
      payload.ref === "refs/heads/main" &&
      typeof payload.workflow_ref === "string" &&
      payload.workflow_ref.startsWith(`${REPO}/.github/workflows/render-videos.yml@`)
    );
  } catch {
    return false;
  }
}

const HEX: Record<CategoryKey, string> = { kpop: "#E8508A", kdrama_film: "#9B7BEA", culture: "#3FA88E", korea_news: "#3A5BD9" };

type Row = {
  id: number;
  category: CategoryKey;
  card_headline: string;
  key_points: string[];
  image_url: string | null;
  kind: string | null;
  chart_week: string | null;
  chart_top: unknown[] | null;
  video_hash: string | null;
};

export type VideoJob = { id: number; composition: "News" | "Chart" | "Scenery" | "Roundup"; props: Record<string, unknown>; hash: string; target?: "story" | "scenery" | "roundup" };

/** What the video shows. When this changes (an edit, a new photo), the video is made again. */
export function videoJob(s: Row): VideoJob | null {
  if (s.kind === "chart") {
    if (!s.chart_top?.length) return null;
    const week = Number(/-(\d+)$/.exec(s.chart_week ?? "")?.[1] ?? 0);
    return withHash(s.id, "Chart", { week, top: s.chart_top });
  }
  return withHash(s.id, "News", {
    headline: s.card_headline,
    points: (s.key_points ?? []).slice(0, 3),
    image: s.image_url,
    label: CATEGORY_META[s.category].label,
    colour: HEX[s.category],
  });
}

const DESIGN_VERSION = "v2";
const SCENERY_VERSION = "s1";
const ROUNDUP_VERSION = "r1"; // bump when the round-up video design changes // bump when the scenery design or music changes // v2: TikTok safe area // bump when the video designs change, to remake recent videos

function withHash(id: number, composition: VideoJob["composition"], props: Record<string, unknown>): VideoJob {
  const hash = createHash("sha256").update(DESIGN_VERSION + JSON.stringify({ composition, props })).digest("hex").slice(0, 16);
  return { id, composition, props, hash };
}

type SceneryRow = { id: number; kind: string; url: string; place_en: string; place_ckb: string; photographer: string; source: string | null; music: string | null; video_hash: string | null };

export function sceneryJob(s: SceneryRow): VideoJob {
  const props = { kind: s.kind, src: s.url, placeCkb: s.place_ckb, placeEn: s.place_en, photographer: s.photographer, source: s.source === "pixabay" ? "Pixabay" : "Pexels", music: s.music ?? "han-river" };
  const hash = createHash("sha256").update(SCENERY_VERSION + JSON.stringify(props)).digest("hex").slice(0, 16);
  return { id: s.id, composition: "Scenery", props, hash, target: "scenery" };
}

/** Today's round-up video (and a frozen one still waiting for its video), if it has stories. */
async function roundupJobs(): Promise<VideoJob[]> {
  const { data } = await db().from("roundups").select("day, story_ids, status, video_hash").in("status", ["collecting", "posting", "video"]);
  const jobs: VideoJob[] = [];
  for (const r of (data ?? []) as { day: string; story_ids: number[]; status: string; video_hash: string | null }[]) {
    const job = await roundupJob(r.day, r.story_ids);
    if (job && job.hash !== r.video_hash) jobs.push(job);
  }
  return jobs;
}

export async function roundupJob(day: string, ids: number[]): Promise<VideoJob | null> {
  const { storiesByIds, roundupVideoProps, roundupVideoId } = await import("./roundup");
  const stories = await storiesByIds(ids);
  if (!stories.length) return null;
  const props = roundupVideoProps(day, stories);
  const hash = createHash("sha256").update(ROUNDUP_VERSION + JSON.stringify(props)).digest("hex").slice(0, 16);
  return { id: roundupVideoId(day), composition: "Roundup", props, hash, target: "roundup" };
}

/** The round-up's video, if it is made for exactly the frozen list. */
export async function readyRoundupVideo(row: { day: string; story_ids: number[]; video_url: string | null; video_hash: string | null }): Promise<string | null> {
  if (!row.video_url) return null;
  const job = await roundupJob(row.day, row.story_ids);
  return job?.hash === row.video_hash ? row.video_url : null;
}

/** Videos to make: recent stories first, then the round-up, then approved scenery clips, each with an upload address. */
export async function videoJobs(limit = 3): Promise<(VideoJob & { upload: { path: string; signedUrl: string; token: string } })[]> {
  const since = new Date(Date.now() - 4 * 86_400_000).toISOString();
  const { data, error } = await db()
    .from("stories")
    .select("id, category, card_headline, key_points, image_url, kind, chart_week, chart_top, video_hash")
    .in("status", ["pending", "approved", "published"])
    // Written in the last 4 days, or edited since (a published story Shwan changes gets a new video).
    .or(`created_at.gte.${since},edited_at.gte.${since}`)
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) throw error;
  const jobs: VideoJob[] = ((data ?? []) as Row[])
    .map((r) => ({ r, job: videoJob(r) }))
    .filter((x) => x.job && x.job.hash !== x.r.video_hash)
    .map((x) => ({ ...x.job!, target: "story" as const }));
  jobs.push(...(await roundupJobs().catch(() => [])));
  if (jobs.length < limit) {
    const { data: sc } = await db()
      .from("scenery")
      .select("id, kind, url, place_en, place_ckb, photographer, source, music, video_hash")
      .eq("status", "approved")
      .order("created_at", { ascending: true })
      .limit(60);
    for (const r of (sc ?? []) as SceneryRow[]) {
      const j = sceneryJob(r);
      if (j.hash !== r.video_hash) jobs.push(j);
    }
  }
  const out = [];
  for (const job of jobs.slice(0, limit)) {
    const path = `video/${job.target ?? "story"}-${job.id}-${job.hash}.mp4`;
    const { data: up, error: upError } = await db().storage.from(BUCKET).createSignedUploadUrl(path, { upsert: true });
    if (upError || !up) continue;
    out.push({ ...job, upload: { path, signedUrl: up.signedUrl, token: up.token } });
  }
  return out;
}

/** Records a finished video, if it still matches the story or scenery item (it may have changed while rendering). */
export async function videoDone(id: number, hash: string, path: string, target: "story" | "scenery" | "roundup" = "story"): Promise<boolean> {
  if (!new RegExp(`^video/${target}-\\d+-[0-9a-f]{16}\\.mp4$`).test(path)) return false;
  const url = db().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  if (target === "roundup") {
    const { dayOfVideoId } = await import("./roundup");
    const { error } = await db().from("roundups").update({ video_url: url, video_hash: hash }).eq("day", dayOfVideoId(id));
    return !error;
  }
  const { error } =
    target === "scenery"
      ? await db().from("scenery").update({ video_url: url, video_hash: hash }).eq("id", id)
      : await db().from("stories").update({ video_url: url, video_hash: hash, video_made_at: new Date().toISOString() }).eq("id", id);
  return !error;
}

/**
 * Starts the video workflow now instead of waiting for GitHub's schedule (which GitHub runs irregularly).
 * Needs GITHUB_DISPATCH_TOKEN: a fine-grained token for this repository only, with "Actions: read and write".
 * Without it, videos still come from the schedule. Never throws: a video is never worth failing a publish for.
 */
export async function kickVideos(): Promise<boolean> {
  return (await dispatchVideos()).ok;
}

/** Same as kickVideos, but says why it did not work (for the cron route's report). */
export async function dispatchVideos(): Promise<{ ok: boolean; status?: number; reason?: string }> {
  const token = process.env.GITHUB_DISPATCH_TOKEN?.trim(); // a pasted value can carry spaces or a line break
  if (!token) return { ok: false, reason: "GITHUB_DISPATCH_TOKEN is not set" };
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/render-videos.yml/dispatches`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      body: JSON.stringify({ ref: "main" }),
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok ? { ok: true, status: res.status } : { ok: false, status: res.status, reason: (await res.text()).slice(0, 200) };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

/** Is any video waiting? (Read-only: no upload addresses are made.) */
export async function videosWaiting(): Promise<number> {
  const since = new Date(Date.now() - 4 * 86_400_000).toISOString();
  const { data } = await db()
    .from("stories")
    .select("id, category, card_headline, key_points, image_url, kind, chart_week, chart_top, video_hash")
    .in("status", ["pending", "approved", "published"])
    .or(`created_at.gte.${since},edited_at.gte.${since}`)
    .limit(60);
  let n = ((data ?? []) as Row[]).filter((r) => videoJob(r) && videoJob(r)!.hash !== r.video_hash).length;
  const { data: sc } = await db().from("scenery").select("id, kind, url, place_en, place_ckb, photographer, source, music, video_hash").eq("status", "approved").limit(100);
  n += ((sc ?? []) as SceneryRow[]).filter((r) => sceneryJob(r).hash !== r.video_hash).length;
  n += (await roundupJobs().catch(() => [])).length;
  return n;
}

/** Is the story's video made and up to date with what the story shows now? Returns its address, or null. */
export async function readyVideo(id: number): Promise<string | null> {
  const { data } = await db()
    .from("stories")
    .select("id, category, card_headline, key_points, image_url, kind, chart_week, chart_top, video_hash, video_url")
    .eq("id", id)
    .maybeSingle();
  const r = data as (Row & { video_url: string | null }) | null;
  if (!r?.video_url) return null;
  return videoJob(r)?.hash === r.video_hash ? r.video_url : null;
}
