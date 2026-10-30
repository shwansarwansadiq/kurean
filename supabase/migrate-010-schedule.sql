-- Run once in the Supabase SQL editor. Scheduled publishing. Safe to run again.
-- A scheduled story is status 'approved' with a time; the kurean-publish job publishes it when the time comes.
alter table stories add column if not exists scheduled_at timestamptz;
create index if not exists stories_scheduled_idx on stories (scheduled_at) where status = 'approved';
