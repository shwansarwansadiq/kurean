-- Run once in the Supabase SQL editor. The weekly chart story (top 10 article + cards). Safe to run again.
alter table stories add column if not exists kind text not null default 'news'; -- 'news' | 'chart'
alter table stories add column if not exists chart_week text;                   -- chart_weeks.id for kind 'chart'
alter table stories add column if not exists chart_top jsonb;                   -- the top 10 as written: [{rank,title,artist,artist_ckb,move,change}]
create unique index if not exists stories_chart_week_idx on stories (chart_week) where chart_week is not null;
