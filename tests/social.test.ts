import { describe, expect, it } from "vitest";
import { captions } from "../src/lib/social";

describe("social captions", () => {
  it("adds the clickable link on Facebook and the written link on Instagram", () => {
    const c = captions({ id: 12, caption_facebook: "FB text ", caption_instagram: "IG text" });
    expect(c.facebook).toBe("FB text\n\nhttps://kurean.news/n/12");
    expect(c.instagram).toBe("IG text\n\nهەواڵی تەواو: kurean.news/n/12");
  });
});
