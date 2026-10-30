-- Run once in the Supabase SQL editor. Scenery stories: Korea's nature and landmarks between the news. Safe to run again.
create table if not exists scenery (
  id bigserial primary key,
  pexels_id bigint not null,
  kind text not null check (kind in ('photo', 'video')),
  url text not null,                 -- the Pexels file (photo original or the chosen video file)
  page_url text not null,            -- the Pexels page, for the credit
  width integer not null,
  height integer not null,
  duration numeric,                  -- seconds, videos only
  place_en text not null,
  place_ckb text not null,
  photographer text not null,
  photographer_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  music text,                        -- one of video/public/music/*.m4a
  video_url text,                    -- the finished 9:16 clip with overlay and music
  video_hash text,
  last_posted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (kind, pexels_id)
);
create index if not exists scenery_status_idx on scenery (status, created_at desc);
alter table scenery enable row level security;

-- Stories waiting to go out after a news story (news → scenery → news), and what happened.
create table if not exists social_queue (
  id bigserial primary key,
  scenery_id bigint not null references scenery(id) on delete cascade,
  after_story_id bigint references stories(id) on delete set null,
  platforms text[] not null,
  due_at timestamptz not null,
  done_at timestamptz,
  result text,
  created_at timestamptz not null default now()
);
create index if not exists social_queue_due_idx on social_queue (due_at) where done_at is null;
alter table social_queue enable row level security;
