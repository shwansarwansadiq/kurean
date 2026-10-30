# Kurean · کوریەن — project guide for Claude

Kurean is an automated Sorani Kurdish news site about Korean culture (K-pop, K-drama, films, culture,
Korea news) for fans aged 15–30 in the Kurdistan Region and the diaspora. Owner: Shwan.
The system finds news, writes it in Sorani, designs the posts, and waits; Shwan's only job is to
approve. **Nothing is ever published without his approval.**

- Live site: https://kurean.news (Namecheap BasicDNS: A @ → 216.198.79.1, CNAME www → Vercel; www redirects 308 to the bare domain; kurean.vercel.app still works)
- Plan doc (decisions, sources, glossary tab): https://claude.ai/artifact/Cbapd6o1PLqdh6iYRNpsGP
- Logo, post/story/TikTok templates (design canvas): https://claude.ai/artifact/49rPtou3u9Tv8Zfessh7FR
- Social: display name **KUREAN** on every platform; username/handle **@kurean.news** on Instagram, TikTok and Facebook.
  Use "KUREAN" wherever a profile name appears and "@kurean.news" wherever a handle appears.

## Status

| Phase | State |
| --- | --- |
| 1. Setup (domain, handles, accounts, logo, templates, glossary, sources) | Done |
| 2. Engine (collector, scorer, writer, glossary) | Done and live |
| 3. Website pages (home, categories, article, short links) | Built ("album booklet" direction) |
| 4. Approval dashboard (/admin) | Built (password sign-in) |
| 5. Card/story image generation + social publishing | Instagram + Facebook built (Meta app KUREAN); TikTok next |

Build phases 3 and 4 together so the first story on the public site is one Shwan approved.

## Stack and where things run

- Next.js 15 (App Router, TypeScript) on Vercel, project `kurean` in team `kurean`. Pushing to `main` deploys.
- Vercel is on the **free (Hobby) plan**: cron jobs there can only run daily, so **Supabase runs the schedule**
  (`supabase/cron.sql`, pg_cron + pg_net calling the site). Move to Vercel Pro before ads (Hobby is non-commercial).
- Supabase project ref `eizsrdtmftjrbxmoawdl` (org KUREAN, region eu-west-3). Tables: `sources`, `raw_items`,
  `stories`, `glossary` — see `supabase/schema.sql`. Seeds in `supabase/seed.sql`.
- Env vars (set in Vercel, never commit): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (a `sb_secret_` key),
  `ANTHROPIC_API_KEY`, `CRON_SECRET`, `ADMIN_PASSWORD` (≥10 characters; Shwan sets it himself; changing it signs out).
  Local preview without a database: `KUREAN_FIXTURES=1 npm run dev` (sample stories; photos from `public/_dev/`, not committed).
  Optional: `KUREAN_DAILY_LIMIT` (8), `KUREAN_MIN_SCORE` (7), `KUREAN_SCORE_MODEL`, `KUREAN_WRITE_MODEL`.
- Migrations: `supabase/migrate-002-site.sql` (photo, platforms, sticker columns + `story-images` storage bucket),
  `migrate-003-photos.sql` (photo licence flags), `migrate-004-social.sql` (`social_posts`),
  `migrate-005-photos-analytics.sql` (photo options, gallery, `analytics_events`, `kurean_analytics()`),
  `migrate-006-chart.sql` (`chart_weeks`, `chart_songs`). Env also: `META_TOKEN`.
- Next.js must stay on a patched version: Vercel blocks deploys of vulnerable releases.

## Pipeline (src/lib)

1. `collector.ts` — every 20 min: reads active RSS sources, skips duplicates (canonical URL hash) and items
   older than 48 h, stores `raw_items` with status `new`.
2. `writer.ts` → `scoreNew` — hourly at :10: Claude Haiku scores up to 40 new headlines 0–10, sets category
   (`kpop`, `kdrama_film`, `culture`, `korea_news`) and a sensitive flag; ≥7 becomes `scored`, else `skipped`.
3. `writer.ts` → `writeBest` — writes at most 2 per run and 8 per day into `stories` (status `pending`):
   headline, card_headline, body, 3 key_points, Instagram/Facebook/TikTok captions, hashtags, sources.
   **Same-story check (`cluster.ts`):** before writing, finds headlines from other sources in the last 48 h that
   share ≥2 meaningful words, and Haiku confirms which are the same news. Then:
   - one of them is already `written` → skip as "already covered" (no duplicates);
   - otherwise all reports are combined into one article; `stories.sources` lists every source
     (`[{name,url,trust}]`), `source_name/source_url` = the most trusted, most detailed one;
   - total source text under 120 chars across all reports → skip as "no source text" (never pad).
   `needs_second_source` is true only for sensitive stories with a single source below trust 3.
