// Run by .github/workflows/render-videos.yml: asks kurean.news which videos are needed, renders them, uploads them.
// Authentication is GitHub's own OIDC token for this workflow; there is no shared secret.
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { readFile } from "node:fs/promises";
import path from "node:path";

const SITE = process.env.KUREAN_SITE ?? "https://kurean.news";

async function githubToken() {
  const url = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const token = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if (!url || !token) throw new Error("run this inside the GitHub workflow (id-token: write)");
  const res = await fetch(`${url}&audience=${encodeURIComponent(SITE)}`, { headers: { Authorization: `Bearer ${token}` } });
  return (await res.json()).value;
}

// GitHub's token lives only a few minutes, so a fresh one is fetched for every request (a long run outlives it).
const authHeader = async () => ({ Authorization: `Bearer ${await githubToken()}` });
const started = Date.now();
const LIMIT_MS = 22 * 60_000; // the job has 30 minutes; leave room to finish the last video
let serveUrl = null;
let made = 0;
const failed = new Set();

// Keep asking until every waiting video is made: GitHub runs this schedule irregularly, so each run catches up fully.
while (Date.now() - started < LIMIT_MS) {
  const res = await fetch(`${SITE}/api/video/jobs`, { headers: await authHeader() });
  if (!res.ok) {
    console.error(`jobs: HTTP ${res.status}; stopping, the next run carries on`);
    break;
  }
  const jobs = (await res.json()).jobs.filter((j) => !failed.has(`${j.target ?? "story"}-${j.id}-${j.hash}`));
  if (!jobs.length) break;
  console.log(`${jobs.length} video(s) in this batch`);
  serveUrl ??= await bundle({ entryPoint: path.resolve("src/index.ts") });
  for (const job of jobs) {
    if (Date.now() - started > LIMIT_MS) break;
    const t0 = Date.now();
    const key = `${job.target ?? "story"}-${job.id}-${job.hash}`;
    try {
      const composition = await selectComposition({ serveUrl, id: job.composition, inputProps: job.props });
      const out = path.resolve(`out/${job.target ?? "story"}-${job.id}.mp4`);
      await renderMedia({ composition, serveUrl, codec: "h264", outputLocation: out, inputProps: job.props, crf: 20, x264Preset: "medium" });
      const put = await fetch(job.upload.signedUrl, { method: "PUT", headers: { "Content-Type": "video/mp4", "x-upsert": "true" }, body: await readFile(out) });
      if (!put.ok) throw new Error(`upload: HTTP ${put.status} ${await put.text()}`);
      const done = await fetch(`${SITE}/api/video/done`, { method: "POST", headers: { ...(await authHeader()), "Content-Type": "application/json" }, body: JSON.stringify({ id: job.id, hash: job.hash, path: job.upload.path, target: job.target ?? "story" }) });
      if (!done.ok) throw new Error(`not recorded (HTTP ${done.status})`);
      made++;
      console.log(`${key}: done in ${Math.round((Date.now() - t0) / 1000)} s`);
    } catch (e) {
      failed.add(key); // don't retry it in this run; the next run tries again
      console.error(`${key} failed:`, e);
    }
  }
}
console.log(`made ${made} video(s), ${failed.size} failed, in ${Math.round((Date.now() - started) / 1000)} s`);
