-- Run once in the Supabase SQL editor. The daily Instagram round-up (Shwan, 6 Nov): at 21:00 Hawler, the day's
-- published news as one carousel (cover, a slide per story, end slide) and one video, each also as a story.
-- One row per Hawler day; the 5-minute publish job fills it, freezes it at 21:00 and posts. Safe to run again.
create table if not exists roundups (
  day date primary key,
  story_ids bigint[] not null default '{}',
  status text not null default 'collecting',   -- collecting | posting | video | done | empty
  carousel_result text,
  story_result text,
  reel_result text,
  video_url text,
  video_hash text,
  posted_at timestamptz,
  reel_posted_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table roundups enable row level security;
select 'roundups ready' as result;
