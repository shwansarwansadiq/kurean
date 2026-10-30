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
