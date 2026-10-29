import { describe, expect, it } from "vitest";
import { ScoreSchema, StorySchema, glossaryBlock, scoreUserMessage, writeSystem, writeUserMessage } from "../src/lib/prompts";
import { hasEnoughSourceText, isForcedToolUnsupported, parseScoreReason } from "../src/lib/writer";

describe("glossary in the writer prompt", () => {
  it("lists every term with its Sorani spelling", () => {
    const sys = writeSystem([
      { english: "comeback", sorani: "گەڕانەوە", note: null },
      { english: "fandom", sorani: "کۆمەڵەی هەواداران", note: "casual: فاندۆم" },
    ]);
    expect(sys).toContain("- comeback → گەڕانەوە");
    expect(sys).toContain("- fandom → کۆمەڵەی هەواداران (casual: فاندۆم)");
  });
  it("handles an empty glossary", () => {
    expect(glossaryBlock([])).toBe("(no glossary terms yet)");
  });
});

describe("messages", () => {
  it("numbers headlines for scoring", () => {
    const msg = scoreUserMessage([
      { title: "A", summary: null, source: "Soompi" },
      { title: "B", summary: "details", source: "Yonhap News" },
    ]);
    expect(msg).toBe("[0] (Soompi) A\n[1] (Yonhap News) B\n    details");
  });
  it("combines several reports and lists every source for the captions", () => {
    const msg = writeUserMessage({
      category: "kpop",
      sensitive: true,
      reports: [
        { source: "SBS Star", trust: 3, url: "https://sbsstar.net/a", title: "T1", summary: "Full details." },
        { source: "allkpop", trust: 1, url: "https://allkpop.com/b", title: "T2", summary: null },
      ],
    });
    expect(msg).toContain("SENSITIVE");
    expect(msg).toContain("Source names for the captions: SBS Star، allkpop");
    expect(msg).toContain("Report 2 — allkpop (trust 1/3)");
    expect(msg).toContain("Text: (headline only)");
    expect(msg).toContain("کەی-پۆپ");
  });
});

describe("output validation", () => {
  it("accepts a valid score list and rejects bad categories", () => {
    expect(ScoreSchema.safeParse({ items: [{ index: 0, score: 9, category: "kpop", sensitive: false, reason: "x" }] }).success).toBe(true);
    expect(ScoreSchema.safeParse({ items: [{ index: 0, score: 9, category: "sports", sensitive: false, reason: "x" }] }).success).toBe(false);
  });
  it("requires exactly three key points", () => {
    const base = {
      headline: "سەردێڕێکی تاقیکاری",
      card_headline: "سەردێڕی کورت",
      body: "ب".repeat(250),
      caption_instagram: "کەپشنێکی تاقیکاری",
      caption_facebook: "کەپشنێکی تاقیکاری",
      caption_tiktok: "کەپشن",
      hashtags: ["#kpop", "#کەی_پۆپ", "#kurean"],
    };
    expect(StorySchema.safeParse({ ...base, key_points: ["یەک", "دوو", "سێ"] }).success).toBe(true);
    expect(StorySchema.safeParse({ ...base, key_points: ["یەک", "دوو"] }).success).toBe(false);
  });
});

describe("parseScoreReason", () => {
  it("reads category and sensitivity back", () => {
    expect(parseScoreReason("kdrama_film · sensitive · dating rumour")).toEqual({ category: "kdrama_film", sensitive: true });
    expect(parseScoreReason("kpop · big comeback")).toEqual({ category: "kpop", sensitive: false });
    expect(parseScoreReason("weird")).toEqual({ category: "korea_news", sensitive: false });
  });
});

describe("isForcedToolUnsupported", () => {
  it("recognises the forced tool choice error", () => {
    expect(isForcedToolUnsupported(new Error('400 {"message":"tool_choice: type \\"tool\\" and \\"any\\" are not supported for this model."}'))).toBe(true);
    expect(isForcedToolUnsupported(new Error("credit balance is too low"))).toBe(false);
  });
});

describe("hasEnoughSourceText", () => {
  it("skips headline-only items", () => {
    expect(hasEnoughSourceText(null)).toBe(false);
    expect(hasEnoughSourceText("Short teaser.")).toBe(false);
    expect(hasEnoughSourceText("x".repeat(150))).toBe(true);
  });
});

describe("writer prompt", () => {
  it("forbids talking about the writing process", () => {
    expect(writeSystem([])).toContain("Never write about the writing itself");
  });
});
