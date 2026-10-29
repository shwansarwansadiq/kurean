# Kurean · کوریەن — project guide for Claude

Kurean is an automated Sorani Kurdish news site about Korean culture (K-pop, K-drama, films, culture,
Korea news) for fans aged 15–30 in the Kurdistan Region and the diaspora. Owner: Shwan.
The system finds news, writes it in Sorani, designs the posts, and waits; Shwan's only job is to
approve. **Nothing is ever published without his approval.**

- Live site: https://kurean.vercel.app (domain kurean.news is bought, not yet connected)
- Plan doc (decisions, sources, glossary tab): https://claude.ai/artifact/Cbapd6o1PLqdh6iYRNpsGP
- Logo, post/story/TikTok templates (design canvas): https://claude.ai/artifact/49rPtou3u9Tv8Zfessh7FR
- Social: @kurean.news on Instagram and TikTok, "KUREAN" Page on Facebook

## Status

| Phase | State |
| --- | --- |
| 1. Setup (domain, handles, accounts, logo, templates, glossary, sources) | Done |
| 2. Engine (collector, scorer, writer, glossary) | Done and live |
| 3. Website pages (home, categories, article, short links) | Next |
| 4. Approval dashboard (/admin) | Next, build together with phase 3 |
| 5. Card/story image generation + social publishing | After 4 |

Build phases 3 and 4 together so the first story on the public site is one Shwan approved.

## Stack and where things run

- Next.js 15 (App Router, TypeScript) on Vercel, project `kurean` in team `kurean`. Pushing to `main` deploys.
- Vercel is on the **free (Hobby) plan**: cron jobs there can only run daily, so **Supabase runs the schedule**
  (`supabase/cron.sql`, pg_cron + pg_net calling the site). Move to Vercel Pro before ads (Hobby is non-commercial).
- Supabase project ref `eizsrdtmftjrbxmoawdl` (org KUREAN, region eu-west-3). Tables: `sources`, `raw_items`,
  `stories`, `glossary` — see `supabase/schema.sql`. Seeds in `supabase/seed.sql`.
- Env vars (set in Vercel, never commit): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (a `sb_secret_` key),
  `ANTHROPIC_API_KEY`, `CRON_SECRET`. Optional: `KUREAN_DAILY_LIMIT` (8), `KUREAN_MIN_SCORE` (7),
  `KUREAN_SCORE_MODEL`, `KUREAN_WRITE_MODEL`.
- Next.js must stay on a patched version: Vercel blocks deploys of vulnerable releases.

## Pipeline (src/lib)

1. `collector.ts` — every 20 min: reads active RSS sources, skips duplicates (canonical URL hash) and items
   older than 48 h, stores `raw_items` with status `new`.
2. `writer.ts` → `scoreNew` — hourly at :10: Claude Haiku scores up to 40 new headlines 0–10, sets category
   (`kpop`, `kdrama_film`, `culture`, `korea_news`) and a sensitive flag; ≥7 becomes `scored`, else `skipped`.
3. `writer.ts` → `writeBest` — writes at most 2 per run and 8 per day into `stories` (status `pending`):
   headline, card_headline, body, 3 key_points, Instagram/Facebook/TikTok captions, hashtags, source.
   Sensitive stories from a source below trust 3 get `needs_second_source = true`.
4. Prompts and output schemas live in `prompts.ts`; tests in `tests/` (`npm test`).

## Sources

Live: Soompi (trust 2), Yonhap News (3), Korea Herald (3), SBS Star (3), allkpop (1, gossip-heavy).
Paused: Korea Times, Korea.net Culture, Korea.net Food & Travel — they block automated readers.
Not added: Koreaboo (clickbait), Hancinema (bot check). No public feed found: Korea JoongAng Daily, KBS World.

**Never work around a site's bot blocking** (no browser-impersonating user agents, no cookie tricks, no
challenge solving). If a feed blocks automated readers, pause it, ask the publisher for access, or replace it.

## Editorial rules (non-negotiable)

- Write a new Sorani article from the facts; never translate sentence by sentence or copy paragraphs.
  At most one short attributed quote. Use only facts in the source; invent nothing.
- Every story credits its source with a link ("سەرچاوە: …").
- No rumours as facts. Dating, health, death, legal and scandal stories state only what is confirmed and who confirmed it.
- Images: branded cards by default; a photo only when it is clearly official press material, with its licence logged.
  Never reuse agency photos (Yonhap, Getty, Newsen, etc.).
- Group and artist names stay in Latin letters, with the Sorani spelling in brackets the first time.
- Glossary spellings are mandatory (table `glossary`; the plan doc's Glossary tab is the human-edited copy).
  Example: fandom → کۆمەڵەی هەواداران in articles, فاندۆم allowed in casual captions.
- Tone: friendly, well-informed fan friend, accurate. No emoji in headlines or body; 1–3 in captions.

## Brand

- Name: Kurean (Kurd + Korean), Sorani کوریەن. Wordmark: lowercase "kurean", "kur" in plum, "ean" in berry.
- Symbol (approved): line-art Korean finger heart (hand drawn from Shwan's reference), with a berry heart
  ringed by the 21 gold rays of the Kurdish sun directly above the crossed fingertips.
- Colours: berry #E8508A, plum #2A1E3B, blush #FFF2F7, sun gold #FFB938, lilac #9B7BEA, lavender mist #EEE8FF.
  Category tags: K-pop berry, K-drama/film lilac, culture mint #3FA88E, Korea news blue #3A5BD9.
- Fonts: Rabar for Sorani (font files still to be supplied by Shwan; Noto Kufi Arabic as fallback),
  Baloo 2 for the wordmark, Inter for Latin UI text.
- Style: between bold pop and soft pastel. RTL first; works on phones first.

## Site plan (phase 3/4)

- `/` latest stories, trending, category rows · `/category/<slug>` · article page with source credit and related stories
- `/n/<id>` short links (used in stories, since APIs can't add link stickers) · `/latest` for the Instagram bio
- `/admin` approval dashboard (login required): story cards with Publish / Edit / Regenerate / Skip / pick platforms,
  Published list, "link stickers to add" checklist, Sources, Glossary, Logs.
- Publish is immediate on approval (Shwan's choice).

## Social publishing (phase 5)

- Instagram + Facebook via Shwan's Meta developer app (Graph API). TikTok via a publishing service with an
  already-audited app (unaudited apps can only post privately).
- APIs cannot add link stickers to stories: put the short link in the design; the dashboard reminds Shwan to add
  the Instagram sticker by hand (~5 seconds).
- Formats: feed 1080×1350, story 1080×1920 (safe zones top ~220px, bottom ~250px), TikTok carousel 1080×1920 × 3.

## Design skills in this repo

`.claude/skills/`: Impeccable (incl. `polish`), Taste (design-taste-frontend), Emil Kowalski's motion skills.
Kurean's brand and RTL rules above always win over generic skill advice. Impeccable's auto-check hooks are
intentionally not installed.

## Working conventions

- Run `npm test`, `npm run typecheck` and `npx next build` before pushing.
- Commit as Claude <noreply@anthropic.com> so commits show as verified.
- Secrets never go into the repo, chat replies or SQL files that get committed.
