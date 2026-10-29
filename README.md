# Kurean · کوریەن

Automated Sorani Kurdish news about Korean culture, published at kurean.news after one-tap approval.

This is **Phase 2, the engine**:

| Part | File | What it does |
| --- | --- | --- |
| Collector | `src/lib/collector.ts` | Reads every active RSS source, skips duplicates and items older than 48 h, stores new headlines |
| Scorer | `src/lib/writer.ts` → `scoreNew` | Claude Haiku scores headlines 0–10 for Kurdish K-culture fans, picks a category, flags sensitive topics |
| Writer | `src/lib/writer.ts` → `writeBest` | Claude Sonnet writes the best items as new Sorani articles, with card headline, 3 key points, captions and hashtags, using the glossary |
| Schedule | `supabase/cron.sql` | Supabase calls the site: collect every 20 minutes; score and write at :10 every hour, max 2 per run and 8 per day |

Finished stories land in the `stories` table with status `pending`. The approval dashboard (Phase 4) reads them from there.

## Setup

1. **Supabase**: create a project, open the SQL editor, run `supabase/schema.sql`, then `supabase/seed.sql`.
2. **Vercel**: import this repo, add the variables from `.env.example` under Settings → Environment Variables, and deploy.
3. **Schedule**: in the Supabase SQL editor, run `supabase/cron.sql` after replacing `YOUR_SITE` and `YOUR_SECRET`. (Vercel's free plan only allows daily cron jobs, so Supabase runs the schedule instead.)
4. **Check it**: after the first runs, look at the `raw_items` table (headlines) and the `stories` table (written stories).

To run a job by hand:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://YOUR_SITE/api/cron/collect
curl -H "Authorization: Bearer $CRON_SECRET" https://YOUR_SITE/api/cron/write
```

## Rules the writer follows

- Writes a new article from the facts, never a sentence-by-sentence translation; at most one short quote.
- Uses only facts in the source text; no invented numbers, dates or names.
- Glossary spellings are mandatory; edit them in the `glossary` table.
- Sensitive topics (dating, health, death, legal, scandal) state only confirmed facts. From a source below top trust they are marked `needs_second_source`.
- Source credit is stored separately and added by the site and captions.

## Development

```bash
npm install
npm test        # unit tests
npm run typecheck
npm run dev
```

## Notes

- Soompi, Yonhap, Korea Herald, Korea Times and Korea.net are seeded. Korea JoongAng Daily and KBS World have no confirmed public feed yet; add them when one is found.
- Feed images are stored for reference only. Following the image rules, a photo is used only when it is marked as official press material.
