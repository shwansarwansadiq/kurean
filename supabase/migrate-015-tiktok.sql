-- Run once in the Supabase SQL editor. TikTok drafts (Shwan, 4 Nov): published stories' videos go to the TikTok inbox.
-- The tokens are only read by the site with the service key (row level security on, no policies). Safe to run again.
create table if not exists tiktok_auth (
  id integer primary key check (id = 1),
  open_id text,
  scope text,
  access_token text,
  access_expires_at timestamptz,
  refresh_token text,
  refresh_expires_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table tiktok_auth enable row level security;
alter table stories add column if not exists tiktok_sent_at timestamptz;
alter table stories add column if not exists tiktok_publish_id text;
alter table stories add column if not exists tiktok_result text;
alter table stories add column if not exists tiktok_next_try timestamptz;
select 'tiktok ready' as result;
