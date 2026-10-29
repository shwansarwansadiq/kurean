import { describe, expect, it } from "vitest";
import {
  needsSecondSource,
  primaryReport,
  relatedCandidates,
  significantTokens,
  totalSourceChars,
  type Report,
} from "../src/lib/cluster";
import { sameStoryUserMessage, SameStorySchema } from "../src/lib/prompts";

describe("significantTokens", () => {
  it("keeps names and drops filler words", () => {
    const t = significantTokens("Park Bo Gum named ambassador of the 2026 MAMA Awards");
    expect([...t]).toEqual(expect.arrayContaining(["park", "bo", "gum", "ambassador", "2026", "mama", "awards"]));
    expect(t.has("the")).toBe(false);
    expect(t.has("named")).toBe(true);
  });
  it("ignores possessive s", () => {
    expect(significantTokens("ILLIT's Wonhee").has("illit")).toBe(true);
  });
});

describe("relatedCandidates", () => {
  const pool = [
    { title: "Park Bo Gum to host 2026 MAMA Awards for the eighth time" },
    { title: "IU announces world tour dates" },
    { title: "Park Seo Joon cast in new drama" },
    { title: "MAMA Awards reveal 2026 venue" },
  ];
  it("finds headlines sharing at least two meaningful words, best first", () => {
    const found = relatedCandidates("Park Bo Gum named ambassador and storyteller of 2026 MAMA Awards", pool);
    expect(found.map((c) => c.item.title)).toEqual([
      "Park Bo Gum to host 2026 MAMA Awards for the eighth time",
      "MAMA Awards reveal 2026 venue",
    ]);
  });
  it("returns nothing for unrelated news", () => {
    expect(relatedCandidates("BLACKPINK Lisa solo comeback", pool)).toEqual([]);
  });
});

const r = (source: string, trust: number, summary: string | null): Report => ({
  id: source,
  source,
  trust,
  url: `https://${source}.com`,
  title: "t",
  summary,
});

describe("combining reports", () => {
  it("credits the most trusted, most detailed report first", () => {
    expect(primaryReport([r("allkpop", 1, "long ".repeat(50)), r("SBS Star", 3, "short")]).source).toBe("SBS Star");
    expect(primaryReport([r("A", 3, "short"), r("B", 3, "much longer text")]).source).toBe("B");
  });
  it("adds up source text across reports", () => {
    expect(totalSourceChars([r("a", 1, null), r("b", 3, "x".repeat(130))])).toBe(130);
  });
});

describe("needsSecondSource", () => {
  it("is never needed for ordinary news", () => {
    expect(needsSecondSource(false, [r("allkpop", 1, null)])).toBe(false);
  });
  it("flags a sensitive story from one low-trust source", () => {
    expect(needsSecondSource(true, [r("allkpop", 1, "x")])).toBe(true);
  });
  it("is satisfied by a second source or a top-trust source", () => {
    expect(needsSecondSource(true, [r("allkpop", 1, "x"), r("Soompi", 2, "y")])).toBe(false);
    expect(needsSecondSource(true, [r("Yonhap News", 3, "x")])).toBe(false);
  });
});

describe("same-story check", () => {
  it("numbers candidates with their sources", () => {
    const msg = sameStoryUserMessage({ title: "Target", summary: null }, [{ title: "C", summary: "d", source: "SBS Star" }]);
    expect(msg).toContain("[0] (SBS Star) C\n    d");
  });
  it("validates the model's answer", () => {
    expect(SameStorySchema.safeParse({ same: [0, 2] }).success).toBe(true);
    expect(SameStorySchema.safeParse({ same: ["0"] }).success).toBe(false);
  });
});
