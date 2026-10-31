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

export type VideoJob = { id: number; composition: "News" | "Chart" | "Scenery"; props: Record<string, unknown>; hash: string; target?: "story" | "scenery" };

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
const SCENERY_VERSION = "s1"; // bump when the scenery design or music changes // v2: TikTok safe area // bump when the video designs change, to remake recent videos

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

/** Videos to make: recent stories first, then approved scenery clips, each with a one-time upload address. */
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
    const path = `video/${job.target === "scenery" ? "scenery" : "story"}-${job.id}-${job.hash}.mp4`;
    const { data: up, error: upError } = await db().storage.from(BUCKET).createSignedUploadUrl(path, { upsert: true });
    if (upError || !up) continue;
    out.push({ ...job, upload: { path, signedUrl: up.signedUrl, token: up.token } });
  }
  return out;
}

/** Records a finished video, if it still matches the story or scenery item (it may have changed while rendering). */
export async function videoDone(id: number, hash: string, path: string, target: "story" | "scenery" = "story"): Promise<boolean> {
  const re = target === "scenery" ? /^video\/scenery-\d+-[0-9a-f]{16}\.mp4$/ : /^video\/story-\d+-[0-9a-f]{16}\.mp4$/;
  if (!re.test(path)) return false;
  const url = db().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
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
  const token = process.env.GITHUB_DISPATCH_TOKEN;
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
  return n;
}
