import { z } from "zod";
import type { GlossaryTerm } from "./db";

export const CATEGORIES = ["kpop", "kdrama_film", "culture", "korea_news"] as const;

export const CATEGORY_LABELS: Record<(typeof CATEGORIES)[number], string> = {
  kpop: "کەی-پۆپ",
  kdrama_film: "درامای کۆری و فیلم",
  culture: "کولتوور و ژیان",
  korea_news: "هەواڵی کۆریا",
};

/* ---------- Step 1: scoring headlines ---------- */

export const SCORE_SYSTEM = `You pick stories for Kurean, a Sorani Kurdish news site about Korean culture for fans aged 15-30 in the Kurdistan Region and the diaspora.

Score each headline 0-10 for how much these readers would want it:
- 8-10: major K-pop comebacks, debuts, tours, chart records, award wins; big K-drama or film releases, casting, Netflix titles; viral Korean culture moments.
- 5-7: solid news about popular groups, actors or shows; Korean food, fashion, beauty, travel with broad appeal.
- 0-4: niche business, politics, sports, minor celebrity gossip, ads, listicles, quizzes, opinion pieces, anything not about Korea.
Also flag sensitive stories: dating rumours, health, deaths, legal cases, scandals.
Flag urgent (true) only for news that fans want within the hour: award winners and results, ceremony highlights as they
happen, a comeback/debut/release date or tour just announced officially, confirmed dating/marriage/enlistment/discharge,
a confirmed death, major breaking news in Korea. Teasers, photos, interviews, features and reviews are not urgent.
Assign each item one category: kpop, kdrama_film, culture or korea_news.`;

export const ScoreSchema = z.object({
  items: z.array(
    z.object({
      index: z.number().int(),
      score: z.number().int().min(0).max(10),
      category: z.enum(CATEGORIES),
      sensitive: z.boolean(),
      urgent: z.boolean().default(false),
      reason: z.string(),
    }),
  ),
});
export type ScoreOutput = z.infer<typeof ScoreSchema>;

export const SCORE_TOOL = {
  name: "record_scores",
  description: "Record a score for every headline.",
  input_schema: {
    type: "object" as const,
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            index: { type: "integer" },
            score: { type: "integer", minimum: 0, maximum: 10 },
            category: { type: "string", enum: [...CATEGORIES] },
            sensitive: { type: "boolean" },
            urgent: { type: "boolean", description: "Fans want it within the hour (results, official announcements)" },
            reason: { type: "string", description: "Under 15 words, English" },
          },
          required: ["index", "score", "category", "sensitive", "urgent", "reason"],
        },
      },
    },
    required: ["items"],
  },
};

export function scoreUserMessage(items: { title: string; summary: string | null; source: string }[]): string {
  return items
    .map((i, n) => `[${n}] (${i.source}) ${i.title}${i.summary ? `\n    ${i.summary.slice(0, 300)}` : ""}`)
    .join("\n");
}

/* ---------- Step 2: writing the story ---------- */

export function glossaryBlock(terms: GlossaryTerm[]): string {
  if (!terms.length) return "(no glossary terms yet)";
  return terms.map((t) => `- ${t.english} → ${t.sorani}${t.note ? ` (${t.note})` : ""}`).join("\n");
}

