/**
 * Scheduling approved stories through the day (Shwan, 30 Oct). Times are Hawler time (UTC+3, no daylight saving).
 * Stories go out between WINDOW_START and WINDOW_END, at least MIN_GAP apart. "Next free time" takes the first
 * slot that is far enough from everything already scheduled; "spread evenly" re-spaces the whole schedule from now.
 */

export const HAWLER_OFFSET_MS = 3 * 3600_000;
export const WINDOW_START_H = Number(process.env.KUREAN_POST_FROM ?? 9); // 09:00
export const WINDOW_END_H = Number(process.env.KUREAN_POST_UNTIL ?? 23); // 23:00
export const MIN_GAP_MS = 60 * 60_000; // an hour between posts at the least
const LEAD_MS = 10 * 60_000; // never schedule closer than 10 minutes from now
const ROUND_MS = 5 * 60_000;

/** Midnight in Hawler for the day containing `d`, as a UTC instant. */
export function hawlerMidnight(d: Date): Date {
  const local = d.getTime() + HAWLER_OFFSET_MS;
  return new Date(Math.floor(local / 86_400_000) * 86_400_000 - HAWLER_OFFSET_MS);
}

const at = (midnight: Date, hours: number) => new Date(midnight.getTime() + hours * 3600_000);
const roundUp = (t: number) => Math.ceil(t / ROUND_MS) * ROUND_MS;

/** The posting window (start, end) of each day from `now`'s day onward, never starting before now + 10 min. */
function* windows(now: Date): Generator<{ start: number; end: number }> {
  let day = hawlerMidnight(now);
  for (let i = 0; i < 60; i++) {
    const start = Math.max(at(day, WINDOW_START_H).getTime(), roundUp(now.getTime() + LEAD_MS));
    const end = at(day, WINDOW_END_H).getTime();
    if (end - start >= ROUND_MS) yield { start, end };
    day = new Date(day.getTime() + 86_400_000);
  }
}

/** The first time inside the posting window that is at least MIN_GAP from every scheduled time. */
export function nextFreeSlot(taken: Date[], now = new Date()): Date {
  const busy = taken.map((d) => d.getTime()).sort((a, b) => a - b);
  for (const w of windows(now)) {
    for (let t = w.start; t <= w.end; t += ROUND_MS) {
      if (busy.every((b) => Math.abs(b - t) >= MIN_GAP_MS)) return new Date(t);
    }
  }
  return new Date(roundUp(now.getTime() + LEAD_MS));
}

/**
 * `n` times spread evenly over what is left of today's window, then the next days': each day takes as many as fit
 * at least MIN_GAP apart, placed at equal intervals with half a gap at each end.
 */
export function spreadEvenly(n: number, now = new Date()): Date[] {
  const out: Date[] = [];
  for (const w of windows(now)) {
    if (out.length >= n) break;
    const span = w.end - w.start;
    const fit = Math.max(1, Math.floor(span / MIN_GAP_MS));
    const k = Math.min(n - out.length, fit);
    for (let i = 0; i < k; i++) out.push(new Date(Math.floor((w.start + (span * (i + 0.5)) / k) / ROUND_MS) * ROUND_MS));
  }
  return out;
}

/** "14:30" in Hawler time. */
export function hawlerTime(d: Date | string): string {
  const t = new Date(new Date(d).getTime() + HAWLER_OFFSET_MS);
  return `${String(t.getUTCHours()).padStart(2, "0")}:${String(t.getUTCMinutes()).padStart(2, "0")}`;
}

/** A datetime-local value ("2026-10-31T14:30") read as Hawler time. */
export function fromHawlerInput(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) - HAWLER_OFFSET_MS);
}

/** The datetime-local value for a moment, in Hawler time. */
export function toHawlerInput(d: Date): string {
  return new Date(d.getTime() + HAWLER_OFFSET_MS).toISOString().slice(0, 16);
}
