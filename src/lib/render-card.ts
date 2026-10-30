import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { db } from "./db";
import { siteUrl } from "./site";

export const CARD_SIZE = { feed: { width: 1080, height: 1350 }, story: { width: 1080, height: 1920 } } as const;
export type CardFormat = keyof typeof CARD_SIZE;

/**
 * Renders the story's feed and story cards (the same design as the /admin preview) to JPEGs with a headless
 * browser, so Sorani text is shaped correctly, and stores them in the story-images bucket. Returns public URLs.
 */
/** What the headless browser sees on a card page (for /api/meta/check?debug=1). */
export async function debugCard(storyId: number): Promise<unknown> {
  const browser = await puppeteer.launch({ args: chromium.args, executablePath: process.env.CHROME_PATH || (await chromium.executablePath()), headless: true });
  try {
    const page = await browser.newPage();
    const logs: string[] = [];
    page.on("console", (m) => logs.push(m.text().slice(0, 200)));
    page.on("requestfailed", (r) => logs.push(`failed ${r.url().slice(0, 100)} ${r.failure()?.errorText}`));
    await page.setViewport({ width: 1080, height: 1350 });
    const res = await page.goto(`${siteUrl()}/card/${storyId}?f=feed`, { waitUntil: "networkidle0", timeout: 45_000 });
    const info = await page.evaluate(() => {
      const c = document.querySelector("#card");
      const r = c?.getBoundingClientRect();
      return {
        url: location.href,
        title: document.title,
        card: r ? [r.x, r.y, r.width, r.height] : null,
        imgs: [...document.images].map((i) => [i.naturalWidth, i.complete]),
        fonts: document.fonts.status,
        sheets: document.styleSheets.length,
        text: document.body.innerText.slice(0, 200),
        scPhoto: c ? getComputedStyle(c.querySelector(".sc-photo")!).position : null,
      };
    });
    return { status: res?.status(), info, logs: logs.slice(0, 10), version: await browser.version() };
  } finally {
    await browser.close();
  }
}

export async function renderCards(storyId: number, formats: CardFormat[] = ["feed", "story"]): Promise<Record<CardFormat, string>> {
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: process.env.CHROME_PATH || (await chromium.executablePath()),
    headless: true,
  });
  const out = {} as Record<CardFormat, string>;
  try {
    for (const f of formats) {
      const page = await browser.newPage();
      await page.setViewport({ ...CARD_SIZE[f], deviceScaleFactor: 1 });
      await page.goto(`${siteUrl()}/card/${storyId}?f=${f}`, { waitUntil: "networkidle0", timeout: 45_000 });
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
      });
      if (!(await page.$("#card"))) throw new Error(`card ${storyId} ${f} did not render`);
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const jpg = (await page.screenshot({ type: "jpeg", quality: 92, clip: { x: 0, y: 0, ...CARD_SIZE[f] } })) as Uint8Array;
      const path = `cards/story-${storyId}-${f}-${Date.now().toString(36)}.jpg`;
      const { error } = await db().storage.from("story-images").upload(path, jpg, { contentType: "image/jpeg", upsert: true });
      if (error) throw error;
      out[f] = db().storage.from("story-images").getPublicUrl(path).data.publicUrl;
      await page.close();
    }
  } finally {
    await browser.close();
  }
  return out;
}
