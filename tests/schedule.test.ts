import { describe, expect, it } from "vitest";
import { fromHawlerInput, hawlerMidnight, hawlerTime, nextFreeSlot, spreadEvenly, toHawlerInput } from "../src/lib/schedule";

// 30 Oct 2026, 20:38 in Hawler = 17:38 UTC
const now = new Date("2026-10-30T17:38:00Z");

describe("scheduling (Hawler time)", () => {
  it("counts the day from midnight in Hawler", () => {
    expect(hawlerMidnight(now).toISOString()).toBe("2026-10-29T21:00:00.000Z");
    expect(hawlerMidnight(new Date("2026-10-30T21:30:00Z")).toISOString()).toBe("2026-10-30T21:00:00.000Z");
  });
  it("reads and writes the time picker in Hawler time", () => {
    const d = fromHawlerInput("2026-10-31T14:30")!;
    expect(d.toISOString()).toBe("2026-10-31T11:30:00.000Z");
    expect(toHawlerInput(d)).toBe("2026-10-31T14:30");
    expect(hawlerTime(d)).toBe("14:30");
  });
  it("finds the next free time at least an hour from anything scheduled", () => {
    const first = nextFreeSlot([], now);
    expect(hawlerTime(first)).toBe("20:50"); // now + 10 min, rounded up to 5
    const second = nextFreeSlot([first], now);
    expect(hawlerTime(second)).toBe("21:50");
    // 23:00 is the end of the day's window: the next one is tomorrow morning
    const late = nextFreeSlot([], new Date("2026-10-30T19:55:00Z"));
    expect(toHawlerInput(late)).toBe("2026-10-31T09:00");
  });
  it("spreads stories evenly over what is left of today, then tomorrow", () => {
    const times = spreadEvenly(4, now).map((d) => toHawlerInput(d));
    // 20:50-23:00 holds two an hour apart; the other two go tomorrow 09:00-23:00
    expect(times.slice(0, 2)).toEqual(["2026-10-30T21:20", "2026-10-30T22:25"]);
    expect(times.slice(2)).toEqual(["2026-10-31T12:30", "2026-10-31T19:30"]);
    const morning = spreadEvenly(8, new Date("2026-10-31T04:00:00Z")).map((d) => hawlerTime(d));
    expect(morning).toEqual(["09:50", "11:35", "13:20", "15:05", "16:50", "18:35", "20:20", "22:05"]);
  });
});
