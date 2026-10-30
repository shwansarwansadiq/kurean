import { describe, expect, it } from "vitest";
import { bidiRuns, issueFrom, ku, readingMinutes, soraniDate } from "../src/lib/site";

describe("Sorani formatting", () => {
  it("uses Kurdish digits", () => expect(ku(2026)).toBe("٢٠٢٦"));
  it("writes the date in Kurdistan time", () => {
    expect(soraniDate("2026-10-29T22:30:00Z")).toBe("هەینی ٣٠ی تشرینی یەکەم");
  });
  it("counts issues by Kurdistan day", () => {
    expect(issueFrom(new Date("2026-10-30T08:00:00Z"), new Date("2026-10-30T20:00:00Z"))).toBe(1);
    expect(issueFrom(new Date("2026-10-30T08:00:00Z"), new Date("2026-11-01T08:00:00Z"))).toBe(3);
  });
  it("gives at least one minute of reading", () => expect(readingMinutes("وشە")).toBe(1));
});

describe("bidiRuns", () => {
  it("isolates Latin names with their quotes", () => {
    const runs = bidiRuns("تیزەری درامای «Nine to Six» بڵاوکرایەوە");
    expect(runs.filter((r) => r.latin).map((r) => r.text)).toEqual(["«Nine to Six»"]);
    expect(runs.map((r) => r.text).join("")).toBe("تیزەری درامای «Nine to Six» بڵاوکرایەوە");
  });
  it("keeps plain numbers in the Sorani flow", () => {
    expect(bidiRuns("لە تەمەنی 87 ساڵیدا").every((r) => !r.latin)).toBe(true);
  });
  it("handles names like MAMA 2026 and BTS (بی تی ئێس)", () => {
    expect(bidiRuns("خەڵاتەکانی MAMA 2026 گەورەتر").find((r) => r.latin)?.text).toBe("MAMA 2026");
    expect(bidiRuns("BTS (بی تی ئێس)")[0]).toEqual({ text: "BTS", latin: true });
  });
});
