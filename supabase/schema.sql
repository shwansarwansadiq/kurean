-- Kurean database schema (Supabase / Postgres)
-- Run this once in the Supabase SQL editor.

create extension if not exists pgcrypto;

-- News sources the collector reads
create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  feed_url text not null unique,
  site_url text not null,
  category_hint text not null check (category_hint in ('kpop', 'kdrama_film', 'culture', 'korea_news', 'mixed')),
  trust smallint not null default 2 check (trust between 1 and 3), -- 3 = high, 1 = needs a second source
  active boolean not null default true,
  last_checked_at timestamptz,
  last_item_at timestamptz,
  created_at timestamptz not null default now()
);

-- Every headline the collector finds, before the writer picks it
create table if not exists raw_items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources(id) on delete cascade,
  url text not null,
  url_hash text not null unique,
  title text not null,
  summary text,
  published_at timestamptz,
  image_url text,
  status text not null default 'new' check (status in ('new', 'scored', 'skipped', 'written', 'failed')),
  score smallint,
  score_reason text,
  created_at timestamptz not null default now()
);
create index if not exists raw_items_status_idx on raw_items (status, created_at desc);

-- Finished stories waiting for approval, then published
create table if not exists stories (
  id bigserial primary key, -- used for the short link kurean.news/n/<id>
  raw_item_id uuid unique references raw_items(id) on delete set null,
  category text not null check (category in ('kpop', 'kdrama_film', 'culture', 'korea_news')),
  headline text not null,
  body text not null,
  card_headline text not null,
  key_points text[] not null default '{}',
  caption_instagram text not null,
  caption_facebook text not null,
  caption_tiktok text not null,
  hashtags text[] not null default '{}',
  source_name text not null, -- the primary (most trusted) source
  source_url text not null,
  sources jsonb not null default '[]'::jsonb, -- every source that reported this news: [{name, url, trust}]
  needs_second_source boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'published', 'skipped', 'failed')),
  published_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists stories_status_idx on stories (status, created_at desc);

-- Fixed Sorani spellings the writer must use
create table if not exists glossary (
  id uuid primary key default gen_random_uuid(),
  english text not null unique,
  sorani text not null,
  note text,
  updated_at timestamptz not null default now()
);

-- Only the server (service role) touches these tables for now
alter table sources enable row level security;
alter table raw_items enable row level security;
alter table stories enable row level security;
alter table glossary enable row level security;

-- Public site may read published stories
drop policy if exists "public reads published stories" on stories;
create policy "public reads published stories" on stories
  for select using (status = 'published');

-- Added after launch: credit every source that reported the same news
alter table stories add column if not exists sources jsonb not null default '[]'::jsonb;

-- Phase 3/4: photos, platforms and editing
alter table stories add column if not exists image_url text;      -- copy in our storage bucket
alter table stories add column if not exists image_source text;   -- where the photo was posted (source page)
alter table stories add column if not exists image_credit text;   -- shown under the photo, e.g. "Soompi"
alter table stories add column if not exists platforms text[] not null default '{}'; -- chosen when publishing
alter table stories add column if not exists edited_at timestamptz;
alter table stories add column if not exists sticker_done boolean not null default false;

-- Public bucket for story photos
insert into storage.buckets (id, name, public) values ('story-images', 'story-images', true)
on conflict (id) do nothing;

