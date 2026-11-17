import { describe, expect, it } from "vitest";
import { SORANI_GRAMMAR, liveSystem, updateSystem, writeSystem } from "../src/lib/prompts";

describe("Sorani grammar rules in the writer prompts", () => {
  it("every Sorani-writing prompt carries the grammar block", () => {
    for (const p of [writeSystem([]), updateSystem([]), liveSystem([])]) expect(p).toContain(SORANI_GRAMMAR);
  });
  it("covers the key rules", () => {
    for (const s of ["بڵاو دەکرێتەوە", "گۆرانییەکە", "سێ ئەندام", "ڕایگەیاند"]) expect(SORANI_GRAMMAR).toContain(s);
  });
});
