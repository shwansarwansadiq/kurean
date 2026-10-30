-- Run once in the Supabase SQL editor. Free-photo search and copyright flags. Safe to run again.
alter table stories add column if not exists image_license text;      -- 'free:<licence>' | 'source' | 'source-agency'
alter table stories add column if not exists photo_checked_at timestamptz; -- null = look for a photo (free first) on the next run
