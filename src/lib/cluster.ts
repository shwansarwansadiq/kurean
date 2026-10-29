/**
 * Finds headlines from other sources that may be about the same news, so one story can be written
 * from every report of it. This is a cheap first pass; the model confirms the final matches.
 */

const STOPWORDS = new Set(
  `a an the and or but of to in on at for with from by as is are was were be been being it its this that these those
   his her their our your my we you they he she them him who what when where why how than then so not no yes
   new first last after before over under up down out into about more most says said say will would can could
   has have had do does did just also amid during while only all any each other one two three four five
   kpop k-pop drama kdrama k-drama film movie series show news reveals revealed shares shared gets got makes made
   official officially update updates report reports reported fans fan netizens group member members`
    .split(/\s+/)
    .filter(Boolean),
);

/** Lowercased words that carry meaning: names, titles, events. */
export function significantTokens(title: string): Set<string> {
  const words = title
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[’'`]s\b/g, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w) && !/^\d{1,2}$/.test(w));
  return new Set(words);
}

export type Candidate<T> = { item: T; shared: number };

/**
 * Items whose titles share at least two significant words with the target, best first.
 * Two shared words (e.g. "park" + "gum", or "mama" + "ambassador") is a strong enough hint to ask the model.
 */
export function relatedCandidates<T extends { title: string }>(
  targetTitle: string,
  pool: T[],
  max = 6,
): Candidate<T>[] {
  const target = significantTokens(targetTitle);
  if (target.size === 0) return [];
  return pool
    .map((item) => {
      const tokens = significantTokens(item.title);
      let shared = 0;
      for (const t of tokens) if (target.has(t)) shared++;
      return { item, shared };
    })
    .filter((c) => c.shared >= 2)
    .sort((a, b) => b.shared - a.shared)
    .slice(0, max);
}

export type Report = {
  id: string;
  source: string;
  trust: number;
  url: string;
  title: string;
  summary: string | null;
};

/** Total source text available across all reports. */
export function totalSourceChars(reports: Report[]): number {
  return reports.reduce((n, r) => n + (r.summary?.trim().length ?? 0), 0);
}

/** The report to credit first: most trusted, then most detailed. */
export function primaryReport(reports: Report[]): Report {
  return [...reports].sort(
    (a, b) => b.trust - a.trust || (b.summary?.length ?? 0) - (a.summary?.length ?? 0),
  )[0];
}

/**
 * A sensitive story is confirmed when two different sources report it, or when its only source is top trust.
 * Otherwise it needs a second source before approval.
 */
export function needsSecondSource(sensitive: boolean, reports: Report[]): boolean {
  if (!sensitive) return false;
  const distinct = new Set(reports.map((r) => r.source));
  if (distinct.size >= 2) return false;
  return Math.max(...reports.map((r) => r.trust)) < 3;
}
