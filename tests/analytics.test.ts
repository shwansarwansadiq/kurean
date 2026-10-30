import { describe, expect, it } from "vitest";
import { change, compact, duration, exact, money, pct, ratio } from "../src/lib/numbers";
import { isBot, parseUA, trafficSource } from "../src/lib/ua";

describe("number formatting", () => {
  it("compacts large numbers and keeps small ones exact", () => {
    expect(compact(12431)).toBe("12.4K");
    expect(compact(1_200_000)).toBe("1.2M");
    expect(compact(3000)).toBe("3K");
    expect(compact(999)).toBe("999");
    expect(exact(12431)).toBe("12,431");
  });
  it("switches to Kurdish digits", () => {
    expect(exact(12431, "kurdish")).toBe("١٢٬٤٣١");
    expect(pct(42.56, "kurdish")).toBe("٤٢٫٦%");
  });
  it("formats percent, duration and money", () => {
    expect(pct(33.333)).toBe("33.3%");
    expect(duration(65_000)).toBe("1:05");
    expect(money(1234.5, "USD")).toBe("$1,234.5");
    expect(money(1500000, "IQD")).toBe("1,500,000 IQD");
  });
  it("never divides by zero and shows a dash for missing data", () => {
    expect(ratio(5, 0)).toBeNull();
    expect(change(10, 0)).toBeNull();
    expect(change(15, 10)).toBe(50);
    expect(pct(null)).toBe("—");
    expect(duration(undefined)).toBe("—");
    expect(compact(Number.NaN)).toBe("—");
  });
});

describe("visitor details", () => {
  const iphoneIG = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 300.0";
  it("reads device, OS and in-app browser", () => {
    expect(parseUA(iphoneIG)).toEqual({ device: "mobile", os: "iOS", browser: "Instagram app" });
    expect(parseUA("Mozilla/5.0 (Windows NT 10.0) AppleWebKit Chrome/120 Safari/537").device).toBe("desktop");
  });
  it("filters bots", () => {
    expect(isBot("Googlebot/2.1")).toBe(true);
    expect(isBot("facebookexternalhit/1.1")).toBe(true);
    expect(isBot(iphoneIG)).toBe(false);
    expect(isBot("")).toBe(true);
  });
  it("classifies traffic sources", () => {
    const base = { ua: "Mozilla Chrome", ownHost: "kurean.news" };
    expect(trafficSource({ ...base, referrerHost: "l.instagram.com" })).toBe("instagram");
    expect(trafficSource({ ...base, referrerHost: "www.google.com" })).toBe("search");
    expect(trafficSource({ ...base, referrerHost: "kurean.news" })).toBe("direct");
    expect(trafficSource({ ...base, utmSource: "tiktok" })).toBe("tiktok");
    expect(trafficSource({ ua: iphoneIG, ownHost: "kurean.news" })).toBe("instagram");
  });
});

import { incomplete, parseRange, previousRange } from "../src/lib/analytics";

describe("date ranges (Asia/Baghdad)", () => {
  const now = new Date("2026-10-30T09:00:00Z"); // 12:00 in Baghdad
  it("7 days ends at the end of today in Baghdad", () => {
    const r = parseRange({ r: "7d" }, now);
    expect(r.to.toISOString()).toBe("2026-10-30T21:00:00.000Z");
    expect(r.from.toISOString()).toBe("2026-10-23T21:00:00.000Z");
  });
  it("custom ranges include both days; the previous period has the same length", () => {
    const r = parseRange({ r: "custom", from: "2026-10-01", to: "2026-10-10" }, now);
    expect(r.days).toBe(10);
    const p = previousRange(r);
    expect(p.to.toISOString()).toBe(r.from.toISOString());
    expect(r.from.getTime() - p.from.getTime()).toBe(10 * 86_400_000);
  });
  it("marks ranges with missing or running days as incomplete", () => {
    expect(incomplete(parseRange({ r: "7d" }, now), "2026-01-01T00:00:00Z", now)).toBe(true);
    expect(incomplete(parseRange({ r: "custom", from: "2026-10-01", to: "2026-10-05" }, now), "2026-01-01T00:00:00Z", now)).toBe(false);
    expect(incomplete(parseRange({ r: "custom", from: "2026-10-01", to: "2026-10-05" }, now), "2026-10-03T00:00:00Z", now)).toBe(true);
  });
});
