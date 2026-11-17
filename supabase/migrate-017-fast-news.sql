-- Run once in the Supabase SQL editor. News all day (Shwan, 17 Nov): one fast chain every 15 minutes (5 on awards
-- days), an urgent lane, live stories with approved updates, a 7-day repeat check, Telegram approval, and an
-- awards calendar. Safe to run again.
alter table raw_items add column if not exists urgent boolean not null default false;
-- 'writing': claimed by a run (two overlapping runs never write the same report).
alter table raw_items drop constraint if exists raw_items_status_check;
alter table raw_items add constraint raw_items_status_check check (status in ('new', 'scored', 'skipped', 'written', 'failed', 'writing'));
alter table raw_items add column if not exists claimed_at timestamptz;
alter table stories add column if not exists urgent boolean not null default false;
alter table stories add column if not exists live_until timestamptz;        -- shows "live" on the site until then
alter table stories add column if not exists updates jsonb not null default '[]'; -- approved updates [{at, text, card}]
alter table stories add column if not exists event_id bigint;

-- Updates to a published story wait here for Shwan's approval.
create table if not exists story_updates (
  id bigserial primary key,
  story_id bigint not null references stories(id) on delete cascade,
  raw_item_ids uuid[] not null default '{}',
  text text not null,            -- 1-3 Sorani sentences
  card text not null,            -- at most 9 words, for the story card
  sources jsonb not null default '[]',
  status text not null default 'pending' check (status in ('pending', 'published', 'skipped')),
  social_result text,
  created_at timestamptz not null default now(),
  published_at timestamptz
);
create index if not exists story_updates_pending_idx on story_updates (status, created_at desc);
alter table story_updates enable row level security;