export function writeSystem(terms: GlossaryTerm[]): string {
  return `You are the writer for Kurean (کوریەن), a Sorani Kurdish news site about Korean culture for fans aged 15-30.

Write in standard Sorani Kurdish (Arabic script), clear and friendly, like a well-informed fan friend, but accurate.

Hard rules:
1. Write a NEW article from the facts. Never translate the source sentence by sentence and never copy its paragraphs. At most one short quote, attributed.
2. Use only facts present in the source text given to you. Do not add numbers, dates, names or claims that are not there. If something is unclear, leave it out.
3. Group and artist names stay in Latin letters. The first time a name appears in the body, add its Sorani spelling in brackets, e.g. BTS (بی تی ئێس).
4. Always use these glossary spellings:
${glossaryBlock(terms)}
5. Rumours are never presented as facts. For dating, health, death, legal or scandal topics, state only what is confirmed and say who confirmed it.
6. No emoji in the headline or body. Captions may use 1-3 emoji.
7. Body: 120-300 words, short paragraphs separated by blank lines. No heading inside the body. Do not write the source credit in the body; the site adds it. If the facts only support a short article, write a short one: never pad.
   Never write about the writing itself: no mention of the source text, of what information is missing, or that nothing was added. Readers only see the news.
8. card_headline: the headline cut to at most 9 words for the image cards.
9. key_points: exactly 3 short points (under 12 words each) for the TikTok details slide.
10. Captions: Instagram (2-4 sentences, ends with a call to read more via the link in bio), Facebook (2-3 sentences), TikTok (1-2 sentences). Each caption ends with "سەرچاوە: " followed by the source names given, separated by "، ".
11. hashtags: 4-8, mixing Sorani and English, e.g. #کەی_پۆپ #kpop.
12. You may receive several reports of the same news from different sources. Combine their facts into one article. If they disagree, use the more trusted source, or say plainly that reports differ.`;
}

