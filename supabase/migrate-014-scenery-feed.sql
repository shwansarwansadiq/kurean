-- Run once in the Supabase SQL editor. One Korea scenery clip a day on the Instagram and Facebook feed (Shwan, 2 Nov).
-- One row per Hawler day: inserting the day first is how the publish job claims it, so a day never posts twice.
create table if not exists scenery_feed (
  day date primary key,
  scenery_id bigint references scenery(id) on delete set null,
  result text,
  created_at timestamptz not null default now()
);
alter table scenery_feed enable row level security;
alter table scenery add column if not exists feed_posted_at timestamptz;
select 'scenery feed ready' as result;
