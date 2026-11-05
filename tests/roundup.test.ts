import { describe, expect, it } from "vitest";
import { dayLabel, dayOfVideoId, hawlerDay, roundupCaption, roundupVideoId, type RoundupStory } from "../src/lib/roundup";

const s = (id: number, h: string, credit: string | null = null): RoundupStory => ({ id, category: "kpop", card_headline: h, image_url: null, image_credit: credit, published_at: "" });

describe("roundup", () => {
  it("uses the Hawler day", () => {
    expect(hawlerDay(new Date("2026-11-05T21:30:00Z"))).toBe("2026-11-06"); // 00:30 in Hawler
    expect(hawlerDay(new Date("2026-11-06T17:59:00Z"))).toBe("2026-11-06");
  });
  it("writes the date in Sorani", () => {
    expect(dayLabel("2026-11-06")).toBe("هەینی ٦ی تشرینی دووەم");
  });
  it("numbers the headlines and lists each credit once", () => {
    const c = roundupCaption("2026-11-06", [s(1, "یەکەم", "Soompi"), s(2, "دووەم", "Soompi")], "carousel");
    expect(c).toContain("١. یەکەم");
    expect(c).toContain("٢. دووەم");
    expect(c.match(/Soompi/g)).toHaveLength(1);
    expect(c).toContain("kurean.news");
  });
  it("turns a day into a video id and back", () => {
    expect(dayOfVideoId(roundupVideoId("2026-11-06"))).toBe("2026-11-06");
  });
});
