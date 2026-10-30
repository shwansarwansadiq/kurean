import { describe, expect, it } from "vitest";
import { canonicalUrl, isFresh, normalizeEntry, plainText, urlHash } from "../src/lib/feed";

describe("canonicalUrl", () => {
  it("strips tracking, www, hash and trailing slash", () => {
    expect(canonicalUrl("http://www.Soompi.com/article/123/?utm_source=rss&utm_medium=x&id=5#top")).toBe(
      "https://soompi.com/article/123/?id=5",
    );
  });
  it("gives the same hash for the same story behind different links", () => {
    expect(urlHash("https://www.soompi.com/a/1?utm_source=rss")).toBe(urlHash("https://soompi.com/a/1/"));
  });
});

describe("plainText", () => {
  it("removes tags and entities", () => {
    expect(plainText("<p>BTS &amp; <b>BLACKPINK</b>&nbsp;news</p>")).toBe("BTS & BLACKPINK news");
  });
  it("cuts long text on a word boundary", () => {
    const out = plainText("word ".repeat(400), 50)!;
    expect(out.length).toBeLessThanOrEqual(51);
    expect(out.endsWith("…")).toBe(true);
  });
});

describe("normalizeEntry", () => {
  it("builds a row from a typical RSS item", () => {
    const row = normalizeEntry({
      link: "https://www.soompi.com/article/1/x?utm_source=rss",
      title: "  Group announces <i>comeback</i> ",
      contentSnippet: "The group will return next month.",
      isoDate: "2026-10-29T10:00:00Z",
      enclosure: { url: "https://img.example/x.jpg", type: "image/jpeg" },
    });
    expect(row).toMatchObject({
      url: "https://soompi.com/article/1/x",
      title: "Group announces comeback",
      summary: "The group will return next month.",
      published_at: "2026-10-29T10:00:00.000Z",
      image_url: "https://img.example/x.jpg",
    });
  });
  it("skips items without a link or title", () => {
    expect(normalizeEntry({ title: "No link" })).toBeNull();
    expect(normalizeEntry({ link: "https://a.com/x" })).toBeNull();
  });
  it("uses a URL guid when link is missing", () => {
    expect(normalizeEntry({ guid: "https://a.com/1", title: "T" })?.url).toBe("https://a.com/1");
  });
});

describe("isFresh", () => {
  const now = new Date("2026-10-29T12:00:00Z");
  it("keeps items under 48 hours old and undated items", () => {
    const base = { url: "", url_hash: "", title: "", summary: null, image_url: null };
    expect(isFresh({ ...base, published_at: "2026-10-28T12:00:00Z" }, now)).toBe(true);
    expect(isFresh({ ...base, published_at: "2026-10-25T12:00:00Z" }, now)).toBe(false);
    expect(isFresh({ ...base, published_at: null }, now)).toBe(true);
  });
});

import { firstImageInHtml } from "../src/lib/feed";
describe("firstImageInHtml", () => {
  it("finds the article photo and skips pixels", () => {
    const html = '<img src="https://x.com/pixel.gif" width="1"><p>t</p><img class="a" src="https://cdn.x.com/photo.jpg?w=800&amp;q=1" width="800">';
    expect(firstImageInHtml(html)).toBe("https://cdn.x.com/photo.jpg?w=800&q=1");
  });
  it("returns null without images", () => {
    expect(firstImageInHtml("<p>no photo</p>")).toBeNull();
  });
});
