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

const auth = { Authorization: `Bearer ${await githubToken()}` };
const res = await fetch(`${SITE}/api/video/jobs`, { headers: auth });
if (!res.ok) throw new Error(`jobs: HTTP ${res.status}`);
const { jobs } = await res.json();
console.log(`${jobs.length} video(s) to make`);
if (!jobs.length) process.exit(0);

const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
for (const job of jobs) {
  const started = Date.now();
  try {
    const composition = await selectComposition({ serveUrl, id: job.composition, inputProps: job.props });
    const out = path.resolve(`out/story-${job.id}.mp4`);
    await renderMedia({ composition, serveUrl, codec: "h264", outputLocation: out, inputProps: job.props, crf: 20, x264Preset: "medium" });
    const put = await fetch(job.upload.signedUrl, { method: "PUT", headers: { "Content-Type": "video/mp4", "x-upsert": "true" }, body: await readFile(out) });
    if (!put.ok) throw new Error(`upload: HTTP ${put.status} ${await put.text()}`);
    const done = await fetch(`${SITE}/api/video/done`, { method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify({ id: job.id, hash: job.hash, path: job.upload.path }) });
    console.log(`story ${job.id}: ${done.ok ? "done" : `not recorded (HTTP ${done.status})`} in ${Math.round((Date.now() - started) / 1000)} s`);
  } catch (e) {
    console.error(`story ${job.id} failed:`, e);
  }
}
