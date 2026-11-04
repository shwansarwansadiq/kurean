/**
 * TikTok drafts (Shwan, 4 Nov): each published story's motion video goes to @kurean.news's TikTok inbox as a draft
 * (Content Posting API "upload", scope video.upload). Shwan opens TikTok, adds a trending sound, pastes the caption
 * from /admin/tiktok and posts. No public posting by the API (that needs TikTok's content audit).
 * - Connect once: /api/tiktok/connect → TikTok login → /api/tiktok/callback stores the tokens in `tiktok_auth`.
 *   Access tokens last 24 h and are refreshed with the refresh token (valid 365 days).
 * - TikTok allows at most 5 waiting drafts per 24 h, and 6 requests a minute per token: the 5-minute publish job sends
 *   one draft per run, never more than DRAFTS_PER_DAY in 24 hours, oldest story first.
 * Env: TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET (the KUREAN app on developers.tiktok.com).
 */
import { db } from "./db";
import { readyVideo } from "./video";

const API = "https://open.tiktokapis.com/v2";
export const REDIRECT_URI = "https://kurean.news/api/tiktok/callback";
export const SCOPES = "user.info.basic,video.upload";
export const DRAFTS_PER_DAY = 5;
/** Stories published longer ago than this are not sent (old news). */
const MAX_AGE_MS = 2 * 86_400_000;

export class TikTokError extends Error {}

export const tiktokConfigured = () => !!(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET);

export function authorizeUrl(state: string): string {
  const p = new URLSearchParams({ client_key: process.env.TIKTOK_CLIENT_KEY ?? "", scope: SCOPES, response_type: "code", redirect_uri: REDIRECT_URI, state });
  return `https://www.tiktok.com/v2/auth/authorize/?${p}`;
}

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_expires_in?: number;
  open_id?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${API}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
    body: new URLSearchParams({ client_key: process.env.TIKTOK_CLIENT_KEY ?? "", client_secret: process.env.TIKTOK_CLIENT_SECRET ?? "", ...params }),
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || json.error || !json.access_token) throw new TikTokError(json.error_description || json.error || `TikTok ${res.status}`);
  return json;
}

async function saveTokens(t: TokenResponse) {
  const now = Date.now();
  const { error } = await db()
    .from("tiktok_auth")
    .upsert({
      id: 1,
      open_id: t.open_id,
      scope: t.scope,
      access_token: t.access_token,
      access_expires_at: new Date(now + (t.expires_in ?? 86_400) * 1000).toISOString(),
      refresh_token: t.refresh_token,
      refresh_expires_at: new Date(now + (t.refresh_expires_in ?? 31_536_000) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    });
  if (error) throw error;
}

/** After TikTok's login page: trade the one-time code for tokens and keep them. */
export async function connect(code: string): Promise<void> {
  const t = await tokenRequest({ code, grant_type: "authorization_code", redirect_uri: REDIRECT_URI });
  if (!t.scope?.includes("video.upload")) throw new TikTokError("TikTok did not grant video.upload");
  await saveTokens(t);
}

export type TikTokStatus = { connected: boolean; scope?: string; refreshExpires?: string };

export async function tiktokStatus(): Promise<TikTokStatus> {
  const { data } = await db().from("tiktok_auth").select("scope, refresh_expires_at").eq("id", 1).maybeSingle();
  if (!data?.refresh_expires_at || new Date(data.refresh_expires_at).getTime() < Date.now()) return { connected: false };
  return { connected: true, scope: data.scope ?? undefined, refreshExpires: data.refresh_expires_at };
}

/** A valid access token, refreshed when it has less than 10 minutes left. */
async function accessToken(): Promise<string> {
  const { data } = await db().from("tiktok_auth").select("access_token, access_expires_at, refresh_token, refresh_expires_at").eq("id", 1).maybeSingle();
  if (!data?.refresh_token) throw new TikTokError("TikTok is not connected");
  if (data.access_token && new Date(data.access_expires_at).getTime() - Date.now() > 10 * 60_000) return data.access_token;
  if (new Date(data.refresh_expires_at).getTime() < Date.now()) throw new TikTokError("The TikTok connection expired: connect again in /admin/tiktok");
  const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: data.refresh_token });
  await saveTokens(t);
  return t.access_token!;
}

type ApiResponse<T> = { data?: T; error?: { code?: string; message?: string } };

