import { describe, expect, it } from "vitest";
import { allowedSoFar } from "../src/lib/writer";
import { inFastWindow, type KEvent } from "../src/lib/events";
import { RepeatSchema, ScoreSchema, repeatUserMessage } from "../src/lib/prompts";

const hawler = (h: number, m = 0) => new Date(Date.UTC(2026, 10, 17, h - 3, m));

describe("daily limit spread over the day", () => {
  it("allows a small share in the morning and the full limit by 22:00", () => {
    expect(allowedSoFar(hawler(6), 12)).toBe(2); // 15 % floor
    expect(allowedSoFar(hawler(14, 30), 12)).toBe(6);
    expect(allowedSoFar(hawler(22), 12)).toBe(12);
    expect(allowedSoFar(hawler(23, 30), 12)).toBe(12);
  });
});

describe("awards calendar", () => {
  const e = { starts_at: "2026-11-20T09:00:00Z", ends_at: "2026-11-20T13:30:00Z" } as KEvent; // 18:00-22:30 KST
  it("is fast from an hour before until three hours after", () => {
    expect(inFastWindow([e], new Date("2026-11-20T07:59:00Z"))).toBe(false);
    expect(inFastWindow([e], new Date("2026-11-20T08:00:00Z"))).toBe(true);
    expect(inFastWindow([e], new Date("2026-11-20T16:30:00Z"))).toBe(true);
    expect(inFastWindow([e], new Date("2026-11-20T16:31:00Z"))).toBe(false);
  });
});

describe("prompts", () => {
  it("reads scores without the urgent flag as not urgent", () => {
    const out = ScoreSchema.parse({ items: [{ index: 0, score: 8, category: "kpop", sensitive: false, reason: "x" }] });
    expect(out.items[0].urgent).toBe(false);
  });
  it("reads a repeat decision", () => {
    expect(RepeatSchema.parse({ decision: "update", story: 2, reason: "winner" }).story).toBe(2);
    expect(RepeatSchema.parse({ decision: "new" }).story).toBeNull();
  });
  it("marks live stories for the model", () => {
    const m = repeatUserMessage({ title: "IVE wins Daesang", summary: null }, [{ headline: "MAMA", reports: ["MAMA 2026 tonight"], live: true }]);
    expect(m).toContain("[0] (LIVE event story) MAMA");
  });
});
