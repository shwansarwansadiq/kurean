/** Number formatting for the analytics dashboard and reports. Missing data is always "—", never 0 or NaN. */

const KU_DIGITS = "٠١٢٣٤٥٦٧٨٩";
export type Digits = "latin" | "kurdish";
export const MISSING = "—";

const valid = (n: number | null | undefined): n is number => typeof n === "number" && Number.isFinite(n);

export function toDigits(s: string, digits: Digits): string {
  return digits === "kurdish" ? s.replace(/\d/g, (d) => KU_DIGITS[Number(d)]).replace(/\./g, "٫").replace(/,/g, "٬") : s;
}

/** 12,431 */
export function exact(n: number | null | undefined, digits: Digits = "latin"): string {
  if (!valid(n)) return MISSING;
  return toDigits(Math.round(n).toLocaleString("en-US"), digits);
}

/** 12.4K, 1.2M (cards); exact below 1,000. */
export function compact(n: number | null | undefined, digits: Digits = "latin"): string {
  if (!valid(n)) return MISSING;
  const a = Math.abs(n);
  const out =
    a >= 1e6 ? `${trim(n / 1e6)}M` : a >= 1e3 ? `${trim(n / 1e3)}K` : Math.round(n).toLocaleString("en-US");
  return toDigits(out, digits);
}
const trim = (x: number) => (Math.round(x * 10) / 10).toFixed(1).replace(/\.0$/, "");

/** 42.5% (one decimal). */
export function pct(n: number | null | undefined, digits: Digits = "latin"): string {
  if (!valid(n)) return MISSING;
  return toDigits(`${n.toFixed(1)}%`, digits);
}

/** Milliseconds as m:ss (1:05). */
export function duration(ms: number | null | undefined, digits: Digits = "latin"): string {
  if (!valid(ms) || ms < 0) return MISSING;
  const s = Math.round(ms / 1000);
  return toDigits(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`, digits);
}

/** a / b, or null when b is zero or either side is missing. */
export function ratio(a: number | null | undefined, b: number | null | undefined): number | null {
  if (!valid(a) || !valid(b) || b === 0) return null;
  return a / b;
}

/** Change from the previous period in percent; null when there is nothing to compare with. */
export function change(current: number | null | undefined, previous: number | null | undefined): number | null {
  const r = ratio(valid(current) && valid(previous) ? current - previous : null, previous);
  return r === null ? null : r * 100;
}

export function money(n: number | null | undefined, currency: "USD" | "IQD", digits: Digits = "latin"): string {
  if (!valid(n)) return MISSING;
  const s = currency === "USD" ? `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : `${Math.round(n).toLocaleString("en-US")} IQD`;
  return toDigits(s, digits);
}