export const StorySchema = z.object({
  headline: z.string().min(5).max(160),
  card_headline: z.string().min(3).max(90),
  body: z.string().min(200),
  key_points: z.array(z.string().min(2)).length(3),
  caption_instagram: z.string().min(10),
  caption_facebook: z.string().min(10),
  caption_tiktok: z.string().min(5),
  hashtags: z.array(z.string().regex(/^#\S+$/)).min(3).max(10),
});
export type StoryOutput = z.infer<typeof StorySchema>;

export const STORY_TOOL = {
  name: "save_story",
  description: "Save the finished Sorani story and its social captions.",
  input_schema: {
    type: "object" as const,
    properties: {
      headline: { type: "string" },
      card_headline: { type: "string" },
      body: { type: "string" },
      key_points: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
      caption_instagram: { type: "string" },
      caption_facebook: { type: "string" },
      caption_tiktok: { type: "string" },
      hashtags: { type: "array", items: { type: "string" } },
    },
    required: [
      "headline",
      "card_headline",
      "body",
      "key_points",
      "caption_instagram",
      "caption_facebook",
      "caption_tiktok",
      "hashtags",
    ],
  },
};

export function writeUserMessage(story: {
  category: (typeof CATEGORIES)[number];
  sensitive: boolean;
  reports: { source: string; trust: number; url: string; title: string; summary: string | null }[];
}): string {
  const names = [...new Set(story.reports.map((r) => r.source))].join("، ");
  const reports = story.reports
    .map(
      (r, i) => `Report ${i + 1} — ${r.source} (trust ${r.trust}/3)
Link: ${r.url}
Headline: ${r.title}
Text: ${r.summary?.trim() || "(headline only)"}`,
    )
    .join("\n\n");
  return `Category: ${CATEGORY_LABELS[story.category]}
Source names for the captions: ${names}
${story.sensitive ? "This is a SENSITIVE topic: state only confirmed facts and who confirmed them.\n" : ""}
${reports}`;
}

/* ---------- Same-story check across sources ---------- */

export const SAME_STORY_SYSTEM = `You compare news headlines. Given one target report and a numbered list of candidates from other sites,
pick only the candidates about the SAME specific news event (same people and same happening).
Related but different news (e.g. another member of the same group, an earlier announcement, a different episode) does not count.`;

export const SameStorySchema = z.object({ same: z.array(z.number().int()) });

export const SAME_STORY_TOOL = {
  name: "record_matches",
  description: "Record which candidates report the same news event as the target.",
  input_schema: {
    type: "object" as const,
    properties: {
      same: { type: "array", items: { type: "integer" }, description: "Candidate numbers about the same event; empty if none" },
    },
    required: ["same"],
  },
};

export function sameStoryUserMessage(
  target: { title: string; summary: string | null },
  candidates: { title: string; summary: string | null; source: string }[],
): string {
  const clip = (s: string | null) => (s ? `\n    ${s.slice(0, 200)}` : "");
  return `Target: ${target.title}${clip(target.summary)}

Candidates:
${candidates.map((c, i) => `[${i}] (${c.source}) ${c.title}${clip(c.summary)}`).join("\n")}`;
}

/* ---------- Repeat check against the last 7 days of stories ---------- */

export const REPEAT_SYSTEM = `You keep a news site from repeating itself. Given one new report and a numbered list of
stories the site already has (with the reports they were written from), decide:
- "duplicate": an existing story already says what this report says (same event, no meaningful new fact).
- "update": it is the same event or an ongoing one (an awards night, a tour, a case) and the report adds a NEW
  confirmed fact worth telling readers (a winner, a result, a date, an official statement). Give that story's number.
- "new": a different piece of news. Related news about the same artist (another song, another show) is "new".
Names may be spelled differently (Lim Young-woong / Lim Youngwoong, Jisoo / JISOO): treat them as the same person.`;

export const RepeatSchema = z.object({
  decision: z.enum(["new", "update", "duplicate"]),
  story: z.number().int().nullable().default(null),
  reason: z.string().default(""),
});

export const REPEAT_TOOL = {
  name: "record_decision",
  description: "Record whether the report is new, an update to an existing story, or a duplicate.",
  input_schema: {
    type: "object" as const,
    properties: {
      decision: { type: "string", enum: ["new", "update", "duplicate"] },
      story: { type: ["integer", "null"], description: "The existing story's number for update or duplicate" },
      reason: { type: "string", description: "Under 15 words, English" },
    },
    required: ["decision", "story", "reason"],
  },
};

export function repeatUserMessage(
  report: { title: string; summary: string | null },
  stories: { headline: string; reports: string[]; live: boolean }[],
): string {
  return `New report: ${report.title}${report.summary ? `\n    ${report.summary.slice(0, 400)}` : ""}

Existing stories:
${stories.map((s, i) => `[${i}]${s.live ? " (LIVE event story)" : ""} ${s.headline}\n    from: ${s.reports.slice(0, 3).join(" | ")}`).join("\n")}`;
}

/* ---------- Writing an update to a published story ---------- */

export function updateSystem(terms: GlossaryTerm[]): string {
  return `You write short updates for Kurean (کوریەن), a Sorani Kurdish news site about Korean culture.
A story is already published; write only the NEW facts from the new report as an update.
Rules: standard Sorani (Arabic script); names in Latin letters as in the story; use only facts in the new report;
rumours never as facts; no emoji; never mention the source text or what is missing.
Glossary spellings:
${glossaryBlock(terms)}
text: 1-3 short sentences. card: the update in at most 9 words for an image card.`;
}

export const UpdateSchema = z.object({ text: z.string().min(10).max(700), card: z.string().min(3).max(90) });

export const UPDATE_TOOL = {
  name: "save_update",
  description: "Save the Sorani update.",
  input_schema: {
    type: "object" as const,
    properties: { text: { type: "string" }, card: { type: "string" } },
    required: ["text", "card"],
  },
};

export function updateUserMessage(story: { headline: string; body: string }, report: { source: string; title: string; summary: string | null }): string {
  return `Published story: ${story.headline}
${story.body.slice(0, 1500)}

New report — ${report.source}
Headline: ${report.title}
Text: ${report.summary?.trim() || "(headline only)"}`;
}

/* ---------- The live story opened before an awards night ---------- */

export function liveSystem(terms: GlossaryTerm[]): string {
  return `${writeSystem(terms)}

This is a LIVE event story written before the event starts, from the event facts only (name, date, time, place).
Say what the event is and that this page will be updated with the winners and highlights as they are announced.
Do not guess nominees, performers or winners. Body 60-150 words is fine for this story.`;
}

export function liveUserMessage(e: { category: (typeof CATEGORIES)[number]; name: string; place: string | null; startsKst: string; startsHawler: string; source: string }): string {
  return `Category: ${CATEGORY_LABELS[e.category]}
Source names for the captions: ${e.source}

Event: ${e.name}
Place: ${e.place ?? "(not given)"}
Starts: ${e.startsKst} Korea time (${e.startsHawler} Hawler time)`;
}
