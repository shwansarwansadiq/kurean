-- Run once in the Supabase SQL editor (phase 3/4). Safe to run again.
alter table stories add column if not exists image_url text;
alter table stories add column if not exists image_source text;
alter table stories add column if not exists image_credit text;
alter table stories add column if not exists platforms text[] not null default '{}';
alter table stories add column if not exists edited_at timestamptz;
alter table stories add column if not exists sticker_done boolean not null default false;
insert into storage.buckets (id, name, public) values ('story-images', 'story-images', true)
on conflict (id) do nothing;
-- The two thin stories written before the quality fixes
update stories set status = 'skipped' where id in (1, 2) and status = 'pending';