async function api<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const json = (await res.json().catch(() => ({}))) as ApiResponse<T>;
  if (!res.ok || (json.error?.code && json.error.code !== "ok")) throw new TikTokError(`${json.error?.code ?? res.status}: ${json.error?.message ?? ""}`.trim());
  return json.data as T;
}

/**
 * Sends one video to the TikTok inbox as a draft. The file is uploaded from here (FILE_UPLOAD), so no domain has to be
 * verified with TikTok. Our videos are well under 64 MB: one chunk (TikTok takes a single chunk up to 64 MB).
 */
export async function uploadDraft(videoUrl: string): Promise<string> {
  const file = await fetch(videoUrl, { signal: AbortSignal.timeout(60_000) });
  if (!file.ok) throw new TikTokError(`video download ${file.status}`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length > 64 * 1024 * 1024) throw new TikTokError("video is over 64 MB");
  const init = await api<{ publish_id: string; upload_url: string }>("/post/publish/inbox/video/init/", {
    source_info: { source: "FILE_UPLOAD", video_size: bytes.length, chunk_size: bytes.length, total_chunk_count: 1 },
  });
  const put = await fetch(init.upload_url, {
    method: "PUT",
    headers: { "Content-Type": "video/mp4", "Content-Length": String(bytes.length), "Content-Range": `bytes 0-${bytes.length - 1}/${bytes.length}` },
    body: bytes,
    signal: AbortSignal.timeout(120_000),
  });
  if (!put.ok) throw new TikTokError(`upload ${put.status} ${(await put.text()).slice(0, 120)}`);
  return init.publish_id;
}

/** Where a sent draft is now (e.g. SEND_TO_USER_INBOX, PUBLISH_COMPLETE, FAILED). */
export async function draftStatus(publishId: string): Promise<string> {
  const d = await api<{ status?: string; fail_reason?: string }>("/post/publish/status/fetch/", { publish_id: publishId });
  return [d.status, d.fail_reason].filter(Boolean).join(" ");
}

/**
 * The publish job's TikTok pass: one draft per run for a story published to TikTok whose video is ready,
 * while fewer than DRAFTS_PER_DAY were sent in the last 24 hours.
 */
export async function sendTikTokDrafts(now = new Date()): Promise<number | null> {
  if (!tiktokConfigured()) return null;
  const since = new Date(now.getTime() - 86_400_000).toISOString();
  const { count } = await db().from("stories").select("id", { count: "exact", head: true }).gte("tiktok_sent_at", since);
  if ((count ?? 0) >= DRAFTS_PER_DAY) return null;
  const { data } = await db()
    .from("stories")
    .select("id, published_at, tiktok_result")
    .eq("status", "published")
    .contains("platforms", ["tiktok"])
    .is("tiktok_sent_at", null)
    .eq("tiktok_done", false)
    .or(`tiktok_next_try.is.null,tiktok_next_try.lt.${now.toISOString()}`)
    .order("published_at", { ascending: true })
    .limit(40);
  // Recent stories only (old news isn't worth a draft), unless Shwan asked for this one in /admin/tiktok.
  const recent = (s: { published_at: string | null; tiktok_result: string | null }) =>
    s.tiktok_result === "queued" || (!!s.published_at && now.getTime() - new Date(s.published_at).getTime() < MAX_AGE_MS);
  for (const s of ((data ?? []) as { id: number; published_at: string | null; tiktok_result: string | null }[]).filter(recent)) {
    const video = await readyVideo(s.id);
    if (!video) continue;
    // Claim it first, so two runs never send the same draft.
    const { data: claimed } = await db().from("stories").update({ tiktok_sent_at: now.toISOString(), tiktok_result: "sending" }).eq("id", s.id).is("tiktok_sent_at", null).select("id");
    if (!claimed?.length) continue;
    try {
      const id = await uploadDraft(video);
      await db().from("stories").update({ tiktok_publish_id: id, tiktok_result: "sent" }).eq("id", s.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // TikTok's "too many waiting drafts" or rate limit: try again in an hour instead of counting it as sent.
      const retry = /spam_risk|rate_limit/.test(msg);
      await db()
        .from("stories")
        .update(retry ? { tiktok_sent_at: null, tiktok_next_try: new Date(now.getTime() + 3600_000).toISOString(), tiktok_result: `waiting: ${msg}`.slice(0, 300) } : { tiktok_result: msg.slice(0, 300) })
        .eq("id", s.id);
    }
    return s.id;
  }
  return null;
}
