import { describe, expect, it } from "vitest";
import { ogImageFromHtml } from "../src/lib/photo";

describe("ogImageFromHtml", () => {
  it("reads og:image in either attribute order", () => {
    expect(ogImageFromHtml('<meta content="https://a.com/p.jpg?x=1&amp;y=2" property="og:image">')).toBe("https://a.com/p.jpg?x=1&y=2");
  });
  it("falls back to twitter:image", () => {
    expect(ogImageFromHtml('<meta name="twitter:image" content="https://a.com/t.jpg">')).toBe("https://a.com/t.jpg");
  });
  it("ignores relative or missing images", () => {
    expect(ogImageFromHtml('<meta property="og:image" content="/p.jpg">')).toBeNull();
  });
});

import { articleImages, largestFromSrcset } from "../src/lib/photo";

describe("articleImages", () => {
  const html = `<header><img src="/logo.png"></header>
    <article><p>x</p>
      <img src="/img/a.jpg" width="1200">
      <img src="/img/tiny.jpg" width="40">
      <img data-src="https://cdn.site.com/b.jpg">
      <img srcset="/c-400.jpg 400w, /c-1600.jpg 1600w" src="/c-400.jpg">
      <img src="/icons/share.svg">
      <img src="/img/a.jpg">
    </article>`;
  it("finds body photos, skips logos, icons, small and duplicate images", () => {
    expect(articleImages(html, "https://site.com/news/1")).toEqual([
      "https://site.com/img/a.jpg",
      "https://cdn.site.com/b.jpg",
      "https://site.com/c-1600.jpg",
    ]);
  });
  it("picks the largest srcset entry", () => {
    expect(largestFromSrcset("a.jpg 1x, b.jpg 2x")).toBe("b.jpg");
  });
});
