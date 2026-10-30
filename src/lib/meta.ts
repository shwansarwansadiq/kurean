/**
 * Posting to the kurean Facebook Page and @kurean.news through the KUREAN Meta app.
 * META_TOKEN is the kurean-publisher system user's token (Kurean business portfolio, Page "Content" only).
 */
const GRAPH = "https://graph.facebook.com/v23.0";
export const KUREAN_PAGE_ID = process.env.META_PAGE_ID ?? "1332232389983250";

export class MetaError extends Error {}

async function graph<T>(path: string, params: Record<string, string>, method: "GET" | "POST" = "GET"): Promise<T> {
  const body = new URLSearchParams(params);
  const url = method === "GET" ? `${GRAPH}/${path}?${body}` : `${GRAPH}/${path}`;
  const res = await fetch(url, {
    method,
    body: method === "POST" ? body : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: { message?: string; code?: number } };
  if (!res.ok || json.error) throw new MetaError(json.error?.message ?? `Meta ${res.status}`);
  return json;
}

export type MetaTargets = { pageId: string; pageName: string; pageToken: string; igId: string | null; igUsername: string | null };

/** The kurean Page's own token and its linked Instagram account. Refuses any other Page. */
export async function metaTargets(): Promise<MetaTargets> {
  const token = process.env.META_TOKEN;
  if (!token) throw new MetaError("META_TOKEN is not set in Vercel");
  const page = await graph<{ id: string; name: string; access_token?: string; instagram_business_account?: { id: string; username?: string } }>(
    KUREAN_PAGE_ID,
    { fields: "id,name,access_token,instagram_business_account{id,username}", access_token: token },
  );
  if (page.id !== KUREAN_PAGE_ID || !page.access_token) throw new MetaError("The token cannot post to the kurean Page");
  return {
    pageId: page.id,
    pageName: page.name,
    pageToken: page.access_token,
    igId: page.instagram_business_account?.id ?? null,
    igUsername: page.instagram_business_account?.username ?? null,
  };
}

export async function facebookFeed(t: MetaTargets, imageUrl: string, caption: string): Promise<string> {
  const r = await graph<{ post_id?: string; id: string }>(`${t.pageId}/photos`, { url: imageUrl, caption, access_token: t.pageToken }, "POST");
  return r.post_id ?? r.id;
}

export async function facebookStory(t: MetaTargets, imageUrl: string): Promise<string> {
  const photo = await graph<{ id: string }>(`${t.pageId}/photos`, { url: imageUrl, published: "false", access_token: t.pageToken }, "POST");
  const r = await graph<{ post_id?: string; id?: string }>(`${t.pageId}/photo_stories`, { photo_id: photo.id, access_token: t.pageToken }, "POST");
  return r.post_id ?? r.id ?? photo.id;
}

async function igPublish(t: MetaTargets, params: Record<string, string>, tries = 20): Promise<string> {
  if (!t.igId) throw new MetaError("No Instagram account is linked to the kurean Page");
  const c = await graph<{ id: string }>(`${t.igId}/media`, { ...params, access_token: t.pageToken }, "POST");
  // Instagram fetches and processes the image; wait until the container is ready.
  for (let i = 0; i < tries; i++) {
    const s = await graph<{ status_code?: string }>(c.id, { fields: "status_code", access_token: t.pageToken });
    if (s.status_code === "FINISHED") break;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new MetaError(`Instagram could not process the file (${s.status_code})`);
    await new Promise((r) => setTimeout(r, 3000));
  }
  const p = await graph<{ id: string }>(`${t.igId}/media_publish`, { creation_id: c.id, access_token: t.pageToken }, "POST");
  return p.id;
}

export const instagramFeed = (t: MetaTargets, imageUrl: string, caption: string) => igPublish(t, { image_url: imageUrl, caption });
export const instagramStory = (t: MetaTargets, imageUrl: string) => igPublish(t, { image_url: imageUrl, media_type: "STORIES" });

/** A 9:16 MP4 (≤60 s, H.264 + AAC) as an Instagram story. Video takes longer to process, so it waits up to ~2 minutes. */
export const instagramVideoStory = (t: MetaTargets, videoUrl: string) => igPublish(t, { video_url: videoUrl, media_type: "STORIES" }, 40);

/** A 9:16 MP4 as a Facebook Page story: start an upload, let Facebook fetch the file, then finish. */
export async function facebookVideoStory(t: MetaTargets, videoUrl: string): Promise<string> {
  const start = await graph<{ video_id: string; upload_url: string }>(`${t.pageId}/video_stories`, { upload_phase: "start", access_token: t.pageToken }, "POST");
  const up = await fetch(start.upload_url, {
    method: "POST",
    headers: { Authorization: `OAuth ${t.pageToken}`, file_url: videoUrl },
    signal: AbortSignal.timeout(120_000),
  });
  if (!up.ok) throw new MetaError(`Facebook could not fetch the video (${up.status})`);
  const done = await graph<{ success?: boolean; post_id?: string }>(
    `${t.pageId}/video_stories`,
    { upload_phase: "finish", video_id: start.video_id, access_token: t.pageToken },
    "POST",
  );
  return done.post_id ?? start.video_id;
}
