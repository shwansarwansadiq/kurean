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
Assign each item one category: kpop, kdrama_film, culture or korea_news.`;

export const ScoreSchema = z.object({
  items: z.array(
    z.object({
      index: z.number().int(),
      score: z.number().int().min(0).max(10),
      category: z.enum(CATEGORIES),
      sensitive: z.boolean(),
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
            reason: { type: "string", description: "Under 15 words, English" },
          },
          required: ["index", "score", "category", "sensitive", "reason"],
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
7. Body: 150-300 words, short paragraphs separated by blank lines. No heading inside the body. Do not write the source credit in the body; the site adds it.
8. card_headline: the headline cut to at most 9 words for the image cards.
9. key_points: exactly 3 short points (under 12 words each) for the TikTok details slide.
10. Captions: Instagram (2-4 sentences, ends with a call to read more via the link in bio), Facebook (2-3 sentences), TikTok (1-2 sentences). Each caption ends with "سەرچاوە: <source name>".
11. hashtags: 4-8, mixing Sorani and English, e.g. #کەی_پۆپ #kpop.`;
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

export function writeUserMessage(item: {
  title: string;
  summary: string | null;
  url: string;
  source: string;
  category: (typeof CATEGORIES)[number];
  sensitive: boolean;
}): string {
  return `Source: ${item.source}
Link: ${item.url}
Category: ${CATEGORY_LABELS[item.category]}
${item.sensitive ? "This is a SENSITIVE topic: state only confirmed facts and who confirmed them.\n" : ""}
Original headline: ${item.title}

Source text:
${item.summary ?? "(only the headline is available; keep the article short and do not invent details)"}`;
}
