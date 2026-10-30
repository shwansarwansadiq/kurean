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

export type VideoJob = { id: number; composition: "News" | "Chart"; props: Record<string, unknown>; hash: string };

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

const DESIGN_VERSION = "v1"; // bump when the video designs change, to remake recent videos

function withHash(id: number, composition: VideoJob["composition"], props: Record<string, unknown>): VideoJob {
  const hash = createHash("sha256").update(DESIGN_VERSION + JSON.stringify({ composition, props })).digest("hex").slice(0, 16);
  return { id, composition, props, hash };
}

/** Recent pending and published stories whose video is missing or out of date, newest first. */
export async function videoJobs(limit = 3): Promise<(VideoJob & { upload: { path: string; signedUrl: string; token: string } })[]> {
  const since = new Date(Date.now() - 4 * 86_400_000).toISOString();
  const { data, error } = await db()
    .from("stories")
    .select("id, category, card_headline, key_points, image_url, kind, chart_week, chart_top, video_hash")
    .in("status", ["pending", "published"])
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) throw error;
  const jobs = ((data ?? []) as Row[]).map((r) => ({ r, job: videoJob(r) })).filter((x) => x.job && x.job.hash !== x.r.video_hash);
  const out = [];
  for (const { job } of jobs.slice(0, limit)) {
    const path = `video/story-${job!.id}-${job!.hash}.mp4`;
    const { data: up, error: upError } = await db().storage.from(BUCKET).createSignedUploadUrl(path, { upsert: true });
    if (upError || !up) continue;
    out.push({ ...job!, upload: { path, signedUrl: up.signedUrl, token: up.token } });
  }
  return out;
}

/** Records a finished video, if it still matches the story (it may have been edited while rendering). */
export async function videoDone(id: number, hash: string, path: string): Promise<boolean> {
  if (!/^video\/story-\d+-[0-9a-f]{16}\.mp4$/.test(path)) return false;
  const url = db().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const { error } = await db()
    .from("stories")
    .update({ video_url: url, video_hash: hash, video_made_at: new Date().toISOString() })
    .eq("id", id);
  return !error;
}
