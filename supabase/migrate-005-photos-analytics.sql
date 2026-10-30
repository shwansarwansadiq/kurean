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