4. `callTool` forces tool use, and falls back to `tool_choice: auto` for models that refuse a forced tool
   (the Sonnet writer does).
5. Prompts and output schemas live in `prompts.ts`; tests in `tests/` (`npm test`).
6. Run a job by hand from the Supabase SQL editor without exposing the secret:
   `do $$ begin execute (select command from cron.job where jobname = 'kurean-write'); end $$;`
   Results: `select status_code, content from net._http_response order by created desc limit 1;`
   Errors: Vercel → project → Logs.

Stories waiting now: #1 (Park Bo Gum MAMA) and #2 (KATSEYE tour) were written from allkpop headlines before the
quality fixes and are thin — skip them in the dashboard. #3+ are written with the current rules.

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
- Images (Shwan's decisions, 30 Oct 2026, after being told the copyright and account-strike risk):
  1. **Free photo first:** look on Wikimedia Commons for a high-resolution (long side ≥1600 px, short ≥900 px),
     commercially usable (CC0, CC BY, CC BY-SA, public domain, KOGL 1) photo of the **same** person, group or place.
     "Same" is decided by names only: the Commons category must equal the name (ignoring case, spaces, hyphens) and
     the file title must name the subject. Recent solo photos win. Never guess identity from faces. (`commons.ts`)
  2. **Otherwise the source's own photo**, exactly as posted: the feed image and each article's og:image are all
     downloaded and the largest kept (feeds often carry 300 px thumbnails). Under 800 px on the long side → branded
     card instead (`image_license = 'too-small'`), never a blurry photo. Every source photo is
     copyrighted; agency photos (Getty, Yonhap, Newsen, OSEN, News1, Dispatch…, detected from the address or the
     file's embedded credit) are flagged "high risk" in /admin, where "find a free photo" retries step 1.
  3. Always credited: on the site "وێنە: <source>" or "<artist> · <licence> · Wikimedia Commons"; on social posts the
     credit is in the caption ("📷 …"), not on the image (Shwan, 30 Oct). Card footer: "زانیاری زیاتر لە kurean.news".
  4. **Takedowns:** Kurean removes any copyrighted photo or text as soon as it is warned. In /admin: Edit → remove
     photo (it stays removed; the story falls back to the branded card). Article pages tell rights holders to message
     @kurean.news. Never work around a site's refusal to serve a photo.
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
- Stories #1 and #2 are set to skipped by `migrate-002-site.sql`.

## Website and dashboard (built)

- Direction "album booklet" (taste-skill colour-chapters + impeccable read mode): categories are album versions in
  their colour, stories a numbered tracklist, sources credited like liner notes, Seoul ↔ Hawler clocks, glass masthead
  and chips over photos, the logo's hand draws itself and the 21 rays rise on load, the field sun turns slowly
  (all motion off with reduced motion). Category labels: کەی-پۆپ، دراما و فیلم، کولتوور، هەواڵی کۆریا.
- Routes: `/`, `/category/<kpop|kdrama-film|culture|korea>`, `/news/<id>`, `/n/<id>` (→ article), `/latest`.
- `/admin`: queue (publish with platforms, edit, rewrite, skip), Published (unpublish), Skipped (restore), Stickers,
  Sources (pause/resume), Glossary (add/change). Edit page previews the feed post and story designs (`SocialCards.tsx`).
- Favicon: `src/app/icon.svg` (finger heart + 21 rays on a blush tile).
- **Photos (Edit page → وێنەکان, `PhotoPanel.tsx`):** upload your own photo as the main photo or as an extra (browser
  shrinks to ≤2400 px, uploads straight to storage via a signed URL); "use as main" or "add to article" for any other
  photo found in the source articles (`stories.photo_options`, filled when the story is written or via "search the
  sources again"); extra photos live in `stories.gallery` and show inside the article. Nothing is used without Shwan.
- **Korea chart (footer, under the clocks; Shwan 30 Oct):** Circle Chart weekly Digital Chart top 100 (`lib/chart.ts`,
  `components/KoreaChart.tsx`). Daily job `kurean-chart` → `/api/cron/chart` reads Circle Chart's public page and the
  same list request that page makes (KureanBot user agent; any refusal keeps the stored week). New songs get Latin and
  Sorani names once via Haiku (`chart_songs`). Covers are Circle Chart's 70 px thumbnails, linked, not copied.
  No translated title meanings under the songs (Shwan, 30 Oct): only the Latin title, artist, and artist in Sorani.
  Melon was refused (robots.txt blocks it); Spotify's API no longer serves its Korea playlist to new apps.
- **Analytics (`/admin/analytics`, from Shwan's spec 30 Oct):** first-party tracker `components/Tracker.tsx` → `/api/t`
  → `analytics_events`; no cookies, no IP stored; visitor = salted daily hash, or a stable random ID after consent
  (banner in ckb + en). Bots, /admin, /card and the signed-in editor are excluded. All numbers come from the SQL
  function `kurean_analytics(from, to, category)` (migrate-005); tabs: all + each category; ranges today/7/30/90/custom
  with previous-period deltas; Latin/Kurdish digits; CSV export. Public definitions at `/measure`.
  Not built yet from the spec: daily rollup tables (only needed at scale), ad slots/viewability, pricing calculator,
  media-kit PDF, campaign report, English toggle, monthly email.

## Social publishing (phase 5)

- **Every story goes to the feed as well as stories (Shwan, 30 Oct):** Instagram + Facebook feed post 1080×1350 and
  story 1080×1920, TikTok carousel, each made from the source photo in Kurean's design with the card headline on it
  (`SocialCards.tsx` is the layout to export). Captions from the story's caption fields.

- **Built:** Publish in /admin → site first, then `social.ts` renders `/card/<id>?f=feed|story` to JPEG with headless
  Chromium (`render-card.ts`, @sparticuz/chromium) and posts feed + story to Instagram and Facebook (`meta.ts`,
  Graph v23). Every attempt is logged in `social_posts`; /admin/published shows ✓/✕ with a retry button.
  Meta setup: app **KUREAN** (id 959741500120355) in the **Kurean** business portfolio (1048369881550004), system user
  **kurean-publisher** with Page "Content" only on Page **kurean** (1332232389983250, linked to @kurean.news).
  Its never-expiring token is `META_TOKEN` in Vercel. `meta.ts` refuses any Page other than kurean.
  Check without posting: `/api/meta/check` (Bearer CRON_SECRET), `?render=<published id>` also renders cards.
  Never touch Shwan's other Meta apps or portfolios (Psoola, kuko, others).
- Instagram + Facebook via Shwan's Meta developer app (Graph API). TikTok via a publishing service with an
  already-audited app (unaudited apps can only post privately).
- APIs cannot add link stickers to stories: put the short link in the design; the dashboard reminds Shwan to add
  the Instagram sticker by hand (~5 seconds).
- Formats: feed 1080×1350, story 1080×1920 (safe zones top ~220px, bottom ~250px), TikTok carousel 1080×1920 × 3.
- **Scenery stories (Shwan's request):** between every news story on Instagram and Facebook stories, post one
  very high quality photo or ≤10 s video of Korea's nature or landmarks (alternate news → scenery → news).
  - Source: Pexels API (needs a free `PEXELS_API_KEY`). Weekly search by named places (Gyeongbokgung, Jeju,
    Seoraksan, Gamcheon, Bukchon, cherry blossom season…). Keep only vertical ≥1080×1920 photos and ≤10 s clips.
  - Pexels rules: add creative effort (our overlay), no visible brand logos/trademarks, no bulk copying, never
    use the content for datasets or model training.
  - Shwan approves the library weekly in the dashboard (~20 items). No item repeats within 60 days.
  - Overlay: place name in Sorani with 📍, small Kurean logo, credit "📷 <photographer> · Pexels".
  - Table `scenery` (to add): id, pexels_id, kind (photo|video), url, width, height, duration, place_en,
    place_ckb, photographer, photographer_url, status (pending|approved|rejected), last_posted_at.

## Design skills in this repo

`.claude/skills/`: Impeccable (incl. `polish`), Taste (design-taste-frontend), Emil Kowalski's motion skills.
Kurean's brand and RTL rules above always win over generic skill advice. Impeccable's auto-check hooks are
intentionally not installed.

**Shwan's standing instruction: use all of these skills for every piece of UI work**, in this order:
1. `taste-skill` for art direction before designing (within the Kurean brand).
2. `impeccable` to shape the work, then `critique`/`audit` it, and a final `polish` pass before shipping.
3. `emil-design-eng` for interaction details; `animate` for any motion, `review-animations` to check it,
   `animation-performance` to keep it smooth on phones. Respect reduced-motion.

## Working conventions

- Run `npm test`, `npm run typecheck` and `npx next build` before pushing.
- Commit as Claude <noreply@anthropic.com> so commits show as verified.
- Secrets never go into the repo, chat replies or SQL files that get committed.
