import { describe, expect, it } from "vitest";
import { captions } from "../src/lib/social";

describe("social captions", () => {
  it("adds the clickable link on Facebook and the written link on Instagram", () => {
    const c = captions({ id: 12, caption_facebook: "FB text ", caption_instagram: "IG text" });
    expect(c.facebook).toBe("FB text\n\nhttps://kurean.news/n/12");
    expect(c.instagram).toBe("IG text\n\nهەواڵی تەواو: kurean.news/n/12");
  });
  it("credits the photo at the end of the caption", () => {
    const c = captions({ id: 3, caption_facebook: "FB", caption_instagram: "IG", image_credit: "Korea Herald" });
    expect(c.instagram.endsWith("\n📷 Korea Herald")).toBe(true);
    expect(c.facebook.endsWith("\n📷 Korea Herald")).toBe(true);
  });
});