-- Free photos first (Wikimedia Commons), copyright flags on source photos
alter table stories add column if not exists image_license text;
alter table stories add column if not exists photo_checked_at timestamptz;
-- Run once in the Supabase SQL editor. Record of every social post attempt. Safe to run again.
create table if not exists social_posts (
  id bigserial primary key,
  story_id bigint not null references stories(id) on delete cascade,
  platform text not null,           -- instagram | facebook | tiktok
  kind text not null,               -- feed | story
  ok boolean not null,
  external_id text,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists social_posts_story_idx on social_posts (story_id, created_at desc);
alter table social_posts enable row level security;
-- Run once in the Supabase SQL editor. Photo choices and first-party analytics. Safe to run again.

-- Photo choices: other photos found in the source articles, and extra photos Shwan adds to the article.
alter table stories add column if not exists photo_options jsonb not null default '[]'::jsonb; -- [{url, page, credit}]
alter table stories add column if not exists gallery jsonb not null default '[]'::jsonb;       -- [{url, credit, page}]

-- Analytics: one row per event. No IP addresses, no cookies without consent.
create table if not exists analytics_events (
  id bigserial primary key,
  ts timestamptz not null default now(),
  type text not null check (type in ('pageview', 'engage')),
  visitor text not null,          -- salted hash: daily without consent, stable with consent
  consent boolean not null default false,
  session text,
  pv text,                        -- one id per page view; engage events repeat it
  path text not null,
  story_id bigint,
  category text,
  source text not null default 'direct', -- direct | search | instagram | facebook | tiktok | social | referral
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  country text,
  city text,
  device text,                    -- mobile | tablet | desktop
  os text,
  browser text,
  lang text,
  engaged_ms integer,             -- engage events: active-tab time on the page
  scroll smallint                 -- engage events: deepest scroll, 0-100
);
create index if not exists analytics_events_ts_idx on analytics_events (ts);
create index if not exists analytics_events_story_idx on analytics_events (story_id, ts);
alter table analytics_events enable row level security;

-- All dashboard numbers come from this one function, so every metric has a single definition.
create or replace function kurean_analytics(p_from timestamptz, p_to timestamptz, p_category text default null)
returns jsonb language sql stable as $$
with ev as (
  select *, (ts at time zone 'Asia/Baghdad') as local_ts
  from analytics_events
  where ts >= p_from and ts < p_to and (p_category is null or category = p_category)
),
pv as (select * from ev where type = 'pageview'),
eng as (
  select pv as pvid, max(story_id) as story_id, max(category) as category, sum(engaged_ms) as engaged_ms, max(scroll) as scroll
  from ev where type = 'engage' group by pv
),
sess as (
  select session, count(*) as pages from pv where session is not null group by session
),
first_seen as (
  select visitor, min(ts) as first_ts from analytics_events where consent and type = 'pageview' group by visitor
),
vis as (
  select distinct pv.visitor, pv.consent, fs.first_ts from pv left join first_seen fs on fs.visitor = pv.visitor
)
select jsonb_build_object(
  'totals', jsonb_build_object(
    'pageviews', (select count(*) from pv),
    'visitors', (select count(distinct visitor) from pv),
    'sessions', (select count(*) from sess),
    'pages_per_session', (select avg(pages) from sess),
    'bounce_pct', (select 100.0 * count(*) filter (where pages = 1) / nullif(count(*), 0) from sess),
    'avg_engaged_ms', (select avg(engaged_ms) from eng where engaged_ms > 0),
    'avg_scroll', (select avg(scroll) from eng),
    'consented_visitors', (select count(*) from vis where consent),
    'returning_visitors', (select count(*) from vis where consent and first_ts < p_from),
    'consent_pct', (select 100.0 * count(*) filter (where consent) / nullif(count(*), 0) from vis)
  ),
  'daily', coalesce((select jsonb_agg(d order by d->>'day') from (
    select jsonb_build_object('day', to_char(local_ts::date, 'YYYY-MM-DD'), 'pageviews', count(*), 'visitors', count(distinct visitor)) as d
    from pv group by local_ts::date) x), '[]'),
  'categories', coalesce((select jsonb_agg(c) from (
    select jsonb_build_object('key', coalesce(pv.category, 'none'), 'pageviews', count(*), 'visitors', count(distinct pv.visitor),
      'avg_engaged_ms', (select avg(e.engaged_ms) from eng e where e.category is not distinct from pv.category and e.engaged_ms > 0)) as c
    from pv group by pv.category order by count(*) desc) x), '[]'),
  'sources', coalesce((select jsonb_agg(jsonb_build_object('key', source, 'pageviews', n)) from (
    select source, count(*) n from pv group by source order by n desc) x), '[]'),
  'referrers', coalesce((select jsonb_agg(jsonb_build_object('key', referrer_host, 'pageviews', n)) from (
    select referrer_host, count(*) n from pv where referrer_host is not null group by referrer_host order by n desc limit 10) x), '[]'),
  'campaigns', coalesce((select jsonb_agg(jsonb_build_object('key', utm_campaign, 'source', utm_source, 'pageviews', n, 'visitors', v)) from (
    select utm_campaign, max(utm_source) utm_source, count(*) n, count(distinct visitor) v from pv where utm_campaign is not null group by utm_campaign order by n desc limit 20) x), '[]'),
  'devices', coalesce((select jsonb_agg(jsonb_build_object('key', device, 'visitors', n)) from (
    select coalesce(device, 'unknown') device, count(distinct visitor) n from pv group by 1 order by n desc) x), '[]'),
  'os', coalesce((select jsonb_agg(jsonb_build_object('key', os, 'visitors', n)) from (
    select coalesce(os, 'unknown') os, count(distinct visitor) n from pv group by 1 order by n desc limit 8) x), '[]'),
  'browsers', coalesce((select jsonb_agg(jsonb_build_object('key', browser, 'visitors', n)) from (
    select coalesce(browser, 'unknown') browser, count(distinct visitor) n from pv group by 1 order by n desc limit 8) x), '[]'),
  'langs', coalesce((select jsonb_agg(jsonb_build_object('key', lang, 'visitors', n)) from (
    select coalesce(lang, 'unknown') lang, count(distinct visitor) n from pv group by 1 order by n desc limit 8) x), '[]'),
  'countries', coalesce((select jsonb_agg(jsonb_build_object('key', country, 'visitors', n)) from (
    select coalesce(country, '??') country, count(distinct visitor) n from pv group by 1 order by n desc limit 15) x), '[]'),
  'cities', coalesce((select jsonb_agg(jsonb_build_object('key', city, 'country', country, 'visitors', n)) from (
    select city, max(country) country, count(distinct visitor) n from pv where city is not null group by city order by n desc limit 15) x), '[]'),
  'heatmap', coalesce((select jsonb_agg(jsonb_build_object('dow', dow, 'hour', hr, 'pageviews', n)) from (
    select extract(dow from local_ts)::int dow, extract(hour from local_ts)::int hr, count(*) n from pv group by 1, 2) x), '[]'),
  'scroll', coalesce((select jsonb_build_object(
      'reached25', 100.0 * count(*) filter (where scroll >= 25) / nullif(count(*), 0),
      'reached50', 100.0 * count(*) filter (where scroll >= 50) / nullif(count(*), 0),
      'reached75', 100.0 * count(*) filter (where scroll >= 75) / nullif(count(*), 0),
      'reached100', 100.0 * count(*) filter (where scroll >= 95) / nullif(count(*), 0))
    from eng where story_id is not null), '{}'),
  'articles', coalesce((select jsonb_agg(a order by (a->>'pageviews')::int desc) from (
    select jsonb_build_object('story_id', pv.story_id, 'category', max(pv.category), 'pageviews', count(*), 'visitors', count(distinct pv.visitor),
      'avg_engaged_ms', (select avg(e.engaged_ms) from eng e where e.story_id = pv.story_id and e.engaged_ms > 0),
      'avg_scroll', (select avg(e.scroll) from eng e where e.story_id = pv.story_id)) as a
    from pv where pv.story_id is not null group by pv.story_id order by count(*) desc limit 20) x), '[]'),
  'exits', coalesce((select jsonb_agg(jsonb_build_object('key', path, 'exits', n)) from (
    select path, count(*) n from (
      select distinct on (session) session, path from pv where session is not null order by session, ts desc) last
    group by path order by n desc limit 10) x), '[]'),
  'first_event', (select min(ts) from analytics_events),
  'generated_at', now()
);
$$;
-- Run once in the Supabase SQL editor. The weekly Korea chart in the site footer. Safe to run again.

-- One row per chart week: the Circle Chart (Korea Music Content Association) weekly Digital Chart, top 100.
create table if not exists chart_weeks (
  id text primary key,                 -- 'circle-digital-2026-43'
  chart text not null default 'circle-digital',
  year integer not null,
  week integer not null,
  period text not null,                -- '2026.10.18~2026.10.24' as Circle Chart writes it
  entries jsonb not null,              -- [{rank, prev, move, change, title, artist, cover, id}]
  fetched_at timestamptz not null default now()
);
create index if not exists chart_weeks_latest_idx on chart_weeks (chart, year desc, week desc);
alter table chart_weeks enable row level security;

-- Song and artist names for Kurdish readers, written once per song and reused every week it stays in the chart.
create table if not exists chart_songs (
  id text primary key,                 -- Circle Chart's song id (SEQ_MOM)
  title text not null,                 -- as Circle Chart writes it (often Korean)
  artist text not null,
  title_latin text,                    -- official Latin title, or the Revised Romanization
  title_ckb text,                      -- what a Korean title means, in Sorani (empty for English titles)
  artist_latin text,
  artist_ckb text,                     -- artist name spelled in Sorani
  updated_at timestamptz not null default now()
);
alter table chart_songs enable row level security;
-- Run once in the Supabase SQL editor. Where to listen to each chart song. Safe to run again.
alter table chart_songs add column if not exists youtube_id text;          -- official video, played in YouTube's embedded player
alter table chart_songs add column if not exists youtube_channel text;     -- the channel it came from, for checking
alter table chart_songs add column if not exists youtube_checked_at timestamptz; -- re-checked every 30 days (YouTube API policy)
alter table chart_songs add column if not exists spotify_id text;          -- Spotify track, linked out
alter table chart_songs add column if not exists links_checked_at timestamptz;
-- Run once in the Supabase SQL editor. The weekly chart story (top 10 article + cards). Safe to run again.
alter table stories add column if not exists kind text not null default 'news'; -- 'news' | 'chart'
alter table stories add column if not exists chart_week text;                   -- chart_weeks.id for kind 'chart'
alter table stories add column if not exists chart_top jsonb;                   -- the top 10 as written: [{rank,title,artist,artist_ckb,move,change}]
create unique index if not exists stories_chart_week_idx on stories (chart_week) where chart_week is not null;
