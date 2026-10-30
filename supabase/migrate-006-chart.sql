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
