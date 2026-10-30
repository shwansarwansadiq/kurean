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