-- Awards and year-end shows: faster checks around them and a live story ready before they start.
create table if not exists events (
  id bigserial primary key,
  name text not null,                    -- "2026 MAMA Awards (Chapter 1)"
  name_ckb text not null,
  kind text not null default 'awards' check (kind in ('awards', 'festival')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  place text,
  source_name text,
  source_url text,
  story_id bigint,               -- the live story (-1 while it is being written)
  created_at timestamptz not null default now()
);
create index if not exists events_time_idx on events (starts_at);
alter table events enable row level security;

-- Telegram messages sent about a story or update (to edit them after a button is pressed).
create table if not exists alerts (
  id bigserial primary key,
  kind text not null,          -- story | update
  ref_id bigint not null,
  message_id bigint,
  created_at timestamptz not null default now()
);
alter table alerts enable row level security;

-- The season (from Soompi's year-end guide, 17 Nov 2026; times KST where given, else 18:00 KST; ~4 h long).
insert into events (name, name_ckb, kind, starts_at, ends_at, place, source_name, source_url)
select * from (values
  ('2026 MAMA Awards · Chapter 1', 'خەڵاتەکانی MAMA ٢٠٢٦ · بەشی یەکەم', 'awards', '2026-11-20 18:00+09'::timestamptz, '2026-11-20 22:30+09'::timestamptz, 'Kyocera Dome, Osaka', 'Soompi', 'https://www.soompi.com/article/1882479wpp/guide-to-2026-year-end-shows-and-upcoming-awards-shows-schedules-lineups-nominees-and-more'),
  ('2026 MAMA Awards · Chapter 2', 'خەڵاتەکانی MAMA ٢٠٢٦ · بەشی دووەم', 'awards', '2026-11-21 15:00+09', '2026-11-21 20:00+09', 'Kyocera Dome, Osaka', 'Soompi', 'https://www.soompi.com/article/1882479wpp/guide-to-2026-year-end-shows-and-upcoming-awards-shows-schedules-lineups-nominees-and-more'),
  ('47th Blue Dragon Film Awards', 'خەڵاتەکانی فیلمی Blue Dragon ـی ٤٧', 'awards', '2026-11-25 18:00+09', '2026-11-25 22:00+09', 'KBS Hall', 'Soompi', 'https://www.soompi.com/article/1882479wpp/guide-to-2026-year-end-shows-and-upcoming-awards-shows-schedules-lineups-nominees-and-more'),
  ('2026 Asia Artist Awards · Day 1', 'خەڵاتەکانی Asia Artist Awards ٢٠٢٦ · ڕۆژی یەکەم', 'awards', '2026-12-05 18:00+09', '2026-12-05 22:30+09', 'Kaohsiung National Stadium', 'Soompi', 'https://www.soompi.com/article/1882479wpp/guide-to-2026-year-end-shows-and-upcoming-awards-shows-schedules-lineups-nominees-and-more'),
  ('2026 Asia Artist Awards · Day 2', 'خەڵاتەکانی Asia Artist Awards ٢٠٢٦ · ڕۆژی دووەم', 'awards', '2026-12-06 18:00+09', '2026-12-06 22:30+09', 'Kaohsiung National Stadium', 'Soompi', 'https://www.soompi.com/article/1882479wpp/guide-to-2026-year-end-shows-and-upcoming-awards-shows-schedules-lineups-nominees-and-more'),
  ('2026 Music Bank Global Festival · Day 1', 'فێستیڤاڵی جیهانیی Music Bank ٢٠٢٦ · ڕۆژی یەکەم', 'festival', '2026-12-12 17:00+09', '2026-12-12 21:30+09', 'Japan National Stadium', 'Soompi', 'https://www.soompi.com/article/1882479wpp/guide-to-2026-year-end-shows-and-upcoming-awards-shows-schedules-lineups-nominees-and-more'),
  ('2026 Music Bank Global Festival · Day 2', 'فێستیڤاڵی جیهانیی Music Bank ٢٠٢٦ · ڕۆژی دووەم', 'festival', '2026-12-13 17:00+09', '2026-12-13 21:30+09', 'Japan National Stadium', 'Soompi', 'https://www.soompi.com/article/1882479wpp/guide-to-2026-year-end-shows-and-upcoming-awards-shows-schedules-lineups-nominees-and-more'),
  ('2026 KBS Song Festival', 'فێستیڤاڵی گۆرانیی KBS ٢٠٢٦', 'festival', '2026-12-18 19:00+09', '2026-12-18 23:00+09', 'KBS Arena', 'Soompi', 'https://www.soompi.com/article/1882479wpp/guide-to-2026-year-end-shows-and-upcoming-awards-shows-schedules-lineups-nominees-and-more'),
  ('2026 APAN Star Awards', 'خەڵاتەکانی APAN Star ٢٠٢٦', 'awards', '2026-12-23 18:00+09', '2026-12-23 22:00+09', 'Sangmyung Art Center', 'Soompi', 'https://www.soompi.com/article/1882479wpp/guide-to-2026-year-end-shows-and-upcoming-awards-shows-schedules-lineups-nominees-and-more'),
  ('2026 SBS Gayo Daejeon · Day 1', 'SBS Gayo Daejeon ٢٠٢٦ · ڕۆژی یەکەم', 'festival', '2026-12-24 18:00+09', '2026-12-24 22:30+09', 'KINTEX', 'Soompi', 'https://www.soompi.com/article/1882479wpp/guide-to-2026-year-end-shows-and-upcoming-awards-shows-schedules-lineups-nominees-and-more'),
  ('2026 SBS Gayo Daejeon · Day 2', 'SBS Gayo Daejeon ٢٠٢٦ · ڕۆژی دووەم', 'festival', '2026-12-25 18:00+09', '2026-12-25 22:30+09', 'KINTEX', 'Soompi', 'https://www.soompi.com/article/1882479wpp/guide-to-2026-year-end-shows-and-upcoming-awards-shows-schedules-lineups-nominees-and-more'),
  ('2026 KBS Drama Awards', 'خەڵاتەکانی درامای KBS ٢٠٢٦', 'awards', '2026-12-31 20:00+09', '2027-01-01 00:30+09', 'KBS Hall', 'Soompi', 'https://www.soompi.com/article/1882479wpp/guide-to-2026-year-end-shows-and-upcoming-awards-shows-schedules-lineups-nominees-and-more'),
  ('41st Golden Disc Awards · Day 1', 'خەڵاتەکانی Golden Disc ـی ٤١ · ڕۆژی یەکەم', 'awards', '2027-01-09 18:00+09', '2027-01-09 22:30+09', 'Vietnam Exposition Center, Hanoi', 'Soompi', 'https://www.soompi.com/article/1882479wpp/guide-to-2026-year-end-shows-and-upcoming-awards-shows-schedules-lineups-nominees-and-more'),
  ('41st Golden Disc Awards · Day 2', 'خەڵاتەکانی Golden Disc ـی ٤١ · ڕۆژی دووەم', 'awards', '2027-01-10 18:00+09', '2027-01-10 22:30+09', 'Vietnam Exposition Center, Hanoi', 'Soompi', 'https://www.soompi.com/article/1882479wpp/guide-to-2026-year-end-shows-and-upcoming-awards-shows-schedules-lineups-nominees-and-more'),
  ('2027 D Awards · Day 1', 'خەڵاتەکانی D Awards ٢٠٢٧ · ڕۆژی یەکەم', 'awards', '2027-01-15 18:00+09', '2027-01-15 22:30+09', 'Paris Plenitude Arena', 'Soompi', 'https://www.soompi.com/article/1882479wpp/guide-to-2026-year-end-shows-and-upcoming-awards-shows-schedules-lineups-nominees-and-more'),
  ('2027 D Awards · Day 2', 'خەڵاتەکانی D Awards ٢٠٢٧ · ڕۆژی دووەم', 'awards', '2027-01-16 18:00+09', '2027-01-16 22:30+09', 'Paris Plenitude Arena', 'Soompi', 'https://www.soompi.com/article/1882479wpp/guide-to-2026-year-end-shows-and-upcoming-awards-shows-schedules-lineups-nominees-and-more')
) as v(name, name_ckb, kind, starts_at, ends_at, place, source_name, source_url)
where not exists (select 1 from events e where e.name = v.name);

-- One chain every 5 minutes; the site only does work every 15 minutes, or every run during an event.
do $$
declare bearer text := substring((select command from cron.job where jobname = 'kurean-write') from 'Bearer [^"'']+');
begin
  if bearer is null then
    bearer := substring((select command from cron.job where jobname = 'kurean-news') from 'Bearer [^"'']+');
  end if;
  perform cron.unschedule(jobname) from cron.job where jobname in ('kurean-news');
  perform cron.schedule('kurean-news', '*/5 * * * *', format(
    $f$ select net.http_get(url := 'https://kurean.news/api/cron/news', headers := jsonb_build_object('Authorization', %L), timeout_milliseconds := 300000); $f$,
    bearer));
  perform cron.unschedule(jobname) from cron.job where jobname in ('kurean-collect', 'kurean-write');
end $$;
select (select count(*) from events)::text || ' events · ' || (select string_agg(jobname || ' ' || schedule, ', ') from cron.job) as result;
